import * as Sentry from "@sentry/react-router";
import { startTransition, StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";
import { HydratedRouter } from "react-router/dom";

import { resolveAppRelease, resolveObservabilityEnvironment } from "@/lib/observability-config";
import { shouldDropClientEvent } from "@/lib/sentry-event-filters";

const consoleLogging = Sentry.consoleLoggingIntegration({ levels: ["warn", "error"] });
const tracing = Sentry.reactRouterTracingIntegration({ useInstrumentationAPI: true });
const browserProfiling = Sentry.browserProfilingIntegration();
const environment = resolveObservabilityEnvironment(
  import.meta.env.VITE_SENTRY_ENVIRONMENT,
  import.meta.env.MODE,
);
const release = resolveAppRelease(import.meta.env.VITE_APP_RELEASE) ?? undefined;

Sentry.init({
  beforeSend: (event) => {
    if (shouldDropClientEvent(event)) {
      return null;
    }

    return event;
  },
  dsn: import.meta.env.VITE_SENTRY_DSN,
  enableLogs: true,
  environment,
  integrations: [tracing, browserProfiling, consoleLogging, Sentry.replayIntegration()],
  profileLifecycle: "trace",
  profileSessionSampleRate: 0.5,
  release,
  replaysOnErrorSampleRate: 1,
  replaysSessionSampleRate: 0,
  sendDefaultPii: true,
  tracePropagationTargets: [/^\//],
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
