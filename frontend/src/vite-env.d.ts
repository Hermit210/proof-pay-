/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SOROBAN_RPC_URL: string;
  readonly VITE_NETWORK_PASSPHRASE: string;
  readonly VITE_TOKEN_CONTRACT_ID: string;
  readonly VITE_VERIFIER_CONTRACT_ID: string;
  readonly VITE_THRESHOLD_VERIFIER_CONTRACT_ID: string;
  readonly VITE_AUDITOR_CONTRACT_ID: string;
  readonly VITE_POSTHOG_KEY?: string;
  readonly VITE_POSTHOG_HOST?: string;
  readonly VITE_SENTRY_DSN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  freighter?: boolean;
}
