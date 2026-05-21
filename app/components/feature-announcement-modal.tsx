/**
 * Feature Announcement Modal
 *
 * One-shot announcement that paid alerts have launched. Two eligible
 * audiences:
 *
 *   1. Signed-in free users with paid features enabled — they can convert
 *      now via the Pro upgrade flow.
 *   2. Anonymous users on their second-or-later visit, when paid-features
 *      is rolled out — first-visit-only would be too aggressive, but a
 *      returning visitor is a stronger sign of intent.
 *
 * Not an evergreen marketing surface — the announcement window closes on
 * EXPIRATION_DATE regardless of dismissal.
 */

import { useAuth } from "@clerk/react-router";
import { BellRingIcon, MailIcon, SparklesIcon } from "lucide-react";
import { Link } from "react-router";
import { useIsClient } from "usehooks-ts";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSubscription } from "@/features/subscription/hooks/use-subscription";
import { FEATURE_FLAGS, useFeatureFlag } from "@/lib/feature-flags";

// localStorage keys
const DISMISSED_KEY = "announcement-alerts-launch-dismissed";
const VISIT_COUNT_KEY = "site-visit-count";
// sessionStorage key — ensures the visit counter increments at most once
// per browser session even if the module is re-imported (HMR, tab refresh
// would create a new session anyway).
const SESSION_COUNTED_KEY = "site-visit-session-counted";

// Anonymous visitors must have visited at least this many times before the
// modal is eligible to show. 2 = first return visit.
const MIN_VISITS_FOR_ANON_MODAL = 2;

// The announcement window closes on this date regardless of dismissal state.
const EXPIRATION_DATE = new Date("2026-07-01T00:00:00");

// Record this visit once per session at module load. Module-level (rather
// than useEffect) because the project policy is to avoid Effects for
// browser-API sync, and this is the natural shape: once on the client when
// the module first imports.
if (typeof window !== "undefined") {
  try {
    if (sessionStorage.getItem(SESSION_COUNTED_KEY) !== "true") {
      const previous = Number(localStorage.getItem(VISIT_COUNT_KEY) ?? "0");
      const next = Number.isFinite(previous) ? previous + 1 : 1;
      localStorage.setItem(VISIT_COUNT_KEY, String(next));
      sessionStorage.setItem(SESSION_COUNTED_KEY, "true");
    }
  } catch {
    // Storage may be unavailable (private mode, quota). The modal just
    // won't show for these users — acceptable degradation.
  }
}

const isDismissed = (): boolean => {
  try {
    return localStorage.getItem(DISMISSED_KEY) === "true";
  } catch {
    return false;
  }
};

const getVisitCount = (): number => {
  try {
    const raw = localStorage.getItem(VISIT_COUNT_KEY);
    const n = Number(raw ?? "0");
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
};

// Dev-only override: append `?preview-announcement=1` to any URL in a dev
// build to force the modal open, bypassing all gates (auth state, Pro
// status, visit count, expiration, dismissal). Gated on the dev MODE so it
// can never accidentally fire in a production build.
const isDevPreview = (): boolean => {
  if (import.meta.env.MODE !== "development") return false;
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("preview-announcement") === "1";
};

export const FeatureAnnouncementModal = () => {
  const isClient = useIsClient();
  const { isLoaded: isAuthLoaded, isSignedIn } = useAuth();
  const { isEnabled, isLoading: isSubLoading, isPro } = useSubscription();
  const isPaidFeaturesOn = useFeatureFlag(FEATURE_FLAGS.PAID_FEATURES);

  // Signed-in free users on a paid-features-enabled env. isEnabled already
  // collapses (paid-features flag) AND (Stripe wired in env) into one signal.
  const isSignedInEligible = isAuthLoaded && isSignedIn && !isSubLoading && isEnabled && !isPro;

  // Anonymous return visitors. We don't gate on isEnabled because anonymous
  // users can't checkout from here anyway — the CTA routes them through
  // sign-in first. We do gate on the paid-features flag so the announcement
  // never appears before the feature is rolled out for them.
  const isAnonymousEligible =
    isAuthLoaded && !isSignedIn && isPaidFeaturesOn && getVisitCount() >= MIN_VISITS_FOR_ANON_MODAL;

  const shouldShow =
    isClient &&
    (isDevPreview() ||
      ((isSignedInEligible || isAnonymousEligible) &&
        new Date() < EXPIRATION_DATE &&
        !isDismissed()));

  const handleDismiss = () => {
    try {
      localStorage.setItem(DISMISSED_KEY, "true");
    } catch {
      // See above — degrade silently if storage is unavailable.
    }
  };

  if (!shouldShow) return null;

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open) handleDismiss();
      }}
      open
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <SparklesIcon className="h-5 w-5 text-yellow-500" />
            Alerts are live
          </DialogTitle>
          <DialogDescription className="text-base">
            Get notified the moment a Costco product hits the spread you&apos;re watching for.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex gap-3">
            <BellRingIcon className="mt-0.5 h-5 w-5 shrink-0 text-blue-500" />
            <div>
              <p className="font-medium">Price &amp; restock alerts</p>
              <p className="text-sm text-muted-foreground">
                Watch a specific product, a metal + weight category, or a markup threshold across
                all of Costco&apos;s gold and silver.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <MailIcon className="mt-0.5 h-5 w-5 shrink-0 text-green-500" />
            <div>
              <p className="font-medium">Batched email digests</p>
              <p className="text-sm text-muted-foreground">
                One clean email when something hits — no noise, no spam, unsubscribe anytime.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button asChild className="w-full" onClick={handleDismiss} size="lg">
            <Link to="/alerts">See Alerts</Link>
          </Button>
          <Button className="w-full" onClick={handleDismiss} size="lg" variant="ghost">
            Maybe Later
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
