import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { WalletConnect } from "../features/wallet-connect/WalletConnect";
import { useWalletContext } from "../context/WalletContext";
import { Register } from "../features/register/Register";
import { Deposit } from "../features/deposit/Deposit";
import { ProveThreshold } from "../features/prove-threshold/ProveThreshold";
import type { AppEnv } from "../services/env";
import { cardMotion } from "../lib/motionPresets";

export default function Dashboard({ env }: { env: AppEnv }) {
  const { status, address, error, freighterAvailable, connect, disconnect } = useWalletContext();
  const [registered, setRegistered] = useState(false);

  const stepsDone = [Boolean(address), registered, registered].filter(Boolean).length;

  return (
    <div>
      <header className="page-hero dashboard-header section-invert">
        <h1>ProofPay</h1>
        <p className="tagline">Prove your income clears a threshold -- without revealing the amount.</p>
        {!address && (
          <WalletConnect
            status={status}
            address={address}
            error={error}
            freighterAvailable={freighterAvailable}
            onConnect={connect}
            onDisconnect={disconnect}
          />
        )}
      </header>

      <div className="dashboard">
        {address && (
          <div className="dashboard-progress" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <span key={i} className={`dashboard-progress-dot ${i < stepsDone ? "done" : ""}`} />
            ))}
          </div>
        )}

        <AnimatePresence mode="popLayout">
          {address && (
            <motion.main className="dashboard-main" key="main" {...cardMotion}>
              <motion.div {...cardMotion}>
                <Register env={env} address={address} onRegistered={() => setRegistered(true)} />
              </motion.div>
              <AnimatePresence>
                {registered && (
                  <>
                    <motion.div key="deposit" {...cardMotion}>
                      <Deposit env={env} address={address} />
                    </motion.div>
                    <motion.div key="prove" {...cardMotion} transition={{ ...cardMotion.transition, delay: 0.1 }}>
                      <ProveThreshold env={env} address={address} />
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </motion.main>
          )}
        </AnimatePresence>

        {!address && <p className="empty-state">Connect your wallet to get started.</p>}
      </div>
    </div>
  );
}
