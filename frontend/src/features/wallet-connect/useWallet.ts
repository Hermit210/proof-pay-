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

  return { status, address, error, freighterAvailable, connect };
}
