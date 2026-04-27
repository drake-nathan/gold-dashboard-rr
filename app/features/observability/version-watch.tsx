import { useEffect, useRef } from "react";

import { resolveAppRelease } from "@/lib/observability-config";

const VERSION_ENDPOINT = "/version";

/**
 * How often to poll `/version` while the app is mounted. Long-lived dashboard
 * tabs are the failure mode we're guarding against, so a coarse interval is
 * fine — we don't need sub-minute precision.
 */
const POLL_INTERVAL_MS = 15 * 60 * 1000;

/**
 * Minimum hidden duration before a `visibilitychange` -> visible transition is
 * treated as "the user is coming back to a stale tab." Avoids reloading when a
 * user briefly tabs away and back during active interaction.
 */
const MIN_HIDDEN_MS_BEFORE_RELOAD = 30 * 1000;

const fetchServerRelease = async (): Promise<null | string> => {
  try {
    const response = await fetch(VERSION_ENDPOINT, {
      cache: "no-store",
      credentials: "omit",
    });
    if (!response.ok) {
      return null;
    }
    const text = (await response.text()).trim();
    return text.length === 0 ? null : text;
  } catch {
    // Offline, blocked, or transient network failure — try again on the next tick.
    return null;
  }
};

/**
 * Background guard against long-lived stale tabs.
 *
 * Compares the build-time `VITE_APP_RELEASE` baked into this bundle against
 * the running server's release. On mismatch:
 * - if the user just returned to the tab after >= 30s away, reload immediately
 * - if the periodic check fires while the tab is hidden, reload in the
 *   background so the user lands on the new build next time they look
 * - if the periodic check fires while the tab is visible, leave it alone to
 *   avoid interrupting an active session (the next visibility round-trip or
 *   the next interval-while-hidden will catch it)
 *
 * No-ops when no release is baked in (typically local dev).
 */
export const VersionWatch = () => {
  const clientRelease = resolveAppRelease(import.meta.env.VITE_APP_RELEASE);
  const lastHiddenAtRef = useRef<null | number>(null);

  useEffect(() => {
    if (!clientRelease) {
      return undefined;
    }

    let cancelled = false;

    const reloadIfStale = async (mode: "interval" | "visibility") => {
      const serverRelease = await fetchServerRelease();
      if (cancelled || !serverRelease || serverRelease === clientRelease) {
        return;
      }

      if (mode === "visibility") {
        window.location.reload();
        return;
      }

      if (document.visibilityState === "hidden") {
        window.location.reload();
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        lastHiddenAtRef.current = Date.now();
        return;
      }

      const hiddenAt = lastHiddenAtRef.current;
      lastHiddenAtRef.current = null;
      if (hiddenAt !== null && Date.now() - hiddenAt >= MIN_HIDDEN_MS_BEFORE_RELOAD) {
        void reloadIfStale("visibility");
      }
    };

    const intervalId = setInterval(() => {
      void reloadIfStale("interval");
    }, POLL_INTERVAL_MS);

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [clientRelease]);

  return null;
};
