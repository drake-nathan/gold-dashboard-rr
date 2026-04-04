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
 * Read the first captured exception value from a Sentry event.
 *
 * @param {SentryEventLike} event - Event payload from Sentry.
 * @returns {null | SentryErrorValue} First exception value when present.
 */
const getError = (event) => event.exception?.values?.[0] ?? null;

/**
 * Normalize the primary exception message to a string.
 *
 * @param {SentryEventLike} event - Event payload from Sentry.
 * @returns {string} Exception message or an empty string.
 */
const getErrorMessage = (event) => {
  const error = getError(event);
  return typeof error?.value === "string" ? error.value : "";
};

/**
 * Check whether any stack frame references a specific filename, module, or function pattern.
 *
 * @param {SentryEventLike} event - Event payload from Sentry.
 * @param {string} pattern - Substring to match within stack frame metadata.
 * @returns {boolean} True when any frame contains the pattern.
 */
const hasStackFrameContaining = (event, pattern) => {
  const frames = getError(event)?.stacktrace?.frames ?? [];
  return frames.some((frame) => {
    const filename = typeof frame.filename === "string" ? frame.filename : "";
    const moduleName = typeof frame.module === "string" ? frame.module : "";
    const functionName = typeof frame.function === "string" ? frame.function : "";
    return [filename, moduleName, functionName].some((value) => value.includes(pattern));
  });
};

/**
 * Match a browser tag on the event.
 *
 * @param {SentryEventLike} event - Event payload from Sentry.
 * @param {string} browserName - Browser name to match.
 * @returns {boolean} True when the browser tag matches the requested name.
 */
const isBrowserName = (event, browserName) => event.tags?.["browser.name"] === browserName;

/**
 * Match the transaction name on the event.
 *
 * @param {SentryEventLike} event - Event payload from Sentry.
 * @param {string} transaction - Transaction name to match.
 * @returns {boolean} True when the transaction name matches.
 */
const isTransaction = (event, transaction) => event.transaction === transaction;

/**
 * Read a request header value from the event when available.
 *
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
 * Extract the serialized framework message safely when present.
 *
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
 * Determine whether a client-side event is expected noise and should be dropped.
 *
 * @param {SentryEventLike} event - Event payload from Sentry.
 * @returns {boolean} True when the client event should be discarded.
 */
export const shouldDropClientEvent = (event) => {
  const error = getError(event);
  const errorMessage = getErrorMessage(event);
  const mechanismType = error?.mechanism?.type ?? "";

  const isNavigationAbortError =
    error?.type === "AbortError" &&
    (errorMessage === "signal is aborted without reason" || errorMessage === "Fetch is aborted") &&
    mechanismType === "react_router.client_loader";

  if (isNavigationAbortError) {
    return true;
  }

  const isMobileSafariTimeoutNoise =
    error?.type === "Error" &&
    errorMessage === "Operation timed out." &&
    isBrowserName(event, "Mobile Safari") &&
    hasStackFrameContaining(event, "@opentelemetry/core") &&
    (mechanismType === "auto.browser.global_handlers.onunhandledrejection" || mechanismType === "");

  if (isMobileSafariTimeoutNoise) {
    return true;
  }

  return false;
};

/**
 * Determine whether a server-side event is expected framework or scanner noise and should be dropped.
 *
 * @param {SentryEventLike} event - Event payload from Sentry.
 * @returns {boolean} True when the server event should be discarded.
 */
export const shouldDropServerEvent = (event) => {
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
