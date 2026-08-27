import { useCallback, useState } from "react";
import { makeTokenClient } from "../../services/contracts/clients";
import { confirmTransactionOnChain } from "../../services/contracts/confirmTransaction";
import { recordDeposit } from "../../services/localWalletState";
import { appendHistory } from "../../services/history";
import { parsePositiveBigInt } from "../../services/parseAmount";
import { track, reportError } from "../../services/analytics";
import type { AppEnv } from "../../services/env";

export type DepositStage = "idle" | "depositing" | "merging" | "confirming" | "done" | "error";

export function useDeposit(env: AppEnv, address: string | null) {
  const [stage, setStage] = useState<DepositStage>("idle");
  const [error, setError] = useState<string | null>(null);

  const deposit = useCallback(
    async (amount: string) => {
      if (!address) return;
      setError(null);
      const amountNum = parsePositiveBigInt(amount);
      if (amountNum === null) {
        setError("Enter a whole number greater than zero.");
        return;
      }
      try {
        setStage("depositing");
        const client = makeTokenClient(env, address);
        const depositTx = await client.deposit({ from: address, to: address, amount: amountNum });
        const sentDeposit = await depositTx.signAndSend();
        const depositHash = sentDeposit.sendTransactionResponse?.hash;
        track("deposit_made", { amount: amount.toString() });

        setStage("merging");
        const mergeTx = await client.merge({ account: address });
        const sentMerge = await mergeTx.signAndSend();
        const mergeHash = sentMerge.sendTransactionResponse?.hash;

        // Never trust signAndSend() resolving alone as proof of on-chain
        // state (see docs/research/step3c-register-false-success.md) --
        // independently re-fetch both submitted transactions by hash and
        // require a genuine SUCCESS status before reporting success.
        setStage("confirming");
        if (depositHash) await confirmTransactionOnChain(env, depositHash);
        if (mergeHash) await confirmTransactionOnChain(env, mergeHash);

        recordDeposit(address, amountNum);
        appendHistory(address, {
          kind: "deposit",
          txHash: depositHash ?? null,
          amount: amountNum.toString(),
        });
        setStage("done");
      } catch (err) {
        const message = err instanceof Error ? err.message : "Deposit failed.";
        setError(message);
        setStage("error");
        track("deposit_failed", { message });
        reportError(err, { stage: "deposit" });
      }
    },
    [env, address],
  );

  return { stage, error, deposit };
}
