/**
 * Feature Announcement Modal
 *
 * Conversion CTA for the paid-alerts launch. Two audiences:
 *
 *   1. Signed-in free users with paid features enabled — primary CTA opens
 *      the global UpgradeDialog via `useUpgradeFlow`, surfacing price + Stripe
 *      checkout. Secondary CTA links to /alerts for the curious.
 *   2. Anonymous users on their 2nd-or-later visit, when paid-features is
 *      rolled out — primary CTA routes to /alerts, which is the public-facing
 *      pitch surface. We don't try to checkout from here; anonymous → signup
 *      → upgrade is a real flow that needs the /alerts page to do the work.
 *
 * Dismissal model: explicit dismissal (Maybe Later, CTA clicks) is permanent
 * via localStorage. Accidental closes (outside-click, Esc) are session-only —
 * an accidental tap shouldn't kill the pitch for the entire window. The
 * announcement window itself closes on EXPIRATION_DATE regardless.
 */

import { useAuth } from "@clerk/react-router";
import { BellRingIcon, MailIcon, SparklesIcon } from "lucide-react";
import { usePostHog } from "posthog-js/react";
import { type ComponentProps, useCallback, useEffect, useRef, useState } from "react";
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
import { useUpgradeFlow } from "@/features/subscription/use-upgrade-flow";
import { FEATURE_FLAGS, useFeatureFlag } from "@/lib/feature-flags";

const DISMISSED_KEY = "announcement-alerts-launch-dismissed";
const VISIT_COUNT_KEY = "site-visit-count";
const SESSION_COUNTED_KEY = "site-visit-session-counted";

const MIN_VISITS_FOR_ANON_MODAL = 2;
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

// Dev-only override. Append `?preview-announcement=...` to any URL in a dev
// build:
//   - `?preview-announcement=1`     bypasses eligibility gates but respects
//                                   dismissal so the dismiss button works
//                                   naturally.
//   - `?preview-announcement=fresh` same as `=1`, and also clears the
//                                   dismissed-flag on render. Re-preview
//                                   after dismissing.
// Append `&audience=anonymous` to preview the anonymous variant; default is
// the signed-in variant.
// Gated on dev MODE so it can never fire in production.
type DevPreviewMode = "fresh" | "off" | "on";

const getDevPreviewMode = (): DevPreviewMode => {
  if (import.meta.env.MODE !== "development") return "off";
  if (typeof window === "undefined") return "off";
  const value = new URLSearchParams(window.location.search).get("preview-announcement");
  if (value === "fresh") return "fresh";
  if (value === "1") return "on";
  return "off";
};

type Audience = "anonymous" | "signed_in_free";
type DismissMethod = "esc" | "maybe_later" | "outside_click";

