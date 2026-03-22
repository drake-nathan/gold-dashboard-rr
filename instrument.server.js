import { nodeProfilingIntegration } from "@sentry/profiling-node";
import * as Sentry from "@sentry/react-router";

const consoleLogging = Sentry.consoleLoggingIntegration({ levels: ["warn", "error"] });

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
 *   tags?: Record<string, unknown>;
 *   transaction?: string;
 * }} SentryEventLike
 */

/** @param {SentryEventLike} event - Event payload from Sentry. */
const getError = (event) => event.exception?.values?.[0] ?? null;

/** @param {SentryEventLike} event - Event payload from Sentry. */
const getErrorMessage = (event) => {
  const error = getError(event);
  return typeof error?.value === "string" ? error.value : "";
};

/** @param {SentryEventLike} event @param {string} browserName */
const isBrowserName = (event, browserName) => event.tags?.["browser.name"] === browserName;

/** @param {SentryEventLike} event @param {string} transaction */
const isTransaction = (event, transaction) => event.transaction === transaction;

/** @param {SentryEventLike} event - Event payload from Sentry. */
const getSerializedMessage = (event) => {
  const serialized = event.extra?.__serialized__;
  if (!serialized || typeof serialized !== "object" || !("data" in serialized)) {
    return "";
  }

  const { data } = serialized;
  return typeof data === "string" ? data : "";
};

/** @param {SentryEventLike} event - Event payload from Sentry. */
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
    !error.stacktrace &&
    (isTransaction(event, "POST /") || isBrowserName(event, "SentryUptimeBot"));

  if (isStacklessGenericRootFailure) {
    return true;
  }

  return false;
};

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
