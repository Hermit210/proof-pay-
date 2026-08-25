import { useState } from "react";
import { Alert, Button, Card, Spinner } from "../../components/ui";
import { useDeposit } from "./useDeposit";
import type { AppEnv } from "../../services/env";

const STAGE_LABEL: Record<string, string> = {
  depositing: "Depositing...",
  merging: "Merging into your spendable balance...",
};

export function Deposit({ env, address }: { env: AppEnv; address: string }) {
  const { stage, error, deposit } = useDeposit(env, address);
  const [amount, setAmount] = useState("");

  const busy = stage === "depositing" || stage === "merging";

  return (
    <Card title="Receive income">
      <p>
        Deposit is how income enters your confidential balance in this version -- the deposit
        amount itself is visible on-chain (like any normal payment); what stays private is your
        running balance and whether it clears a threshold you choose later.
      </p>
      <div className="field-row">
        <input
          type="number"
          min="1"
          placeholder="Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          disabled={busy}
          aria-label="Deposit amount"
        />
        <Button onClick={() => deposit(amount)} disabled={busy || !amount}>
          Deposit
        </Button>
      </div>
      {busy && <Spinner label={STAGE_LABEL[stage]} />}
      {stage === "done" && <Alert kind="success">Deposited and merged into your spendable balance.</Alert>}
      {error && <Alert kind="error">{error}</Alert>}
    </Card>
  );
}
