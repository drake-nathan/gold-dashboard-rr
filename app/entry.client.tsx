import * as Sentry from "@sentry/react-router";
import { startTransition, StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";
import { HydratedRouter } from "react-router/dom";

import { shouldDropClientEvent } from "@/lib/sentry-event-filters";

const consoleLogging = Sentry.consoleLoggingIntegration({ levels: ["warn", "error"] });
const tracing = Sentry.reactRouterTracingIntegration({ useInstrumentationAPI: true });
const browserProfiling = Sentry.browserProfilingIntegration();

Sentry.init({
  beforeSend: (event) => {
    if (shouldDropClientEvent(event)) {
      return null;
    }

    return event;
  },
  dsn: import.meta.env.VITE_SENTRY_DSN,
  enableLogs: true,
  environment: import.meta.env.VITE_SENTRY_ENVIRONMENT ?? import.meta.env.MODE,
  integrations: [tracing, browserProfiling, consoleLogging, Sentry.replayIntegration()],
  profileLifecycle: "trace",
  profileSessionSampleRate: 0.5,
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
