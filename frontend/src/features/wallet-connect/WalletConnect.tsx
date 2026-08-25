import type { WalletStatus } from "./useWallet";
import { Alert, Button, Spinner } from "../../components/ui";
import { isFreighterInstalled } from "../../services/wallet";

export function WalletConnect({
  status,
  address,
  error,
  onConnect,
}: {
  status: WalletStatus;
  address: string | null;
  error: string | null;
  onConnect: () => void;
}) {
  if (address) {
    return (
      <div className="wallet-badge">
        Connected: <code>{address.slice(0, 6)}...{address.slice(-4)}</code>
      </div>
    );
  }

  return (
    <div className="wallet-connect">
      {!isFreighterInstalled() && (
        <Alert kind="info">
          Freighter wallet not detected.{" "}
          <a href="https://freighter.app" target="_blank" rel="noreferrer">
            Install it
          </a>{" "}
          to use ProofPay.
        </Alert>
      )}
      {status === "connecting" ? (
        <Spinner label="Connecting..." />
      ) : (
        <Button onClick={onConnect} disabled={!isFreighterInstalled()}>
          Connect Wallet
        </Button>
      )}
      {error && <Alert kind="error">{error}</Alert>}
    </div>
  );
}
