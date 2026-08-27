import { motion } from "motion/react";
import { Link } from "react-router-dom";
import type { AppEnv } from "../services/env";
import { Marquee } from "../components/Marquee";
import { fadeUp, staggerContainer, fadeUpTransition } from "../lib/motionPresets";

// Real, already-verified testnet transaction -- not a placeholder number.
// This is the "fully connected chain" proof from docs/deployment/testnet.md:
// a real account's real on-chain spendable balance, proven >= 300 without
// revealing the actual balance (500), verified on-chain returning `true`.
const REAL_PROOF_TX = "0e02c9617c97e6f8b3450a4a085977de2d4d5a410b61abccd24e590f0d2848c8";
const REAL_PROOF_EXPLORER_URL = `https://stellar.expert/explorer/testnet/tx/${REAL_PROOF_TX}`;

function IconEye({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
function IconHome({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 11 12 4l9 7" />
      <path d="M5 10v10h14V10" />
    </svg>
  );
}
function IconBriefcase({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="7" width="18" height="12" rx="2" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}
function IconCoin({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v10M9 9.5c0-1.4 1.3-2.5 3-2.5s3 1.1 3 2.5-1.3 2-3 2.5-3 1.1-3 2.5 1.3 2.5 3 2.5 3-1.1 3-2.5" />
    </svg>
  );
}
function IconShieldCheck({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 2 4 5v6c0 5 3.4 8.7 8 10 4.6-1.3 8-5 8-10V5l-8-3Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
function IconShare({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="18" cy="5" r="2.5" />
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="18" cy="19" r="2.5" />
      <path d="m8.2 10.8 7.6-4.4M8.2 13.2l7.6 4.4" />
    </svg>
  );
}
function IconLock({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="4" y="10" width="16" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}
function IconChain({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="2" y="9" width="8" height="8" rx="3" />
      <rect x="14" y="7" width="8" height="8" rx="3" />
      <path d="M9 12h6" />
    </svg>
  );
}
function IconFlask({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M9 2v6.5L3.6 18.4A2 2 0 0 0 5.3 21h13.4a2 2 0 0 0 1.7-2.6L15 8.5V2" />
      <path d="M9 2h6M6.5 15h11" />
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

const FEATURES = [
  {
    icon: <IconLock size={24} />,
    title: "In-browser proving",
    body: "Your keys and exact balance never leave your device.",
  },
  {
    icon: <IconShieldCheck size={24} />,
    title: "Threshold-only",
    body: "Prove you clear a bar, not what you're actually worth.",
  },
  {
    icon: <IconChain size={24} />,
    title: "On-chain verified",
    body: "Every result checks out independently on Stellar Expert.",
  },
  {
    icon: <IconFlask size={24} />,
    title: "Testnet ready",
    body: "Live and interactive right now -- no waitlist.",
  },
];

const CAPABILITIES = [
  { icon: <IconHome size={20} />, label: "Prove rent eligibility" },
  { icon: <IconEye size={20} />, label: "Prove loan eligibility" },
  { icon: <IconBriefcase size={20} />, label: "Prove gig income" },
  { icon: <IconShieldCheck size={20} />, label: "Threshold proofs" },
  { icon: <IconLock size={20} />, label: "In-browser proving" },
  { icon: <IconChain size={20} />, label: "On-chain verified" },
];

export default function Home({ env: _env }: { env: AppEnv }) {
  return (
    <div>
      <section className="hero section-invert">
        <div className="hero-aurora" aria-hidden="true" />
        <motion.div
          className="hero-content page"
          initial="hidden"
          animate="show"
          variants={staggerContainer}
        >
          <motion.span className="hero-badge" variants={fadeUp} transition={fadeUpTransition}>
            <span className="hero-badge-dot" aria-hidden="true" />
            Live on testnet
          </motion.span>
          <motion.h1 variants={fadeUp} transition={fadeUpTransition}>
            Prove your income clears a bar.
            <br />
            <span className="hero-accent">Not what it actually is.</span>
          </motion.h1>
          <motion.p className="hero-subtitle" variants={fadeUp} transition={fadeUpTransition}>
            A real zero-knowledge proof, generated in your browser, verified on Stellar.
          </motion.p>
          <motion.div className="cta-row" variants={fadeUp} transition={fadeUpTransition}>
            <Link to="/dashboard" className="btn">
              Try it on testnet
            </Link>
            <a href="#how-it-works" className="btn btn-outline">
              See how it works
            </a>
          </motion.div>
          <motion.p className="hero-trust" variants={fadeUp} transition={fadeUpTransition}>
            Testnet only &middot; unaudited preview &middot; no real funds
          </motion.p>
        </motion.div>
      </section>

      <section className="feature-strip-section">
        <motion.div
          className="page feature-strip"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.4 }}
          variants={staggerContainer}
        >
          {FEATURES.map((f) => (
            <motion.div key={f.title} className="feature-strip-item" variants={fadeUp} transition={fadeUpTransition}>
              <div className="feature-strip-icon">{f.icon}</div>
              <div>
                <h3>{f.title}</h3>
                <p>{f.body}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      <section className="marquee-section">
        <Marquee items={CAPABILITIES} ariaLabel="ProofPay capabilities" />
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
              <motion.div key={p.title} className="problem-card" variants={fadeUp} transition={fadeUpTransition}>
                <div className="problem-card-icon">{p.icon}</div>
                <h3>{p.title}</h3>
                <p>{p.body}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="section section-invert" id="how-it-works">
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
                <motion.div className="flow-diagram-node" variants={fadeUp} transition={fadeUpTransition}>
                  <div className="step-icon">{step.icon}</div>
                  {step.title}
                </motion.div>
                {i < STEPS.length - 1 && (
                  <motion.span className="flow-diagram-arrow" variants={fadeUp} transition={fadeUpTransition}>
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
              <motion.div key={step.title} className="step" variants={fadeUp} transition={fadeUpTransition}>
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
            initial={{ opacity: 0, scale: 0.94, boxShadow: "0 0 0 0 rgba(201, 162, 75, 0)" }}
            whileInView={{
              // Arrays match boxShadow's 3 keyframes 1:1 so the shared
              // `times` below applies cleanly to every animated property.
              opacity: [0, 1, 1],
              scale: [0.94, 1, 1],
              // A one-time gold glow that settles, not a looping shimmer --
              // this is the single most important trust-building moment on
              // the site, so it gets the one deliberate motion flourish, not
              // a busy/looping effect. rgba() literal here (not var(--gold-
              // accent) via color-mix) because Motion's box-shadow keyframe
              // interpolation needs a plain color to animate smoothly; the
              // value mirrors --gold-accent (#c9a24b) exactly.
              boxShadow: [
                "0 0 0 0 rgba(201, 162, 75, 0)",
                "0 0 40px 8px rgba(201, 162, 75, 0.35)",
                "0 0 18px 2px rgba(201, 162, 75, 0.18)",
              ],
            }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ ...fadeUpTransition, duration: 1.1, times: [0, 0.55, 1] }}
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
