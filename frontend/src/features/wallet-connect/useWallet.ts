import { useCallback, useEffect, useState } from "react";
import {
  assertNetwork,
  connectWallet,
  getConnectedAddress,
  isFreighterInstalled,
} from "../../services/wallet";
import { track, reportError } from "../../services/analytics";
import type { AppEnv } from "../../services/env";

export type WalletStatus = "idle" | "connecting" | "connected" | "error";

export function useWallet(env: AppEnv) {
  const [status, setStatus] = useState<WalletStatus>("idle");
  const [address, setAddress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getConnectedAddress().then((addr) => {
      if (addr) setAddress(addr);
    });
  }, []);

  const connect = useCallback(async () => {
    setStatus("connecting");
    setError(null);
    try {
      if (!isFreighterInstalled()) {
        throw new Error(
          "Freighter wallet extension not found. Install it from freighter.app, then reload.",
        );
      }
      const addr = await connectWallet();
      await assertNetwork(env.networkPassphrase);
      setAddress(addr);
      setStatus("connected");
      track("wallet_connected");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to connect wallet.";
      setError(message);
      setStatus("error");
      track("wallet_connect_failed", { message });
      reportError(err, { stage: "wallet_connect" });
    }
  }, [env.networkPassphrase]);

  return { status, address, error, connect };
}
