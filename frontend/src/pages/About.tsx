import { motion } from "motion/react";
import { PrivateDataIllustration } from "../assets/illustrations";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.1 } } };

function IconShield() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 2 4 5v6c0 5 3.4 8.7 8 10 4.6-1.3 8-5 8-10V5l-8-3Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
function IconChip() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="6" y="6" width="12" height="12" rx="2" />
      <path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3" />
    </svg>
  );
}
function IconLock() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="4" y="10" width="16" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}
function IconHome() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 11 12 4l9 7" />
      <path d="M5 10v10h14V10" />
    </svg>
  );
}
function IconBank() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 10 12 4l9 6" />
      <path d="M4 10h16v2H4zM6 12v7M11 12v7M13 12v7M18 12v7M4 21h16" />
    </svg>
  );
}
function IconBriefcase() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="7" width="18" height="12" rx="2" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

export default function About() {
  return (
    <div>
      <section className="about-hero page section-invert">
        <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          Why Stellar, and how the privacy actually works
        </motion.h1>
        <motion.p
          className="section-lead"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          ProofPay is built on Stellar's Confidential Tokens -- a developer preview, not a
          finished, audited product. Here's exactly what that means, what's actually private,
          and where the real risk sits.
        </motion.p>

        <motion.div
          className="about-visual"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
        >
          <PrivateDataIllustration />
        </motion.div>
      </section>

      <section className="section">
        <motion.div
          className="disclosure-box"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
        >
          <h3>Honest disclosure: unaudited developer preview</h3>
          <p>
            Stellar Confidential Tokens shipped as part of Protocol 25 ("X-Ray") as a{" "}
            <a
              href="https://stellar.org/blog/developers/developer-preview-confidential-tokens-on-stellar"
              target="_blank"
              rel="noreferrer"
            >
              developer preview
            </a>
            . Stellar's own announcement states it is not yet approved for mainnet and audits
            are underway. The on-chain UltraHonk verifier this app depends on
            (<code>ultrahonk_soroban_verifier</code>) is likewise unaudited, and currently
            implements only the non-ZK proof flavor -- meaning the privacy guarantee here rests
            on the Pedersen commitment scheme's own hiding property, not on proof-transcript
            zero-knowledge (that stronger guarantee ships once an audited ZK-flavor verifier is
            released). Everything in this app runs on Stellar testnet only.
          </p>
        </motion.div>
      </section>

      <section className="section">
        <div className="page">
          <h2>Architecture</h2>
          <p className="section-lead">
            No backend ever exists in this product's trust path. Every secret -- your spending
            key, your actual balance -- stays in your browser.
          </p>
          <motion.div
            className="architecture-list"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
            variants={stagger}
          >
            <motion.div className="architecture-item" variants={fadeUp} transition={{ duration: 0.35 }}>
              <div className="architecture-item-icon">
                <IconChip />
              </div>
              <div>
                <h3>Confidential Token contract (Soroban)</h3>
                <p>
                  Balances are Pedersen commitments on the Grumpkin curve, not plaintext numbers.
                  Deposits and merges are homomorphic point additions; register and the threshold
                  check are backed by real on-chain UltraHonk proof verification -- confirmed
                  working with genuine, Stellar-Expert-verifiable transactions on testnet, not
                  simulated.
                </p>
              </div>
            </motion.div>
            <motion.div className="architecture-item" variants={fadeUp} transition={{ duration: 0.35 }}>
              <div className="architecture-item-icon">
                <IconLock />
              </div>
              <div>
                <h3>In-browser zero-knowledge proving</h3>
                <p>
                  The threshold proof is generated entirely client-side via Noir (
                  <code>noir_js</code>) and Barretenberg (<code>bb.js</code>) compiled to WASM.
                  Verified byte-for-byte identical to the native toolchain's output before being
                  trusted -- your spending key and exact balance are witness inputs to that proof
                  and never leave your device, not even to ProofPay's own infrastructure, because
                  there is no server in this path at all.
                </p>
              </div>
            </motion.div>
            <motion.div className="architecture-item" variants={fadeUp} transition={{ duration: 0.35 }}>
              <div className="architecture-item-icon">
                <IconShield />
              </div>
              <div>
                <h3>Independent on-chain verification</h3>
                <p>
                  Anyone -- not just ProofPay -- can independently verify a shared proof result by
                  looking up the real transaction hash on Stellar Expert. The verdict comes from
                  the public ledger, not from trusting a claim ProofPay's own server makes about
                  it.
                </p>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <section className="section section-invert">
        <div className="page">
          <h2>Real-world use cases</h2>
          <p className="section-lead">
            The same underlying question -- "does this person's balance clear a bar?" -- shows
            up constantly in situations that currently demand far more disclosure than the
            question actually needs.
          </p>
          <motion.div
            className="usecase-grid"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.3 }}
            variants={stagger}
          >
            <motion.div className="usecase-card" variants={fadeUp} transition={{ duration: 0.35 }}>
              <div className="usecase-card-icon">
                <IconHome />
              </div>
              <h3>Rental applications</h3>
              <p>
                A landlord screening applicants typically asks for pay stubs or full bank
                statements. Proving "balance &ge; 3x rent" answers the actual question without
                handing over a full financial history.
              </p>
            </motion.div>
            <motion.div className="usecase-card" variants={fadeUp} transition={{ duration: 0.35 }}>
              <div className="usecase-card-icon">
                <IconBank />
              </div>
              <h3>Loan eligibility</h3>
              <p>
                Lenders pre-screen on income/balance thresholds long before a full underwriting
                process. A threshold proof lets an applicant clear that first bar privately.
              </p>
            </motion.div>
            <motion.div className="usecase-card" variants={fadeUp} transition={{ duration: 0.35 }}>
              <div className="usecase-card-icon">
                <IconBriefcase />
              </div>
              <h3>Gig / freelance income verification</h3>
              <p>
                On-chain gig payments are public by default -- anyone can look up a wallet and see
                every payment it's ever received. A threshold proof lets a platform or client
                confirm income without exposing that full history.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
