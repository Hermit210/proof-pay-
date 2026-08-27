import { useCallback, useEffect, useState, type ReactNode } from "react";
import { motion } from "motion/react";
import { Link } from "react-router-dom";
import { useWalletContext } from "../context/WalletContext";
import { loadHistory, type HistoryEntry, type HistoryKind } from "../services/history";
import { NoDataIllustration } from "../assets/illustrations";
import { fadeUp, staggerContainer, fadeUpTransition } from "../lib/motionPresets";

const EXPLORER_TX_URL = (hash: string) => `https://stellar.expert/explorer/testnet/tx/${hash}`;

const FILTERS: { id: "all" | HistoryKind; label: string }[] = [
  { id: "all", label: "All" },
  { id: "register", label: "Register" },
  { id: "deposit", label: "Deposits" },
  { id: "prove_passed", label: "Proofs verified" },
  { id: "prove_failed", label: "Proofs below threshold" },
];

function IconRegister() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 2 4 5v6c0 5 3.4 8.7 8 10 4.6-1.3 8-5 8-10V5l-8-3Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
function IconDeposit() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v10M9 9.5c0-1.4 1.3-2.5 3-2.5s3 1.1 3 2.5-1.3 2-3 2.5-3 1.1-3 2.5 1.3 2.5 3 2.5 3-1.1 3-2.5" />
    </svg>
  );
}
function IconProvePassed() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12.5 2.5 2.5L16 9" />
    </svg>
  );
}
function IconProveFailed() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="9" />
      <path d="M9 9l6 6M15 9l-6 6" />
    </svg>
  );
}

const ICONS: Record<HistoryKind, ReactNode> = {
  register: <IconRegister />,
  deposit: <IconDeposit />,
  prove_passed: <IconProvePassed />,
  prove_failed: <IconProveFailed />,
};

function titleFor(entry: HistoryEntry): string {
  switch (entry.kind) {
    case "register":
      return "Registered for confidential balances";
    case "deposit":
      return `Deposited ${entry.amount ?? ""}`.trim();
    case "prove_passed":
      return `Proof verified -- balance ≥ ${entry.threshold ?? "?"}`;
    case "prove_failed":
      return `Proof rejected -- balance below ${entry.threshold ?? "?"}`;
  }
}

export default function History() {
  const { address } = useWalletContext();
  const [filter, setFilter] = useState<"all" | HistoryKind>("all");

  const [entries, setEntries] = useState<HistoryEntry[]>([]);

  const refresh = useCallback(() => {
    setEntries(address ? loadHistory(address) : []);
  }, [address]);

  // A fresh route mount already re-reads localStorage (loadHistory isn't
  // cached across navigations), which covers the common case: do an action
  // on Dashboard, then navigate to History. This closes the one real gap --
  // History already open in a background tab/window while an action happens
  // elsewhere -- by re-reading when the tab regains focus or visibility,
  // rather than requiring a manual page refresh.
  useEffect(() => {
    refresh();
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [refresh]);

  const filtered = filter === "all" ? entries : entries.filter((e) => e.kind === filter);

  return (
    <div>
      <section className="page-hero section-invert">
        <h1>History</h1>
        <p className="section-lead">Every real action this browser has taken, most recent first.</p>
      </section>

      <div className="page-narrow">
        {!address ? (
          <div style={{ textAlign: "center", paddingTop: "1rem" }}>
            <p className="empty-state">Connect your wallet to see your real register, deposit, and proof activity.</p>
            <Link to="/dashboard" className="btn" style={{ marginTop: "1rem", display: "inline-block" }}>
              Go to dashboard
            </Link>
          </div>
        ) : entries.length === 0 ? (
          <div style={{ textAlign: "center", paddingTop: "0.5rem" }}>
            <div className="history-empty-illustration">
              <NoDataIllustration />
            </div>
            <p className="empty-state">
              Nothing here yet. Register, deposit, and generate a proof on the dashboard -- every
              real action shows up here with its actual transaction hash.
            </p>
            <Link to="/dashboard" className="btn" style={{ marginTop: "1rem", display: "inline-block" }}>
              Go to dashboard
            </Link>
          </div>
        ) : (
          <>
            <div className="history-filters">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  className={`history-filter ${filter === f.id ? "active" : ""}`}
                  onClick={() => setFilter(f.id)}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {filtered.length === 0 ? (
              <p className="empty-state">No entries match this filter.</p>
            ) : (
              <motion.div
                className="history-list"
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.2 }}
                variants={staggerContainer}
              >
                {filtered.map((entry) => (
                  <motion.div
                    className="history-item"
                    key={entry.id}
                    variants={fadeUp}
                    transition={fadeUpTransition}
                  >
                    <div className="history-item-left">
                      <span className="history-item-icon">{ICONS[entry.kind]}</span>
                      <div>
                        <div className="history-item-kind">{titleFor(entry)}</div>
                        <div className="history-item-meta">{new Date(entry.timestamp).toLocaleString()}</div>
                      </div>
                    </div>
                    {entry.txHash ? (
                      <a
                        href={EXPLORER_TX_URL(entry.txHash)}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-outline"
                      >
                        View on Stellar Expert
                      </a>
                    ) : (
                      <span className="history-item-meta">Confirmed on-chain</span>
                    )}
                  </motion.div>
                ))}
              </motion.div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
