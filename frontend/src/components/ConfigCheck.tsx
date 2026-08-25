import { type ReactNode } from "react";
import { loadEnv, MissingEnvError, type AppEnv } from "../services/env";

function readEnv(): { env: AppEnv } | { missingKeys: string[] } {
  try {
    return { env: loadEnv() };
  } catch (err) {
    if (err instanceof MissingEnvError) return { missingKeys: err.missingKeys };
    throw err;
  }
}

// Same pattern used on the previous project (StreamPay): fail loudly with an
// on-screen message when required config is missing, instead of a blank
// crashed page from an undefined access three components deep.
export function ConfigCheck({ children }: { children: (env: AppEnv) => ReactNode }) {
  const result = readEnv();

  if ("missingKeys" in result) {
    return (
      <div className="config-error">
        <h1>Configuration missing</h1>
        <p>ProofPay can&apos;t start because these environment variables aren&apos;t set:</p>
        <ul>
          {result.missingKeys.map((k) => (
            <li key={k}>
              <code>{k}</code>
            </li>
          ))}
        </ul>
        <p>
          Copy <code>.env.example</code> to <code>.env.local</code> and fill in the deployed
          contract addresses (see <code>docs/deployment/testnet.md</code>).
        </p>
      </div>
    );
  }

  return <>{children(result.env)}</>;
}
