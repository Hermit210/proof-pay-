import { useCallback, useState } from "react";
import { makeTokenClient } from "../../services/contracts/clients";
import { recordDeposit } from "../../services/localWalletState";
import { appendHistory } from "../../services/history";
import { track, reportError } from "../../services/analytics";
import type { AppEnv } from "../../services/env";

export type DepositStage = "idle" | "depositing" | "merging" | "done" | "error";

export function useDeposit(env: AppEnv, address: string | null) {
  const [stage, setStage] = useState<DepositStage>("idle");
  const [error, setError] = useState<string | null>(null);

  const deposit = useCallback(
    async (amount: string) => {
      if (!address) return;
      setError(null);
      const amountNum = BigInt(amount);
      if (amountNum <= 0n) {
        setError("Enter an amount greater than zero.");
        return;
      }
      try {
        setStage("depositing");
        const client = makeTokenClient(env, address);
        const depositTx = await client.deposit({ from: address, to: address, amount: amountNum });
        const sentDeposit = await depositTx.signAndSend();
        track("deposit_made", { amount: amount.toString() });

        setStage("merging");
        const mergeTx = await client.merge({ account: address });
        await mergeTx.signAndSend();

        recordDeposit(address, amountNum);
        appendHistory(address, {
          kind: "deposit",
          txHash: sentDeposit.sendTransactionResponse?.hash ?? null,
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
