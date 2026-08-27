// Shared Motion presets -- one definition of "how ProofPay moves," reused
// on every page instead of each component hand-tuning its own duration/
// easing/stagger values. A calm, confident easing curve (a standard
// "ease-out-expo"-family curve used across premium product sites), applied
// consistently rather than the default per-library easing guessed per call.

export const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1];

export const DURATION = {
  fast: 0.35,
  base: 0.5,
  slow: 0.7,
} as const;

// Single-element entrance: fade + rise. Used for hero copy, section leads,
// and any standalone reveal.
export const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

// Wrap a list of fadeUp children in this to stagger their entrance.
export const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

export const fadeUpTransition = { duration: DURATION.base, ease: EASE_OUT };

// Card mount/unmount (AnimatePresence), used by Dashboard's step-by-step
// reveal as each stage of the real flow becomes available.
export const cardMotion = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: DURATION.fast, ease: EASE_OUT },
};
