import { nodeProfilingIntegration } from "@sentry/profiling-node";
import * as Sentry from "@sentry/react-router";

import { shouldDropServerEvent } from "./app/lib/sentry-event-filters.js";

/**
 * @param {null | string | undefined} explicitValue - Preferred environment override.
 * @param {null | string | undefined} fallbackValue - Secondary environment source.
 * @returns {string} Canonical environment name for observability tags.
 */
const resolveObservabilityEnvironment = (explicitValue, fallbackValue) => {
  /** @type {null | string} */
  let candidate = null;

  for (const value of [explicitValue, fallbackValue]) {
    if (typeof value === "string") {
      const normalizedValue = value.trim().toLowerCase();
      if (normalizedValue.length > 0) {
        candidate = normalizedValue;
        break;
      }
    }
  }

  if (!candidate) {
    return "develop";
  }

  if (candidate === "prod" || candidate === "production") {
    return "production";
  }

  if (
    candidate === "dev" ||
    candidate === "develop" ||
    candidate === "development" ||
    candidate === "preview" ||
    candidate === "local" ||
    candidate === "test"
  ) {
    return "develop";
  }

  return candidate;
};

/**
 * @param {...(null | string | undefined)} values - Candidate release identifiers.
 * @returns {string | undefined} First non-empty release identifier.
 */
const resolveAppRelease = (...values) => {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return undefined;
};

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
  release: resolveAppRelease(process.env.VITE_APP_RELEASE, process.env.RAILWAY_GIT_COMMIT_SHA),
  // Adds request headers and IP for users, for more info visit:
  // https://docs.sentry.io/platforms/javascript/guides/react-router/configuration/options/#sendDefaultPii
  sendDefaultPii: true,
  tracesSampleRate: 1,
});
