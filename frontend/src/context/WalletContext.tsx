import { createContext, useContext, type ReactNode } from "react";
import { useWallet, type WalletStatus } from "../features/wallet-connect/useWallet";
import type { AppEnv } from "../services/env";

export interface WalletContextValue {
  status: WalletStatus;
  address: string | null;
  error: string | null;
  freighterAvailable: boolean | null;
  connect: () => void;
}

const WalletContext = createContext<WalletContextValue | null>(null);

// One `useWallet()` instance for the whole app, shared across routes via
// context -- so the navbar's wallet badge and the Dashboard page see the
// same connection state instead of each running an independent hook
// instance (which would double the Freighter detection handshake and could
// disagree with each other).
export function WalletProvider({ env, children }: { env: AppEnv; children: ReactNode }) {
  const wallet = useWallet(env);
  return <WalletContext.Provider value={wallet}>{children}</WalletContext.Provider>;
}

export function useWalletContext(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWalletContext must be used within WalletProvider");
  return ctx;
}
