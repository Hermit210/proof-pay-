import { motion } from "motion/react";
import { Link } from "react-router-dom";
import type { AppEnv } from "../services/env";
import { SecurityOnIllustration } from "../assets/illustrations";

// Real, already-verified testnet transaction -- not a placeholder number.
// This is the "fully connected chain" proof from docs/deployment/testnet.md:
// a real account's real on-chain spendable balance, proven >= 300 without
// revealing the actual balance (500), verified on-chain returning `true`.
const REAL_PROOF_TX = "0e02c9617c97e6f8b3450a4a085977de2d4d5a410b61abccd24e590f0d2848c8";
const REAL_PROOF_EXPLORER_URL = `https://stellar.expert/explorer/testnet/tx/${REAL_PROOF_TX}`;

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.12 },
  },
};

function IconEye() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
function IconHome() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 11 12 4l9 7" />
      <path d="M5 10v10h14V10" />
    </svg>
  );
}
function IconBriefcase() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="7" width="18" height="12" rx="2" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}
function IconCoin() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v10M9 9.5c0-1.4 1.3-2.5 3-2.5s3 1.1 3 2.5-1.3 2-3 2.5-3 1.1-3 2.5 1.3 2.5 3 2.5 3-1.1 3-2.5" />
    </svg>
  );
}
function IconShieldCheck() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 2 4 5v6c0 5 3.4 8.7 8 10 4.6-1.3 8-5 8-10V5l-8-3Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
function IconShare() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="18" cy="5" r="2.5" />
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="18" cy="19" r="2.5" />
      <path d="m8.2 10.8 7.6-4.4M8.2 13.2l7.6 4.4" />
    </svg>
  );
}

const PROBLEMS = [
  {
    title: "Rent applications",
    icon: <IconHome />,
    body: "A landlord wants proof you can afford rent -- not a full bank statement showing every purchase you've made this year.",
  },
  {
    title: "Loan eligibility",
    icon: <IconEye />,
    body: "A lender needs to know your income clears a bar. Handing over your entire transaction history is a bigger ask than the question requires.",
  },
  {
    title: "Gig income verification",
    icon: <IconBriefcase />,
    body: "Freelance and gig platforms pay on-chain increasingly often -- and on most chains, every payment you've ever received is publicly visible to anyone who looks up your address.",
  },
];

const STEPS = [
  {
    title: "Deposit",
    icon: <IconCoin />,
    body: "Your income arrives as a normal on-chain deposit. The deposit amount itself is visible -- like any regular payment -- but that's the last time an exact number is shown to anyone.",
  },
  {
    title: "Prove",
    icon: <IconShieldCheck />,
    body: "Pick a threshold. Your browser generates a real zero-knowledge proof, locally, that your balance clears it -- your spending key and exact balance never leave your device.",
  },
  {
    title: "Share",
    icon: <IconShare />,
    body: "Hand over the proof result and a real on-chain transaction hash. Anyone can independently verify it on Stellar Expert -- without ever learning your actual balance.",
  },
];

export default function Home({ env: _env }: { env: AppEnv }) {
  return (
    <div>
      <section className="hero">
        <div className="hero-glow" aria-hidden="true" />
        <motion.div
          className="hero-content page"
          initial="hidden"
          animate="show"
          variants={staggerContainer}
        >
          <motion.h1 variants={fadeUp} transition={{ duration: 0.5 }}>
            Prove your income clears a bar.
            <br />
            <span className="hero-accent">Not what it actually is.</span>
          </motion.h1>
          <motion.p className="hero-subtitle" variants={fadeUp} transition={{ duration: 0.5 }}>
            ProofPay lets you prove your on-chain balance is at or above a threshold you choose
            -- to a landlord, a lender, or a platform -- using a real zero-knowledge proof
            generated entirely in your browser, verified on Stellar testnet.
          </motion.p>
          <motion.div variants={fadeUp} transition={{ duration: 0.5 }}>
            <Link to="/dashboard" className="btn">
              Try it on testnet
            </Link>
          </motion.div>
          <motion.div className="hero-visual" variants={fadeUp} transition={{ duration: 0.6 }}>
            <SecurityOnIllustration />
          </motion.div>
        </motion.div>
      </section>

      <section className="section">
        <div className="page">
          <h2>On-chain payments are public by default</h2>
          <p className="section-lead">
            Every deposit, every balance, every transfer -- visible to anyone who looks up an
            address. That's a feature for auditability, and a real problem the moment someone
            else needs to trust a fact about your finances without seeing all of them.
          </p>
          <motion.div
            className="problem-grid"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.3 }}
            variants={staggerContainer}
          >
            {PROBLEMS.map((p) => (
              <motion.div key={p.title} className="problem-card" variants={fadeUp} transition={{ duration: 0.4 }}>
                <div className="problem-card-icon">{p.icon}</div>
                <h3>{p.title}</h3>
                <p>{p.body}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="section section-invert">
        <div className="page">
          <h2>How it works</h2>
          <p className="section-lead">
            Honest framing: the deposit amount is visible on-chain, like any normal payment.
            What's private is the threshold check itself -- whether your balance clears the bar
            you chose, proven without revealing what the balance actually is.
          </p>

          <motion.div
            className="flow-diagram"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.5 }}
            variants={staggerContainer}
            aria-hidden="true"
          >
            {STEPS.map((step, i) => (
              <motion.div key={step.title} style={{ display: "contents" }}>
                <motion.div className="flow-diagram-node" variants={fadeUp} transition={{ duration: 0.4 }}>
                  <div className="step-icon">{step.icon}</div>
                  {step.title}
                </motion.div>
                {i < STEPS.length - 1 && (
                  <motion.span className="flow-diagram-arrow" variants={fadeUp} transition={{ duration: 0.4 }}>
                    &rarr;
                  </motion.span>
                )}
              </motion.div>
            ))}
          </motion.div>

          <motion.div
            className="steps"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.3 }}
            variants={staggerContainer}
          >
            {STEPS.map((step, i) => (
              <motion.div key={step.title} className="step" variants={fadeUp} transition={{ duration: 0.4 }}>
                <div className="step-number">{i + 1}</div>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="section">
        <div className="page">
          <h2>Already verified on testnet</h2>
          <motion.div
            className="proof-point"
            initial={{ opacity: 0, scale: 0.94 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.5 }}
          >
            <p className="proof-point-label">Real on-chain result</p>
            <p className="proof-point-value">balance &ge; 300 &rarr; true</p>
            <p>
              A real account's real confidential balance, proven at or above 300 without
              revealing that the actual balance was 500 -- verified on-chain by a genuine
              UltraHonk zero-knowledge proof.
            </p>
            <a href={REAL_PROOF_EXPLORER_URL} target="_blank" rel="noreferrer" className="btn btn-outline">
              View real transaction on Stellar Expert
            </a>
          </motion.div>
        </div>
      </section>

      <section className="section section-invert">
        <div className="page cta-row">
          <Link to="/dashboard" className="btn">
            Try ProofPay on testnet
          </Link>
          <Link to="/about" className="btn btn-outline">
            How the privacy actually works
          </Link>
        </div>
      </section>
    </div>
  );
}
