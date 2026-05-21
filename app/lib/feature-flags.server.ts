import {
  ALL_FEATURE_FLAGS,
  FEATURE_FLAG_DEFAULTS,
  type FeatureFlagKey,
  type FeatureFlagValues,
} from "./feature-flags";
import { getPostHogServer } from "./posthog-server";

const buildDefaults = (): FeatureFlagValues => ({ ...FEATURE_FLAG_DEFAULTS });

/**
 * Read PostHog's own distinct_id from the request cookie, if present.
 *
 * The browser SDK stores it as JSON in `ph_<api_key>_posthog`. Reading it
 * server-side lets a returning anonymous visitor get the same flag values
 * during SSR that they'd get client-side, which keeps percentage-based
 * rollouts stable across requests instead of re-rolling per page load.
 *
 * Returns null if no PostHog cookie is set (true first-time visit) or the
 * cookie shape isn't what we expect.
 */
const readPostHogCookieDistinctId = (request: Request): null | string => {
  const apiKey = process.env.VITE_PUBLIC_POSTHOG_KEY;
  if (!apiKey) return null;

  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return null;

  const cookieName = `ph_${apiKey}_posthog`;
  const match = cookieHeader.split(/;\s*/u).find((pair) => pair.startsWith(`${cookieName}=`));
  if (!match) return null;

  try {
    const raw = decodeURIComponent(match.slice(cookieName.length + 1));
    const parsed: unknown = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === "object" &&
      "distinct_id" in parsed &&
      typeof (parsed as { distinct_id: unknown }).distinct_id === "string"
    ) {
      return (parsed as { distinct_id: string }).distinct_id;
    }
  } catch {
    // Cookie present but unparseable — treat as first visit.
  }
  return null;
};

/**
 * Evaluate all known feature flags for the current request.
 *
 * Identity precedence:
 *   1. Authenticated user (Clerk userId) — most stable, lasts across devices.
 *   2. PostHog cookie distinct_id — stable for a returning anonymous visitor
 *      on the same browser; keeps SSR aligned with client-side eval.
 *   3. Per-request UUID — first-time visitor with no PostHog cookie yet.
 *      Percentage assignment isn't stable across requests in this case, but
 *      they have no client-side state to be inconsistent *with* either; the
 *      first response they get becomes their bootstrap value.
 *
 * Without (2) and (3) — the old `if (!distinctId) return defaults` path —
 * anonymous users saw flags as `false` on first paint regardless of rollout,
 * causing flag-gated UI to flash in only after PostHog hydrated client-side.
 */
export const evaluateFeatureFlags = async (
  distinctId: null | string,
  request?: Request,
): Promise<FeatureFlagValues> => {
  const posthog = getPostHogServer();
  if (!posthog) {
    return buildDefaults();
  }

  const effectiveDistinctId =
    distinctId ??
    (request ? readPostHogCookieDistinctId(request) : null) ??
    (typeof crypto !== "undefined" && "randomUUID" in crypto
      ? `anon_${crypto.randomUUID()}`
      : `anon_${Date.now()}_${Math.random().toString(36).slice(2)}`);

  try {
    const flags = await posthog.evaluateFlags(effectiveDistinctId, {
      flagKeys: [...ALL_FEATURE_FLAGS],
    });
    const entries = ALL_FEATURE_FLAGS.map((key): [FeatureFlagKey, boolean | string] => {
      const value = flags.getFlag(key);
      if (value === undefined) {
        return [key, FEATURE_FLAG_DEFAULTS[key]];
      }
      return [key, value];
    });
    return Object.fromEntries(entries);
  } catch (error) {
    // Silent fallback would hide real PostHog outages — log so this surfaces
    // in server logs and PostHog's server-side error capture (entry.server.tsx
    // wires up captureException via the global handler).
    console.error("Feature flag evaluation failed; falling back to defaults", error);
    return buildDefaults();
  }
};
