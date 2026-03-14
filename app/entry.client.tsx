import * as Sentry from "@sentry/react-router";
import { startTransition, StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";
import { HydratedRouter } from "react-router/dom";

const consoleLogging = Sentry.consoleLoggingIntegration({ levels: ["warn", "error"] });
const tracing = Sentry.reactRouterTracingIntegration({ useInstrumentationAPI: true });
const browserProfiling = Sentry.browserProfilingIntegration();

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  enableLogs: true,
  environment: import.meta.env.VITE_SENTRY_ENVIRONMENT ?? import.meta.env.MODE,
  integrations: [tracing, browserProfiling, consoleLogging, Sentry.replayIntegration()],
  // Session Replay: buffer mode (error-only)
  // Records in memory but only uploads when an error occurs (~60s pre-error context)
  // PostHog handles all-session replays for heatmaps
  profileLifecycle: "trace",
  profileSessionSampleRate: 1,
  replaysOnErrorSampleRate: 1,
  replaysSessionSampleRate: 0,
  sendDefaultPii: true,
  tracePropagationTargets: [/^\//],
  // 100% sampling — intentional for low-traffic app. Reduce if volume grows.
  tracesSampleRate: 1,
});

startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <HydratedRouter unstable_instrumentations={[tracing.clientInstrumentation]} />
    </StrictMode>,
  );
});
