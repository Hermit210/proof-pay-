import { useCallback, useState } from "react";
import { Buffer } from "buffer";
import { makeTokenClient } from "../../services/contracts/clients";
import { addressToFieldHex } from "../../services/crypto/addressToField";
import { executeCircuit, generateProof, CIRCUITS } from "../../services/proof/noirProver";
import { buildRegisterData } from "../../services/proof/registerPayload";
import { saveWalletState, loadWalletState, type LocalWalletState } from "../../services/localWalletState";
import { track, reportError } from "../../services/analytics";
import type { AppEnv } from "../../services/env";

export type RegisterStage =
  | "idle"
  | "checking"
  | "deriving_keys"
  | "generating_proof"
  | "submitting"
  | "done"
  | "error";

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
      void tx.result; // throws on simulation failure before reaching here
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
      await tx.signAndSend();

      const state: LocalWalletState = {
        address,
        spendingKey: sk,
        spendableValue: loadWalletState(address)?.spendableValue ?? "0",
        spendableBlinding: "0",
        registered: true,
      };
      saveWalletState(state);

      setIsRegistered(true);
      setStage("done");
      track("register_succeeded");
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
