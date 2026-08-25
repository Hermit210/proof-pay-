import { useState } from "react";
import { Button } from "../../components/ui";
import { track } from "../../services/analytics";

// Deliberately simple: a shareable summary text referencing the real,
// independently-verifiable on-chain transaction, rather than a bespoke
// hosted "verification page" -- a landlord or lender can check the tx
// directly on Stellar Expert without trusting anything ProofPay's own
// server says about it (there is no server in this flow).
export function ShareResult({
  txHash,
  threshold,
  passed,
}: {
  txHash: string;
  threshold: string;
  passed: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const explorerUrl = `https://stellar.expert/explorer/testnet/tx/${txHash}`;
  const summary = `ProofPay verification: balance proven >= ${threshold} without revealing the amount.\nVerify independently: ${explorerUrl}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      track("verification_shared", { threshold });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can be unavailable (permissions, non-secure context);
      // the link below still works as a manual fallback.
    }
  };

  if (!passed) return null;

  return (
    <div className="share-result">
      <p>Share this verification:</p>
      <textarea readOnly value={summary} rows={3} aria-label="Shareable verification summary" />
      <div className="field-row">
        <Button onClick={copy}>{copied ? "Copied!" : "Copy"}</Button>
        <a href={explorerUrl} target="_blank" rel="noreferrer">
          View on Stellar Expert
        </a>
      </div>
    </div>
  );
}
