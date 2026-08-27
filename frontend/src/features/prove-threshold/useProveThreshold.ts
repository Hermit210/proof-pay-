import { useCallback, useState } from "react";
import { Buffer } from "buffer";
import { makeTokenClient, makeThresholdVerifierClient } from "../../services/contracts/clients";
import { decodeConfidentialAccount } from "../../services/contracts/decodeAccount";
import { addressToFieldHex } from "../../services/crypto/addressToField";
import { generateProof, CIRCUITS } from "../../services/proof/noirProver";
import { loadWalletState } from "../../services/localWalletState";
import { appendHistory } from "../../services/history";
import { track, reportError } from "../../services/analytics";
import type { AppEnv } from "../../services/env";

export type ProveStage =
  | "idle"
  | "reading_balance"
  | "generating_proof"
  | "verifying"
  | "passed"
  | "failed_below_threshold"
  | "error";

export interface ProveResult {
  stage: ProveStage;
  error: string | null;
  txHash: string | null;
  threshold: string | null;
}

function fieldHexToBigEndianHex(hex: string): string {
  return hex.replace(/^0x/, "").padStart(64, "0");
}

export function useProveThreshold(env: AppEnv, address: string | null) {
  const [state, setState] = useState<ProveResult>({
    stage: "idle",
    error: null,
    txHash: null,
    threshold: null,
  });

  const prove = useCallback(
    async (thresholdInput: string) => {
      if (!address) return;
      const threshold = BigInt(thresholdInput);
      const walletState = loadWalletState(address);
      if (!walletState || !walletState.registered) {
        setState((s) => ({ ...s, stage: "error", error: "Register and deposit first." }));
        return;
      }

      setState({ stage: "reading_balance", error: null, txHash: null, threshold: thresholdInput });
      try {
        const tokenClient = makeTokenClient(env, address);
        const balanceTx = await tokenClient.confidential_balance({ account: address });
        // Deliberately NOT `balanceTx.result`: the SDK's generic struct
        // decoder throws `no such entry: Point` for this contract's
        // `ConfidentialAccount` (a real spec-generation gap -- see
        // decodeAccount.ts). Read the raw ScVal map directly instead.
        if (!balanceTx.simulationData.result) throw new Error("No simulation result");
        const account = decodeConfidentialAccount(balanceTx.simulationData.result.retval);
        const spend = account.spendableCommitment;
        const pvk = account.viewingPublicKey;

        const cSpendX = "0x" + spend.subarray(0, 32).toString("hex");
        const cSpendY = "0x" + spend.subarray(32, 64).toString("hex");
        const pvkX = "0x" + pvk.subarray(0, 32).toString("hex");
        const pvkY = "0x" + pvk.subarray(32, 64).toString("hex");
        const addrF = "0x" + (await addressToFieldHex(env.tokenContractId));

        setState((s) => ({ ...s, stage: "generating_proof" }));
        const { proof, publicInputs } = await generateProof(CIRCUITS.balanceThreshold, {
          sk: walletState.spendingKey,
          v_s: "0x" + BigInt(walletState.spendableValue).toString(16),
          r_s: "0x" + BigInt(walletState.spendableBlinding).toString(16),
          pvk_x: pvkX,
          pvk_y: pvkY,
          c_spend_x: cSpendX,
          c_spend_y: cSpendY,
          addr_f: addrF,
          threshold: "0x" + threshold.toString(16),
        });
        track("proof_generated", { threshold: thresholdInput });

        setState((s) => ({ ...s, stage: "verifying" }));
        const verifierClient = makeThresholdVerifierClient(env, address);
        const verifyTx = await verifierClient.verify_proof({
          public_inputs: Buffer.from(publicInputs),
          proof: Buffer.from(proof),
        });
        // `proofpay-threshold-verifier.verify_proof` has no `require_auth()`
        // in the contract (see contract/threshold_verifier/src/lib.rs --
        // anyone can call it, that's deliberate), so the SDK's simulation
        // finds zero required auth entries and classifies this as a
        // read-only call by default (`AssembledTransaction.isReadCall`,
        // node_modules/@stellar/stellar-sdk/lib/esm/contract/assembled_transaction.js).
        // We want a real submitted transaction anyway, since the tx hash is
        // what ShareResult gives a third party to independently verify --
        // `force: true` is the SDK's own documented mechanism for that,
        // confirmed by reading its source rather than guessed.
        const sent = await verifyTx.signAndSend({ force: true });
        const passed = verifyTx.result.isOk() && verifyTx.result.unwrap();
        const provedTxHash = sent.sendTransactionResponse?.hash ?? null;

        setState({
          stage: passed ? "passed" : "failed_below_threshold",
          error: null,
          txHash: provedTxHash,
          threshold: thresholdInput,
        });
        appendHistory(address, {
          kind: passed ? "prove_passed" : "prove_failed",
          txHash: provedTxHash,
          threshold: thresholdInput,
        });
        track(passed ? "proof_verified" : "proof_verification_failed", { threshold: thresholdInput });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Proof generation or verification failed.";
        // A Noir constraint failure during witness execution (not a proof
        // rejected by the verifier) means the statement itself is false --
        // your balance genuinely doesn't clear the threshold. That's a
        // correct, expected outcome, not a bug: you cannot even generate a
        // proof for a false statement, let alone have it verify.
        const isConstraintFailure = /cannot satisfy constraint|assert/i.test(message);
        if (isConstraintFailure) {
          setState((s) => ({ ...s, stage: "failed_below_threshold", error: null }));
          track("proof_verification_failed", { threshold: thresholdInput, reason: "constraint" });
        } else {
          setState((s) => ({ ...s, stage: "error", error: message }));
          track("proof_generation_failed", { message });
          reportError(err, { stage: "prove_threshold" });
        }
      }
    },
    [env, address],
  );

  return { ...state, prove };
}

export { fieldHexToBigEndianHex };
