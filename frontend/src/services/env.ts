// Startup config check -- same pattern used on the previous project (StreamPay):
// fail loudly with an on-screen message if a required env var is missing,
// rather than a blank crashed page from some deep undefined-is-not-a-function.

export interface AppEnv {
  sorobanRpcUrl: string;
  networkPassphrase: string;
  tokenContractId: string;
  verifierContractId: string;
  thresholdVerifierContractId: string;
  auditorContractId: string;
  posthogKey?: string;
  posthogHost?: string;
  sentryDsn?: string;
}

const REQUIRED_KEYS = [
  "VITE_SOROBAN_RPC_URL",
  "VITE_NETWORK_PASSPHRASE",
  "VITE_TOKEN_CONTRACT_ID",
  "VITE_VERIFIER_CONTRACT_ID",
  "VITE_THRESHOLD_VERIFIER_CONTRACT_ID",
  "VITE_AUDITOR_CONTRACT_ID",
] as const;

export class MissingEnvError extends Error {
  constructor(public readonly missingKeys: string[]) {
    super(`Missing required environment variables: ${missingKeys.join(", ")}`);
    this.name = "MissingEnvError";
  }
}

export function loadEnv(): AppEnv {
  const env = import.meta.env;
  const missing = REQUIRED_KEYS.filter((key) => !env[key]);
  if (missing.length > 0) {
    throw new MissingEnvError(missing);
  }

  return {
    sorobanRpcUrl: env.VITE_SOROBAN_RPC_URL,
    networkPassphrase: env.VITE_NETWORK_PASSPHRASE,
    tokenContractId: env.VITE_TOKEN_CONTRACT_ID,
    verifierContractId: env.VITE_VERIFIER_CONTRACT_ID,
    thresholdVerifierContractId: env.VITE_THRESHOLD_VERIFIER_CONTRACT_ID,
    auditorContractId: env.VITE_AUDITOR_CONTRACT_ID,
    posthogKey: env.VITE_POSTHOG_KEY,
    posthogHost: env.VITE_POSTHOG_HOST,
    sentryDsn: env.VITE_SENTRY_DSN,
  };
}
