/**
 * PostHog server-side capture for Convex actions.
 *
 * Convex http/internal actions run in the V8 runtime, so we can't rely on
 * the `posthog-node` SDK. Instead we POST directly to PostHog's `/capture/`
 * endpoint with `fetch`.
 *
 * Identity: pass the same Clerk userId that the client uses as the PostHog
 * `distinct_id` so server-side events land on the same person as the
 * client-side modal/checkout events.
 *
 * Failure mode: capture is best-effort. Errors are swallowed — a webhook
 * must not fail because analytics is down.
 */

const POSTHOG_API_KEY = process.env.VITE_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = process.env.VITE_PUBLIC_POSTHOG_HOST;
const APP_ENVIRONMENT = process.env.VITE_APP_ENVIRONMENT ?? process.env.NODE_ENV ?? "unknown";
const APP_RELEASE = process.env.VITE_APP_RELEASE ?? process.env.RAILWAY_GIT_COMMIT_SHA;

interface CaptureArgs {
  distinctId: string;
  event: string;
  properties?: Record<string, unknown>;
}

export const captureServerEvent = async ({
  distinctId,
  event,
  properties,
}: CaptureArgs): Promise<void> => {
  if (!POSTHOG_API_KEY || !POSTHOG_HOST) {
    return;
  }

  try {
    const response = await fetch(`${POSTHOG_HOST}/capture/`, {
      body: JSON.stringify({
        api_key: POSTHOG_API_KEY,
        distinct_id: distinctId,
        event,
        properties: {
          $lib: "convex-server",
          environment: APP_ENVIRONMENT,
          ...(APP_RELEASE ? { release: APP_RELEASE } : {}),
          ...properties,
        },
        timestamp: new Date().toISOString(),
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    if (!response.ok) {
      console.warn(
        `[posthog] capture failed: ${response.status} ${response.statusText} for event ${event}`,
      );
    }
  } catch (error) {
    console.warn(`[posthog] capture threw for event ${event}:`, error);
  }
};