export const FeatureAnnouncementModal = () => {
  const isClient = useIsClient();
  const { isLoaded: isAuthLoaded, isSignedIn } = useAuth();
  const { isEnabled, isLoading: isSubLoading, isPro } = useSubscription();
  const isPaidFeaturesOn = useFeatureFlag(FEATURE_FLAGS.PAID_FEATURES);
  const posthog = usePostHog();
  const { open: openUpgradeFlow } = useUpgradeFlow();

  const isSignedInEligible = isAuthLoaded && isSignedIn && !isSubLoading && isEnabled && !isPro;
  const isAnonymousEligible =
    isAuthLoaded && !isSignedIn && isPaidFeaturesOn && getVisitCount() >= MIN_VISITS_FOR_ANON_MODAL;

  const devPreview = getDevPreviewMode();
  const previewAudience: Audience =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("audience") === "anonymous"
      ? "anonymous"
      : "signed_in_free";

  const audience: Audience = isSignedInEligible
    ? "signed_in_free"
    : isAnonymousEligible
      ? "anonymous"
      : previewAudience;

  // In-memory mirror so dismissal visibly closes the modal even when we
  // don't persist (accidental close path) or before localStorage settles.
  const [hasDismissedInSession, setHasDismissedInSession] = useState(false);

  useEffect(() => {
    if (devPreview !== "fresh") return;
    try {
      localStorage.removeItem(DISMISSED_KEY);
    } catch {
      // ignore — preview is best-effort
    }
    setHasDismissedInSession(false);
  }, [devPreview]);

  const isPreviewing = devPreview !== "off";

  const shouldShow =
    isClient &&
    (isPreviewing || isSignedInEligible || isAnonymousEligible) &&
    new Date() < EXPIRATION_DATE &&
    !hasDismissedInSession &&
    !isDismissed();

  // Fire `announcement_modal_shown` once per mount when the modal becomes
  // visible. Ref guards against duplicate emissions across re-renders.
  const hasCapturedShown = useRef(false);
  useEffect(() => {
    if (!shouldShow || hasCapturedShown.current) return;
    hasCapturedShown.current = true;
    posthog.capture("announcement_modal_shown", { audience });
  }, [shouldShow, audience, posthog]);

  const persistDismissal = useCallback(() => {
    setHasDismissedInSession(true);
    try {
      localStorage.setItem(DISMISSED_KEY, "true");
    } catch {
      // Degrade silently if storage is unavailable.
    }
  }, []);

  const handleDismissExplicit = useCallback(
    (method: DismissMethod) => {
      posthog.capture("announcement_modal_dismissed", { audience, method });
      persistDismissal();
    },
    [audience, persistDismissal, posthog],
  );

  const handleDialogOpenChange: ComponentProps<typeof Dialog>["onOpenChange"] = (
    nextOpen,
    details,
  ) => {
    if (nextOpen) return;
    // Accidental closes (backdrop / Esc) only dismiss the current session —
    // the user gets the modal again on their next visit.
    if (details.reason === "outside-press") {
      posthog.capture("announcement_modal_dismissed", { audience, method: "outside_click" });
      setHasDismissedInSession(true);
      return;
    }
    if (details.reason === "escape-key") {
      posthog.capture("announcement_modal_dismissed", { audience, method: "esc" });
      setHasDismissedInSession(true);
      return;
    }
    // Programmatic closes (button clicks) handle their own dismissal logic
    // before flipping the dialog state, so we don't double-fire here.
    setHasDismissedInSession(true);
  };

  const handlePrimaryCta = () => {
    if (audience === "signed_in_free") {
      posthog.capture("announcement_modal_cta_clicked", { audience, cta: "upgrade" });
      persistDismissal();
      openUpgradeFlow("announcement_modal");
      return;
    }
    posthog.capture("announcement_modal_cta_clicked", { audience, cta: "get_alerts" });
    persistDismissal();
  };

  const handleSecondaryCta = () => {
    posthog.capture("announcement_modal_cta_clicked", { audience, cta: "see_alerts" });
    persistDismissal();
  };

  if (!shouldShow) return null;

  const isSignedInVariant = audience === "signed_in_free";

  return (
    <Dialog onOpenChange={handleDialogOpenChange} open>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <SparklesIcon className="h-5 w-5 text-yellow-500" />
            Never miss a Costco gold deal
          </DialogTitle>
          <DialogDescription className="text-base">
            Alerts are live. Get notified the moment a product hits the spread you&apos;re watching
            for.
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
          {isSignedInVariant ? (
            <Button className="w-full" onClick={handlePrimaryCta} size="lg">
              <SparklesIcon className="size-4" />
              Upgrade to Pro — $8/mo
            </Button>
          ) : (
            <Button asChild className="w-full" onClick={handlePrimaryCta} size="lg">
              <Link to="/alerts">Get Alerts</Link>
            </Button>
          )}
          {isSignedInVariant ? (
            <Button
              asChild
              className="w-full"
              onClick={handleSecondaryCta}
              size="lg"
              variant="ghost"
            >
              <Link to="/alerts">See Alerts</Link>
            </Button>
          ) : null}
          <Button
            className="w-full"
            onClick={() => {
              handleDismissExplicit("maybe_later");
            }}
            size="lg"
            variant="ghost"
          >
            Maybe Later
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
