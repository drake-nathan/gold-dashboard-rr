/**
 * Feature Announcement Modal
 *
 * One-shot announcement to existing signed-in free users that paid alerts
 * have launched. Not an evergreen marketing surface — sets a fresh dismissal
 * key and an expiration date so it disappears once the announcement window
 * closes, even for users who never explicitly dismissed it.
 *
 * Display conditions:
 * - User is signed in
 * - paid-features PostHog flag is on for this user
 * - User is not already Pro
 * - User hasn't dismissed this announcement
 * - Current date is before EXPIRATION_DATE
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

// localStorage key for tracking dismissal of this specific announcement.
// Use a versioned key so previous announcements' dismissals don't suppress
// this one, and so a future announcement can ship with its own key.
const DISMISSED_KEY = "announcement-alerts-launch-dismissed";

// The announcement window closes on this date regardless of dismissal state.
const EXPIRATION_DATE = new Date("2026-07-01T00:00:00");

const isDismissed = (): boolean => localStorage.getItem(DISMISSED_KEY) === "true";

export const FeatureAnnouncementModal = () => {
  const isClient = useIsClient();
  const { isLoaded: isAuthLoaded, isSignedIn } = useAuth();
  const { isEnabled, isLoading: isSubLoading, isPro } = useSubscription();

  // Anonymous and Pro users never see this. isEnabled already collapses
  // (paid-features flag) AND (Stripe wired in env) into one signal.
  const isEligible = isClient && isAuthLoaded && isSignedIn && !isSubLoading && isEnabled && !isPro;

  const shouldShow = isEligible && new Date() < EXPIRATION_DATE && !isDismissed();

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "true");
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
