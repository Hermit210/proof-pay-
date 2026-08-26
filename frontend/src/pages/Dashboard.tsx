import { useState } from "react";
import { WalletConnect } from "../features/wallet-connect/WalletConnect";
import { useWalletContext } from "../context/WalletContext";
import { Register } from "../features/register/Register";
import { Deposit } from "../features/deposit/Deposit";
import { ProveThreshold } from "../features/prove-threshold/ProveThreshold";
import type { AppEnv } from "../services/env";

export default function Dashboard({ env }: { env: AppEnv }) {
  const { status, address, error, freighterAvailable, connect } = useWalletContext();
  const [registered, setRegistered] = useState(false);

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>ProofPay</h1>
        <p className="tagline">Prove your income clears a threshold -- without revealing the amount.</p>
        {!address && (
          <WalletConnect
            status={status}
            address={address}
            error={error}
            freighterAvailable={freighterAvailable}
            onConnect={connect}
          />
        )}
      </header>

      {address && (
        <main className="dashboard-main">
          <Register env={env} address={address} onRegistered={() => setRegistered(true)} />
          {registered && (
            <>
              <Deposit env={env} address={address} />
              <ProveThreshold env={env} address={address} />
            </>
          )}
        </main>
      )}

      {!address && <p className="empty-state">Connect your wallet to get started.</p>}
    </div>
  );
}
