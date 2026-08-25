import { useState } from "react";
import { Alert, Button, Card, Spinner } from "../../components/ui";
import { useProveThreshold } from "./useProveThreshold";
import { ShareResult } from "../share-result/ShareResult";
import type { AppEnv } from "../../services/env";

const STAGE_LABEL: Record<string, string> = {
  reading_balance: "Reading your on-chain balance...",
  generating_proof: "Generating proof locally -- this takes a few seconds and never leaves your browser...",
  verifying: "Verifying on-chain...",
};

export function ProveThreshold({ env, address }: { env: AppEnv; address: string }) {
  const { stage, error, txHash, threshold, prove } = useProveThreshold(env, address);
  const [input, setInput] = useState("");

  const busy = stage === "reading_balance" || stage === "generating_proof" || stage === "verifying";

  return (
    <Card title="Prove your income">
      <p>Enter a threshold. ProofPay proves your balance is at or above it -- without revealing the actual amount.</p>
      <div className="field-row">
        <input
          type="number"
          min="1"
          placeholder="Threshold amount"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={busy}
          aria-label="Threshold amount"
        />
        <Button onClick={() => prove(input)} disabled={busy || !input}>
          Generate Proof
        </Button>
      </div>

      {busy && <Spinner label={STAGE_LABEL[stage]} />}

      {stage === "passed" && (
        <>
          <Alert kind="success">
            Verified: your balance is at least {threshold}, proven without revealing the exact amount.
          </Alert>
          {txHash && <ShareResult txHash={txHash} threshold={threshold ?? ""} passed />}
        </>
      )}

      {stage === "failed_below_threshold" && (
        <Alert kind="info">
          Your balance does not currently clear {threshold}. This is a correct result, not an
          error -- no proof can be produced for a false statement.
        </Alert>
      )}

      {stage === "error" && error && <Alert kind="error">{error}</Alert>}
    </Card>
  );
}
