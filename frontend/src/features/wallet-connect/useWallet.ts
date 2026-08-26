import { useCallback, useEffect, useState } from "react";
import {
  assertNetwork,
  checkFreighterAvailable,
  connectWallet,
  FreighterNotInstalledError,
  getConnectedAddress,
} from "../../services/wallet";
import { track, reportError } from "../../services/analytics";
import type { AppEnv } from "../../services/env";

export type WalletStatus = "idle" | "connecting" | "connected" | "error";

// Freighter has no programmatic "disconnect" API (permissions live in the
// extension, not something a dApp can revoke) -- "disconnect" here means
// forgetting the app's own local connection state. This flag stops the
// on-mount auto-reconnect from silently undoing an explicit disconnect on
// the next page load.
const AUTO_CONNECT_KEY = "proofpay:wallet-auto-connect";

export function useWallet(env: AppEnv) {
  const [status, setStatus] = useState<WalletStatus>("idle");
  const [address, setAddress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // null = still detecting (checkFreighterAvailable's postMessage handshake
  // can take up to ~2s if window.freighter hasn't been injected yet) --
  // never render "not installed" off this until it settles to a real boolean.
  const [freighterAvailable, setFreighterAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    checkFreighterAvailable().then(setFreighterAvailable);
    if (localStorage.getItem(AUTO_CONNECT_KEY) === "false") return;
    getConnectedAddress().then((addr) => {
      if (addr) setAddress(addr);
    });
  }, []);

  const connect = useCallback(async () => {
    setStatus("connecting");
    setError(null);
    try {
      const addr = await connectWallet();
      await assertNetwork(env.networkPassphrase);
      setAddress(addr);
      setFreighterAvailable(true);
      setStatus("connected");
      localStorage.setItem(AUTO_CONNECT_KEY, "true");
      track("wallet_connected");
    } catch (err) {
      if (err instanceof FreighterNotInstalledError) setFreighterAvailable(false);
      const message = err instanceof Error ? err.message : "Failed to connect wallet.";
      setError(message);
      setStatus("error");
      track("wallet_connect_failed", { message });
      reportError(err, { stage: "wallet_connect" });
    }
  }, [env.networkPassphrase]);

  // "Switch wallet": Freighter's active account is chosen inside the
  // extension itself, not via any dApp-triggerable API -- so the real flow
  // is disconnect here, switch the active account in Freighter, then
  // connect again. The UI surfaces this explicitly rather than pretending
  // there's a one-click switch.
  const disconnect = useCallback(() => {
    setAddress(null);
    setStatus("idle");
    setError(null);
    localStorage.setItem(AUTO_CONNECT_KEY, "false");
    track("wallet_disconnected");
  }, []);

  return { status, address, error, freighterAvailable, connect, disconnect };
}
