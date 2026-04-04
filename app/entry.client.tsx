import * as Sentry from "@sentry/react-router";
import { startTransition, StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";
import { HydratedRouter } from "react-router/dom";

import {
  resolveAppRelease,
  resolveObservabilityEnvironment,
  shouldEnableSentry,
} from "@/lib/observability-config";
import { shouldDropClientEvent } from "@/lib/sentry-event-filters";

const environment = resolveObservabilityEnvironment(
  import.meta.env.VITE_SENTRY_ENVIRONMENT,
  import.meta.env.MODE,
);
const release = resolveAppRelease(import.meta.env.VITE_APP_RELEASE) ?? undefined;
const sentryEnabled = shouldEnableSentry({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  isLocalDevRuntime: import.meta.env.DEV,
  localOverride: import.meta.env.VITE_SENTRY_LOCAL_ENABLED,
});
const tracing = sentryEnabled
  ? Sentry.reactRouterTracingIntegration({ useInstrumentationAPI: true })
  : null;

if (sentryEnabled && tracing) {
  const consoleLogging = Sentry.consoleLoggingIntegration({ levels: ["warn", "error"] });
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
}

startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <HydratedRouter
        unstable_instrumentations={tracing ? [tracing.clientInstrumentation] : undefined}
      />
    </StrictMode>,
  );
});
