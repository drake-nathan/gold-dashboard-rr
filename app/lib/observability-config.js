/**
 * Normalize the app environment value so observability tools share the same vocabulary.
 *
 * @param {null | string | undefined} explicitValue - Preferred environment value.
 * @param {null | string | undefined} fallbackValue - Fallback environment value.
 * @returns {string} Canonical environment name.
 */
export const resolveObservabilityEnvironment = (explicitValue, fallbackValue) => {
  const candidate = [explicitValue, fallbackValue]
    .find((value) => typeof value === "string" && value.trim().length > 0)
    ?.trim()
    .toLowerCase();

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
 * Return the first non-empty release identifier.
 *
 * @param {...(null | string | undefined)} values - Candidate release identifiers.
 * @returns {null | string} Release identifier when present.
 */
export const resolveAppRelease = (...values) => {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return null;
};
