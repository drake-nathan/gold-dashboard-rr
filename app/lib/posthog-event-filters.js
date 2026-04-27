/**
 * @typedef {{
 *   mechanism?: { handled?: boolean; type?: string };
 *   stacktrace?: {
 *     frames?: {
 *       filename?: string;
 *       function?: string;
 *       module?: string;
 *     }[];
 *   };
 *   type?: string;
 *   value?: string;
 * }} PostHogException
 *
 * @typedef {{
 *   event?: string;
 *   properties?: {
 *     $browser?: string;
 *     $exception_list?: PostHogException[];
 *     $exception_message?: string;
 *     $exception_type?: string;
 *     [key: string]: unknown;
 *   };
 * }} PostHogEventLike
 */

/**
 * Read the first captured exception value from a PostHog event.
 *
 * @param {PostHogEventLike} event - PostHog event payload.
 * @returns {null | PostHogException} First exception when present.
 */
const getException = (event) => event.properties?.$exception_list?.[0] ?? null;

/**
 * Normalize the primary exception message to a string.
 *
 * @param {PostHogEventLike} event - PostHog event payload.
 * @returns {string} Exception message or an empty string.
 */
const getExceptionMessage = (event) => {
  const exception = getException(event);
  if (typeof exception?.value === "string") {
    return exception.value;
  }
  const fallback = event.properties?.$exception_message;
  return typeof fallback === "string" ? fallback : "";
};

/**
 * Normalize the primary exception type to a string.
 *
 * @param {PostHogEventLike} event - PostHog event payload.
 * @returns {string} Exception type or an empty string.
 */
const getExceptionType = (event) => {
  const exception = getException(event);
  if (typeof exception?.type === "string") {
    return exception.type;
  }
  const fallback = event.properties?.$exception_type;
  return typeof fallback === "string" ? fallback : "";
};

/**
 * Determine whether a client-side exception event is expected noise and should be dropped.
 *
 * @param {PostHogEventLike} event - PostHog event payload.
 * @returns {boolean} True when the client event should be discarded.
 */
export const shouldDropClientEvent = (event) => {
  if (event.event !== "$exception") {
    return false;
  }

  const exception = getException(event);
  const errorMessage = getExceptionMessage(event);
  const errorType = getExceptionType(event);
  const mechanismType = exception?.mechanism?.type ?? "";

  const isNavigationAbortError =
    errorType === "AbortError" &&
    (errorMessage === "signal is aborted without reason" || errorMessage === "Fetch is aborted") &&
    mechanismType === "react_router.client_loader";

  if (isNavigationAbortError) {
    return true;
  }

  return false;
};

/**
 * Determine whether a server-side error is expected framework or scanner noise and should be dropped
 * before being forwarded to PostHog.
 *
 * @param {{
 *   error: unknown;
 *   request?: { headers?: Headers; method?: string; url?: string };
 *   status?: number;
 * }} input - Error context from React Router's handleError.
 * @returns {boolean} True when the server error should be discarded.
 */
export const shouldDropServerError = ({ error, request, status }) => {
  const errorName = error instanceof Error ? error.name : "";
  const errorMessage = error instanceof Error ? error.message : "";

  const isRouteMiss = errorMessage.startsWith('No route matches URL "');
  const isMethodNotAllowedStatus = status === 405;
  const isMissingActionPostRoot =
    errorMessage.includes('You made a POST request to "/"') &&
    errorMessage.includes("did not provide an `action`");

  if (
    errorName === "NotFoundException" ||
    status === 404 ||
    isRouteMiss ||
    (isMethodNotAllowedStatus && isMissingActionPostRoot)
  ) {
    return true;
  }

  const userAgent = request?.headers?.get("user-agent") ?? "";
  const isScannerOrUptimeBot =
    errorMessage === "Unexpected Server Error" &&
    !(error instanceof Error && error.stack) &&
    (userAgent.includes("UptimeBot") ||
      userAgent.includes("UptimeRobot") ||
      (request?.method === "POST" && new URL(request.url ?? "http://localhost/").pathname === "/"));

  if (isScannerOrUptimeBot) {
    return true;
  }

  return false;
};
