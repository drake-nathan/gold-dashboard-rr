import { PostHog } from "posthog-node";

import { resolveAppRelease, resolveObservabilityEnvironment } from "./observability-config";

let cachedClient: null | PostHog = null;

const buildClient = (): null | PostHog => {
  const apiKey = process.env.VITE_PUBLIC_POSTHOG_KEY;
  const host = process.env.VITE_PUBLIC_POSTHOG_HOST;
  if (!apiKey || !host) {
    return null;
  }

  const environment = resolveObservabilityEnvironment(
    process.env.VITE_APP_ENVIRONMENT,
    process.env.NODE_ENV,
  );
  const release = resolveAppRelease(
    process.env.VITE_APP_RELEASE,
    process.env.RAILWAY_GIT_COMMIT_SHA,
  );

  const client = new PostHog(apiKey, {
    flushAt: 1,
    flushInterval: 0,
    host,
  });

  void client.register({
    environment,
    ...(release ? { release } : {}),
  });

  return client;
};

/**
 * Lazily-built PostHog Node singleton for server-side error capture.
 *
 * Returns null when PostHog is not configured (env vars missing). Callers should
 * tolerate the null and skip capture rather than throw.
 */
export const getPostHogServer = (): null | PostHog => {
  if (cachedClient) {
    return cachedClient;
  }
  cachedClient = buildClient();
  return cachedClient;
};
