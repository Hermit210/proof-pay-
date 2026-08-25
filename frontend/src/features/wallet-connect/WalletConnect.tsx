import type { WalletStatus } from "./useWallet";
import { Alert, Button, Spinner } from "../../components/ui";

export function WalletConnect({
  status,
  address,
  error,
  freighterAvailable,
  onConnect,
}: {
  status: WalletStatus;
  address: string | null;
  error: string | null;
  freighterAvailable: boolean | null;
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
      {freighterAvailable === false && (
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
        // Not disabled on `freighterAvailable` -- that's a best-effort
        // informational hint (detection can take up to ~2s via the
        // extension's own handshake), never a hard gate. Clicking Connect
        // always runs the real, robust check itself; disabling the button on
        // a possibly-still-settling flag would just reintroduce the same
        // race as a false negative, blocking a genuinely working wallet.
        <Button onClick={onConnect}>Connect Wallet</Button>
      )}
      {error && <Alert kind="error">{error}</Alert>}
    </div>
  );
}
