import { useCallback, useState } from "react";
import { Buffer } from "buffer";
import { makeTokenClient } from "../../services/contracts/clients";
import { addressToFieldHex } from "../../services/crypto/addressToField";
import { executeCircuit, generateProof, CIRCUITS } from "../../services/proof/noirProver";
import { buildRegisterData } from "../../services/proof/registerPayload";
import { saveWalletState, loadWalletState, type LocalWalletState } from "../../services/localWalletState";
import { appendHistory } from "../../services/history";
import { track, reportError } from "../../services/analytics";
import type { AppEnv } from "../../services/env";

export type RegisterStage =
  | "idle"
  | "checking"
  | "deriving_keys"
  | "generating_proof"
  | "submitting"
  | "confirming"
  | "done"
  | "error";

/**
 * Never trust `signAndSend()`'s resolution alone as proof of on-chain state
 * (see docs/research/step3c-register-false-success.md for why this was
 * added and what it does/doesn't rule out): re-read `confidential_balance`
 * directly, independent of whatever the submission path reported, and only
 * report success once the account genuinely, verifiably shows up
 * registered. Retries briefly to tolerate ordinary RPC read-after-write lag
 * (the tx can be confirmed but not yet visible to a `simulateTransaction`
 * read against the latest snapshot) -- NOT to paper over a real failure.
 */
async function confirmRegisteredOnChain(
  env: AppEnv,
  address: string,
  attempts = 5,
  delayMs = 1500,
): Promise<boolean> {
  for (let i = 0; i < attempts; i++) {
    try {
      const client = makeTokenClient(env, address);
      const tx = await client.confidential_balance({ account: address });
      if (!tx.simulationData.result) throw new Error("No simulation result");
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (!message.includes("#3501")) throw err; // a different failure -- don't mask it as "still confirming"
      if (i < attempts - 1) await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  return false;
}

function randomFieldHex(): string {
  // sk: a random 31-byte scalar (well under the BN254 scalar field modulus,
  // so it's always a valid, non-reducible Field element) -- generated
  // client-side via the Web Crypto CSPRNG, never transmitted anywhere.
  const bytes = crypto.getRandomValues(new Uint8Array(31));
  return "0x" + Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function useRegister(env: AppEnv, address: string | null) {
  const [stage, setStage] = useState<RegisterStage>("idle");
  const [error, setError] = useState<string | null>(null);
  const [isRegistered, setIsRegistered] = useState<boolean | null>(null);

  const checkRegistration = useCallback(async () => {
    if (!address) return;
    setStage("checking");
    setError(null);
    try {
      const client = makeTokenClient(env, address);
      const tx = await client.confidential_balance({ account: address });
      // Deliberately NOT `tx.result`: the SDK's generic struct decoder
      // throws `no such entry: Point` for this contract's `ConfidentialAccount`
      // (a real spec-generation gap, not a data problem -- see
      // decodeAccount.ts). Only need "did this simulate without a contract
      // error" here, not the decoded value, so read the presence of a
      // successful simulation result directly instead.
      if (!tx.simulationData.result) throw new Error("No simulation result");
      setIsRegistered(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes("AccountNotRegistered") || message.includes("#3501")) {
        setIsRegistered(false);
      } else {
        setError(message);
        reportError(err, { stage: "check_registration" });
      }
    } finally {
      setStage("idle");
    }
  }, [env, address]);

  const register = useCallback(async () => {
    if (!address) return;
    setError(null);
    track("register_started");
    try {
      setStage("deriving_keys");
      const sk = randomFieldHex();
      const addrF = "0x" + (await addressToFieldHex(env.tokenContractId));
      const acctF = "0x" + (await addressToFieldHex(address));

      const [yX, yY, pvkX, pvkY] = await executeCircuit(CIRCUITS.registerKeygen, {
        sk,
        addr_f: addrF,
      });

      setStage("generating_proof");
      const { proof } = await generateProof(CIRCUITS.register, {
        sk,
        y_x: yX,
        y_y: yY,
        pvk_x: pvkX,
        pvk_y: pvkY,
        addr_f: addrF,
        _acct_f: acctF,
      });

      const data = Buffer.from(buildRegisterData({ yX, yY, pvkX, pvkY, proof }));

      setStage("submitting");
      const client = makeTokenClient(env, address);
      const tx = await client.register({ account: address, auditor_id: 0, data });
      const sent = await tx.signAndSend();
      const submittedHash = sent.sendTransactionResponse?.hash;

      // signAndSend() resolving is not, on its own, trusted as proof of
      // on-chain registration -- verified independently below. See
      // docs/research/step3c-register-false-success.md.
      setStage("confirming");
      const confirmed = await confirmRegisteredOnChain(env, address);
      if (!confirmed) {
        throw new Error(
          `Registration was submitted${submittedHash ? ` (tx ${submittedHash})` : ""} but could not be ` +
            "confirmed on-chain after multiple checks. It may still be pending -- check the transaction " +
            "hash on Stellar Expert, or try registering again in a moment.",
        );
      }

      const state: LocalWalletState = {
        address,
        spendingKey: sk,
        spendableValue: loadWalletState(address)?.spendableValue ?? "0",
        spendableBlinding: "0",
        registered: true,
      };
      saveWalletState(state);
      appendHistory(address, { kind: "register", txHash: submittedHash ?? null });

      setIsRegistered(true);
      setStage("done");
      track("register_succeeded", { txHash: submittedHash });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Registration failed.";
      setError(message);
      setStage("error");
      track("register_failed", { message });
      reportError(err, { stage: "register" });
    }
  }, [env, address]);

  return { stage, error, isRegistered, checkRegistration, register };
}
