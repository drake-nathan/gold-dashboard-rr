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
 *
 * @typedef {{ headers?: Headers; method?: string; url?: string; auth?: { userId?: string | null } }} ServerRequestLike
 *
 * @typedef {{ name: string; value: string }} CookiePair
 *
 * @typedef {{ error: Error; properties: Record<string, string | number | boolean> }} ServerExceptionNormalization
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
  const routeErrorStatus = getRouteErrorStatus(error);
  const resolvedStatus = status ?? routeErrorStatus;
  const requestPath = getRequestPath(request);

  const isRouteMiss = errorMessage.startsWith('No route matches URL "');
  const isMethodNotAllowedStatus = resolvedStatus === 405;
  const isMissingActionPostRoot =
    errorMessage.includes('You made a POST request to "/"') &&
    errorMessage.includes("did not provide an `action`");

  if (
    errorName === "NotFoundException" ||
    resolvedStatus === 404 ||
    isRouteMiss ||
    (isMethodNotAllowedStatus && isMissingActionPostRoot)
  ) {
    return true;
  }

  if (isScannerPath(requestPath)) {
    return true;
  }

  const userAgent = request?.headers?.get("user-agent") ?? "";
  const isScannerOrUptimeBot =
    errorMessage === "Unexpected Server Error" &&
    !(error instanceof Error && error.stack) &&
    (userAgent.includes("UptimeBot") ||
      userAgent.includes("UptimeRobot") ||
      (request?.method === "POST" && requestPath === "/"));

  if (isScannerOrUptimeBot) {
    return true;
  }

  return false;
};

const maxSerializedErrorLength = 600;

const scannerPathPatterns = [
  /^\/\.env(?:\.|$|\/)/u,
  /^\/\.git(?:\/|$)/u,
  /^\/_next(?:\/|$)/u,
  /^\/api\/\.env(?:\.|$|\/)/u,
  /^\/cgi-bin(?:\/|$)/u,
  /^\/phpmyadmin(?:\/|$)/iu,
  /^\/wp-/iu,
  /^\/wordpress(?:\/|$)/iu,
  /^\/xmlrpc\.php$/iu,
  /(?:^|\/)wp_filemanager\.php$/iu,
  /\.(?:asp|aspx|bak|cgi|env|ini|log|php|sql)(?:$|\?)/iu,
];

/**
 * @param {unknown} value - Value to inspect.
 * @returns {value is Record<string, unknown>} True when the value is an object record.
 */
const isRecord = (value) => typeof value === "object" && value !== null;

/**
 * @param {unknown} error - Thrown server value.
 * @returns {number | undefined} HTTP status when present.
 */
const getRouteErrorStatus = (error) => {
  if (error instanceof Response) {
    return error.status;
  }
  if (!isRecord(error)) {
    return undefined;
  }
  const status = error.status;
  return typeof status === "number" ? status : undefined;
};

/**
 * @param {unknown} error - Thrown server value.
 * @returns {string | undefined} HTTP status text when present.
 */
const getRouteErrorStatusText = (error) => {
  if (error instanceof Response) {
    return error.statusText;
  }
  if (!isRecord(error)) {
    return undefined;
  }
  const statusText = error.statusText;
  return typeof statusText === "string" ? statusText : undefined;
};

/**
 * @param {unknown} error - Thrown server value.
 * @returns {unknown} Route error data when present.
 */
const getRouteErrorData = (error) => {
  if (!isRecord(error)) {
    return undefined;
  }
  return error.data;
};

/**
 * @param {ServerRequestLike | undefined} request - Original request.
 * @returns {string} Request path plus search params.
 */
const getRequestPath = (request) => {
  if (!request?.url) {
    return "";
  }
  try {
    const url = new URL(request.url);
    return `${url.pathname}${url.search}`;
  } catch {
    return request.url;
  }
};

/**
 * @param {string} path - Request path.
 * @returns {boolean} True when the path is scanner noise.
 */
const isScannerPath = (path) => scannerPathPatterns.some((pattern) => pattern.test(path));

/**
 * @param {unknown} value - Value to classify.
 * @returns {string} Stable value type label.
 */
const getValueType = (value) => {
  if (value === null) {
    return "null";
  }
  if (Array.isArray(value)) {
    return "array";
  }
  return typeof value;
};

/**
 * @param {string} value - String to truncate.
 * @returns {string} Bounded string.
 */
const truncate = (value) =>
  value.length > maxSerializedErrorLength
    ? `${value.slice(0, maxSerializedErrorLength)}...`
    : value;

