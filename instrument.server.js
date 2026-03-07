import { nodeProfilingIntegration } from "@sentry/profiling-node";
import * as Sentry from "@sentry/react-router";

const consoleLogging = Sentry.consoleLoggingIntegration({ levels: ["warn", "error"] });

Sentry.init({
  // Set up performance monitoring
  beforeSend: (event) => {
    // Filter out framework-generated 404s for missing routes/assets and scanner noise.
    const error = event.exception?.values?.[0];
    const serialized = event.extra?.__serialized__;
    const errorMessage = error?.value ?? "";
    const serializedObject = serialized && typeof serialized === "object" ? serialized : null;
    const serializedMessage =
      typeof serializedObject?.data === "string" ? serializedObject.data : "";
    const isNotFoundStatus = serializedObject?.status === 404;
    const isRouteMiss =
      typeof errorMessage === "string" && errorMessage.startsWith('No route matches URL "');
    const isSerializedRouteMiss =
      typeof serializedMessage === "string" &&
      serializedMessage.startsWith('Error: No route matches URL "');
    const isMethodNotAllowedStatus = serializedObject?.status === 405;
    const isMissingActionPostRoot =
      typeof errorMessage === "string" &&
      errorMessage.includes('You made a POST request to "/"') &&
      errorMessage.includes("did not provide an `action`");
    const isSerializedMissingActionPostRoot =
      typeof serializedMessage === "string" &&
      serializedMessage.includes('You made a POST request to "/"') &&
      serializedMessage.includes("did not provide an `action`");

    if (
      error?.type === "NotFoundException" ||
      isNotFoundStatus ||
      isRouteMiss ||
      isSerializedRouteMiss ||
      (isMethodNotAllowedStatus &&
        (isMissingActionPostRoot || isSerializedMissingActionPostRoot))
    ) {
      return null;
    }

    return event;
  },

  dsn: process.env.VITE_SENTRY_DSN,

  // Enable logs to be sent to Sentry
  enableLogs: true,
  environment:
    process.env.VITE_SENTRY_ENVIRONMENT ||
    (process.env.NODE_ENV === "production" ? "production" : "development"),

  integrations: [nodeProfilingIntegration(), consoleLogging],
  profileLifecycle: "trace",
  // 100% sampling — intentional for low-traffic app. Reduce if volume grows.
  profileSessionSampleRate: 1,
  // Adds request headers and IP for users, for more info visit:
  // https://docs.sentry.io/platforms/javascript/guides/react-router/configuration/options/#sendDefaultPii
  sendDefaultPii: true,

  tracesSampleRate: 1,
});
