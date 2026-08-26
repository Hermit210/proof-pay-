import { useEffect, useRef, useState } from "react";
import type { WalletStatus } from "./useWallet";
import { Alert, Button, Spinner } from "../../components/ui";

export function WalletConnect({
  status,
  address,
  error,
  freighterAvailable,
  onConnect,
  onDisconnect,
}: {
  status: WalletStatus;
  address: string | null;
  error: string | null;
  freighterAvailable: boolean | null;
  onConnect: () => void;
  onDisconnect?: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onClickAway = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onClickAway);
    return () => document.removeEventListener("mousedown", onClickAway);
  }, [menuOpen]);

  if (address) {
    return (
      <div className="wallet-menu" ref={menuRef}>
        <button
          className="wallet-badge"
          onClick={() => setMenuOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
        >
          <code>
            {address.slice(0, 6)}...{address.slice(-4)}
          </code>{" "}
          ▾
        </button>
        {menuOpen && onDisconnect && (
          <div className="wallet-menu-dropdown" role="menu">
            <p className="wallet-menu-hint">
              To use a different wallet: disconnect, switch the active account inside Freighter,
              then connect again.
            </p>
            <button
              className="danger"
              role="menuitem"
              onClick={() => {
                setMenuOpen(false);
                onDisconnect();
              }}
            >
              Disconnect
            </button>
          </div>
        )}
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
