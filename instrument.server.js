import { nodeProfilingIntegration } from "@sentry/profiling-node";
import * as Sentry from "@sentry/react-router";

import {
  resolveAppRelease,
  resolveObservabilityEnvironment,
} from "./app/lib/observability-config.js";
import { shouldDropServerEvent } from "./app/lib/sentry-event-filters.js";

const consoleLogging = Sentry.consoleLoggingIntegration({ levels: ["warn", "error"] });

Sentry.init({
  beforeSend: (event) => {
    if (shouldDropServerEvent(event)) {
      return null;
    }

    return event;
  },

  dsn: process.env.VITE_SENTRY_DSN,
  enableLogs: true,
  environment: resolveObservabilityEnvironment(
    process.env.VITE_SENTRY_ENVIRONMENT,
    process.env.NODE_ENV,
  ),

  integrations: [nodeProfilingIntegration(), consoleLogging],
  profileLifecycle: "trace",
  profileSessionSampleRate: 0.5,
  release:
    resolveAppRelease(process.env.VITE_APP_RELEASE, process.env.RAILWAY_GIT_COMMIT_SHA) ??
    undefined,
  // Adds request headers and IP for users, for more info visit:
  // https://docs.sentry.io/platforms/javascript/guides/react-router/configuration/options/#sendDefaultPii
  sendDefaultPii: true,
  tracesSampleRate: 1,
});