/**
 * @param {unknown} value - Value to serialize.
 * @returns {string | undefined} Bounded serialized value.
 */
const serializeUnknown = (value) => {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value === "string") {
    return truncate(value);
  }
  if (typeof value === "number" || typeof value === "boolean" || value === null) {
    return String(value);
  }
  try {
    return truncate(JSON.stringify(value));
  } catch {
    return Object.prototype.toString.call(value);
  }
};

/**
 * @param {unknown} data - Route error data.
 * @returns {string | undefined} Human-readable route error data message.
 */
const getDataMessage = (data) => {
  if (typeof data === "string") {
    return data;
  }
  if (isRecord(data) && typeof data.message === "string") {
    return data.message;
  }
  return undefined;
};

/**
 * @param {unknown} error - Thrown server value.
 * @returns {string} Stable source type for the original thrown value.
 */
const getOriginalErrorType = (error) => {
  if (error instanceof Error) {
    return error.name;
  }
  if (error instanceof Response) {
    return "Response";
  }
  if (isRecord(error) && typeof error.constructor.name === "string") {
    return error.constructor.name;
  }
  return getValueType(error);
};

/**
 * Convert any server-side thrown value into a useful Error plus structured PostHog properties.
 *
 * @param {unknown} error - React Router server error.
 * @param {ServerRequestLike | undefined} request - Original request.
 * @returns {ServerExceptionNormalization} Normalized error and structured PostHog properties.
 */
export const normalizeServerException = (error, request) => {
  const status = getRouteErrorStatus(error);
  const statusText = getRouteErrorStatusText(error);
  const data = getRouteErrorData(error);
  const dataMessage = getDataMessage(data);
  const requestPath = getRequestPath(request);
  const originalErrorType = getOriginalErrorType(error);

  const normalizedError =
    error instanceof Error
      ? error
      : new Error(
          status
            ? `Route error ${status}${statusText ? ` ${statusText}` : ""}${
                dataMessage ? `: ${dataMessage}` : ""
              }`
            : (serializeUnknown(error) ?? "Unknown non-Error thrown"),
        );

  return {
    error: normalizedError,
    properties: {
      original_error_type: originalErrorType,
      ...(status ? { status } : {}),
      ...(statusText ? { status_text: statusText } : {}),
      ...(requestPath ? { request_path: requestPath } : {}),
      ...(data !== undefined
        ? { error_data: serializeUnknown(data) ?? "", error_data_type: getValueType(data) }
        : {}),
    },
  };
};

/**
 * @param {string} cookieHeader - Raw Cookie header value.
 * @returns {CookiePair[]} Parsed cookie name/value pairs.
 */
const parseCookieHeader = (cookieHeader) => {
  if (!cookieHeader) {
    return [];
  }
  return cookieHeader
    .split(";")
    .map((cookie) => {
      const separatorIndex = cookie.indexOf("=");
      if (separatorIndex === -1) {
        return null;
      }
      return {
        name: cookie.slice(0, separatorIndex).trim(),
        value: cookie.slice(separatorIndex + 1).trim(),
      };
    })
    .filter((cookie) => cookie !== null);
};

/**
 * Resolve a stable PostHog distinct ID for server-side exception capture when possible.
 *
 * @param {ServerRequestLike | undefined} request - Original request.
 * @returns {string} Distinct ID for posthog-node.
 */
export const getServerExceptionDistinctId = (request) => {
  const requestAuthUserId =
    isRecord(request) &&
    isRecord(request.auth) &&
    typeof request.auth.userId === "string" &&
    request.auth.userId;
  if (requestAuthUserId) {
    return requestAuthUserId;
  }

  const cookies = parseCookieHeader(request?.headers?.get("cookie") ?? "");
  const posthogCookie = cookies.find(
    (cookie) => cookie.name.startsWith("ph_") && cookie.name.endsWith("_posthog"),
  );
  if (posthogCookie) {
    try {
      /** @type {unknown} */
      const parsed = JSON.parse(decodeURIComponent(posthogCookie.value));
      if (!isRecord(parsed)) {
        return "server-anonymous";
      }
      if (typeof parsed.distinct_id === "string") {
        return parsed.distinct_id;
      }
      if (typeof parsed.$device_id === "string") {
        return parsed.$device_id;
      }
    } catch {
      // Fall through to the shared anonymous server identity.
    }
  }

  return "server-anonymous";
};
