import { nodeProfilingIntegration } from "@sentry/profiling-node";
import * as Sentry from "@sentry/react-router";

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

/**
 * @param {{
 *   dsn?: null | string;
 *   isLocalDevRuntime?: boolean;
 *   localOverride?: null | string;
 * }} options - Runtime flags and env values.
 * @returns {boolean} True when Sentry should initialize.
 */
const shouldEnableSentry = ({ dsn, isLocalDevRuntime = false, localOverride } = {}) => {
  if (typeof dsn !== "string" || dsn.trim().length === 0) {
    return false;
  }

  if (!isLocalDevRuntime) {
    return true;
  }

  return typeof localOverride === "string" && localOverride.trim().toLowerCase() === "true";
};

/**
 * @typedef {{
 *   mechanism?: { type?: string };
 *   stacktrace?: {
 *     frames?: {
 *       filename?: string;
 *       function?: string;
 *       module?: string;
 *     }[];
 *   };
 *   type?: string;
 *   value?: string;
 * }} SentryErrorValue
 *
 * @typedef {{
 *   exception?: {
 *     values?: SentryErrorValue[];
 *   };
 *   extra?: {
 *     __serialized?: unknown;
 *   };
 *   request?: {
 *     headers?: Record<string, string | string[] | undefined>;
 *     method?: string;
 *     url?: string;
 *   };
 *   tags?: Record<string, unknown>;
 *   transaction?: string;
 * }} SentryEventLike
 */

/**
 * @param {SentryEventLike} event - Event payload from Sentry.
 * @returns {null | SentryErrorValue} First exception value when present.
 */
const getError = (event) => event.exception?.values?.[0] ?? null;

/**
 * @param {SentryEventLike} event - Event payload from Sentry.
 * @returns {string} Exception message or an empty string.
 */
const getErrorMessage = (event) => {
  const error = getError(event);
  return typeof error?.value === "string" ? error.value : "";
};

/**
 * @param {SentryEventLike} event - Event payload from Sentry.
 * @param {string} browserName - Browser name to match.
 * @returns {boolean} True when the browser tag matches the requested name.
 */
const isBrowserName = (event, browserName) => event.tags?.["browser.name"] === browserName;

/**
 * @param {SentryEventLike} event - Event payload from Sentry.
 * @param {string} transaction - Transaction name to match.
 * @returns {boolean} True when the transaction name matches.
 */
const isTransaction = (event, transaction) => event.transaction === transaction;

/**
 * @param {SentryEventLike} event - Event payload from Sentry.
 * @param {string} headerName - Header name to read.
 * @returns {string} Header value or an empty string.
 */
const getRequestHeader = (event, headerName) => {
  const headers = event.request?.headers;
  if (!headers || typeof headers !== "object") {
    return "";
  }

  const headerValue = headers[headerName] ?? headers[headerName.toLowerCase()];

  if (typeof headerValue === "string") {
    return headerValue;
  }

  if (Array.isArray(headerValue)) {
    return headerValue.find((value) => typeof value === "string") ?? "";
  }

  return "";
};

/**
 * @param {SentryEventLike} event - Event payload from Sentry.
 * @returns {string} Serialized message or an empty string.
 */
const getSerializedMessage = (event) => {
  const serialized = event.extra?.__serialized__;
  if (!serialized || typeof serialized !== "object" || !("data" in serialized)) {
    return "";
  }

  const { data } = serialized;
  return typeof data === "string" ? data : "";
};

/**
 * @param {SentryEventLike} event - Event payload from Sentry.
 * @returns {boolean} True when the server event should be discarded.
 */
const shouldDropServerEvent = (event) => {
  const error = getError(event);
  const errorMessage = getErrorMessage(event);
  const serialized = event.extra?.__serialized__;
  const serializedObject = serialized && typeof serialized === "object" ? serialized : null;
  const serializedMessage = getSerializedMessage(event);

  const isNotFoundStatus = serializedObject?.status === 404;
  const isRouteMiss = errorMessage.startsWith('No route matches URL "');
  const isSerializedRouteMiss = serializedMessage.startsWith('Error: No route matches URL "');
  const isMethodNotAllowedStatus = serializedObject?.status === 405;
  const isMissingActionPostRoot =
    errorMessage.includes('You made a POST request to "/"') &&
    errorMessage.includes("did not provide an `action`");
  const isSerializedMissingActionPostRoot =
    serializedMessage.includes('You made a POST request to "/"') &&
    serializedMessage.includes("did not provide an `action`");

  if (
    error?.type === "NotFoundException" ||
    isNotFoundStatus ||
    isRouteMiss ||
    isSerializedRouteMiss ||
    (isMethodNotAllowedStatus && (isMissingActionPostRoot || isSerializedMissingActionPostRoot))
  ) {
    return true;
  }

  const isStacklessGenericRootFailure =
    error?.type === "Error" &&
    errorMessage === "Unexpected Server Error" &&
    !getError(event)?.stacktrace &&
    (isTransaction(event, "POST /") ||
      isBrowserName(event, "SentryUptimeBot") ||
      getRequestHeader(event, "user-agent").includes("SentryUptimeBot"));

  if (isStacklessGenericRootFailure) {
    return true;
  }

  return false;
};

const sentryEnabled = shouldEnableSentry({
  dsn: process.env.VITE_SENTRY_DSN,
  isLocalDevRuntime: process.env.NODE_ENV !== "production",
  localOverride: process.env.VITE_SENTRY_LOCAL_ENABLED,
});

if (sentryEnabled) {
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
}
