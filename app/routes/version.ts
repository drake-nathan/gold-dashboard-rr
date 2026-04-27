import { resolveAppRelease } from "@/lib/observability-config";

/**
 * Resource route that returns the running server's release identifier as
 * `text/plain`. The client polls this to detect when its in-memory bundle is
 * older than the deployed code, so long-lived tabs can reload themselves.
 *
 * Returns an empty body when no release is configured (typically local dev),
 * which the client treats as "skip the check."
 */
export const loader = () => {
  const release =
    resolveAppRelease(process.env.VITE_APP_RELEASE, process.env.RAILWAY_GIT_COMMIT_SHA) ?? "";

  return new Response(release, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
};
