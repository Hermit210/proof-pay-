// Product analytics (PostHog) and error monitoring (Sentry). Both are
// optional: the app runs fully without either key set (dev, or a fork that
// hasn't configured its own project), just without tracking. See README for
// what's tracked and why.

import posthog from "posthog-js";
import * as Sentry from "@sentry/react";
import type { AppEnv } from "./env";

let initialized = false;

export function initAnalytics(env: AppEnv): void {
  if (initialized) return;
  initialized = true;

  if (env.posthogKey) {
    posthog.init(env.posthogKey, {
      api_host: env.posthogHost ?? "https://us.i.posthog.com",
      capture_pageview: true,
      autocapture: false, // explicit events only -- this app's events are meaningful, not clicks
    });
  }

  if (env.sentryDsn) {
    Sentry.init({
      dsn: env.sentryDsn,
      integrations: [],
      tracesSampleRate: 0.2,
    });
  }
}

export type ProductEvent =
  | "wallet_connected"
  | "wallet_connect_failed"
  | "wallet_disconnected"
  | "register_started"
  | "register_succeeded"
  | "register_failed"
  | "deposit_made"
  | "deposit_failed"
  | "proof_generated"
  | "proof_generation_failed"
  | "proof_verified"
  | "proof_verification_failed"
  | "verification_shared";

export function track(event: ProductEvent, properties?: Record<string, unknown>): void {
  if (!posthog.__loaded) return;
  posthog.capture(event, properties);
}

export function reportError(error: unknown, context?: Record<string, unknown>): void {
  console.error(error, context);
  Sentry.captureException(error, { extra: context });
}
