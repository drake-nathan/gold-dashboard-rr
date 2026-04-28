import {
  ALL_FEATURE_FLAGS,
  FEATURE_FLAG_DEFAULTS,
  type FeatureFlagKey,
  type FeatureFlagValues,
} from "./feature-flags";
import { getPostHogServer } from "./posthog-server";

const buildDefaults = (): FeatureFlagValues => ({ ...FEATURE_FLAG_DEFAULTS });

/**
 * Evaluate all known feature flags for the given distinct ID server-side.
 *
 * Returns the configured defaults when PostHog is unavailable or the user is
 * anonymous. The result is intended to be passed to the PostHog client as
 * bootstrap data and to a FeatureFlagProvider for SSR-safe reads.
 */
export const evaluateFeatureFlags = async (
  distinctId: null | string,
): Promise<FeatureFlagValues> => {
  if (!distinctId) {
    return buildDefaults();
  }

  const posthog = getPostHogServer();
  if (!posthog) {
    return buildDefaults();
  }

  try {
    const entries = await Promise.all(
      ALL_FEATURE_FLAGS.map(async (key): Promise<[FeatureFlagKey, boolean | string]> => {
        const value = await posthog.getFeatureFlag(key, distinctId);
        if (value === undefined) {
          return [key, FEATURE_FLAG_DEFAULTS[key]];
        }
        return [key, value];
      }),
    );
    return Object.fromEntries(entries);
  } catch (error) {
    // Silent fallback would hide real PostHog outages — log so this surfaces
    // in server logs and PostHog's server-side error capture (entry.server.tsx
    // wires up captureException via the global handler).
    console.error("Feature flag evaluation failed; falling back to defaults", error);
    return buildDefaults();
  }
};
