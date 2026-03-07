import { nodeProfilingIntegration } from "@sentry/profiling-node";
import * as Sentry from "@sentry/react-router";

Sentry.init({
  // Set up performance monitoring
  beforeSend: (event) => {
    // Filter out 404s from error reporting
    if (event.exception) {
      const error = event.exception.values?.[0];
      if (error?.type === "NotFoundException" || error?.value?.includes("404")) {
        return null;
      }
    }
    return event;
  },

  dsn: process.env.VITE_SENTRY_DSN,

  // Enable logs to be sent to Sentry
  enableLogs: true,
  environment:
    process.env.VITE_SENTRY_ENVIRONMENT ||
    (process.env.NODE_ENV === "production" ? "production" : "development"),

  integrations: [nodeProfilingIntegration()],
  // 100% sampling — intentional for low-traffic app. Reduce if volume grows.
  profilesSampleRate: 1,
  // Adds request headers and IP for users, for more info visit:
  // https://docs.sentry.io/platforms/javascript/guides/react-router/configuration/options/#sendDefaultPii
  sendDefaultPii: true,

  tracesSampleRate: 1,
});
