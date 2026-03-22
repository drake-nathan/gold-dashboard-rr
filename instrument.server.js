import { nodeProfilingIntegration } from "@sentry/profiling-node";
import * as Sentry from "@sentry/react-router";

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
  environment:
    process.env.VITE_SENTRY_ENVIRONMENT ??
    (process.env.NODE_ENV === "production" ? "production" : "development"),

  integrations: [nodeProfilingIntegration(), consoleLogging],
  profileLifecycle: "trace",
  profileSessionSampleRate: 0.5,
  // Adds request headers and IP for users, for more info visit:
  // https://docs.sentry.io/platforms/javascript/guides/react-router/configuration/options/#sendDefaultPii
  sendDefaultPii: true,
  tracesSampleRate: 1,
});
