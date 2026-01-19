/**
 * Feature Announcement Modal
 *
 * Announces the new account/sync feature to existing users.
 *
 * Display conditions:
 * - User has existing localStorage data (CREDIT_CARDS_STORAGE_KEY)
 * - User hasn't dismissed the modal before
 * - Current date is before expiration (Feb 1, 2026)
 * - User is not signed in
 */

import { useAuth, useClerk } from "@clerk/react-router";
import { CloudIcon, MonitorSmartphoneIcon, SparklesIcon } from "lucide-react";
import { useState } from "react";
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
import { CREDIT_CARDS_STORAGE_KEY } from "@/lib/credit-cards";

// localStorage key for tracking dismissal
const DISMISSED_KEY = "feature-announcement-dismissed";

// Expiration date: 2 weeks from Jan 18, 2026
const EXPIRATION_DATE = new Date("2026-02-01T00:00:00");

/**
 * Check if the modal should be shown (client-side only)
 */
const checkShouldShow = (isSignedIn: boolean): boolean => {
  // Don't show for signed-in users
  if (isSignedIn) return false;

  // Don't show after expiration date
  if (new Date() > EXPIRATION_DATE) return false;

  // Don't show if already dismissed
  if (localStorage.getItem(DISMISSED_KEY) === "true") return false;

  // Only show if user has existing localStorage data
  const existingData = localStorage.getItem(CREDIT_CARDS_STORAGE_KEY);
  if (!existingData) return false;

  return true;
};

export const FeatureAnnouncementModal = () => {
  const { openSignIn, openSignUp } = useClerk();
  const { isLoaded, isSignedIn } = useAuth();
  const isClient = useIsClient();
  const [isDismissed, setIsDismissed] = useState(false);

  // Derive whether to show from current state (no effect needed)
  const shouldShow =
    isClient &&
    isLoaded &&
    !isDismissed &&
    checkShouldShow(Boolean(isSignedIn));

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "true");
    setIsDismissed(true);
  };

  const handleSignUp = () => {
    handleDismiss();
    openSignUp();
  };

  const handleSignIn = () => {
    handleDismiss();
    openSignIn();
  };

  // Don't render anything if not showing
  if (!shouldShow) return null;

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open) handleDismiss();
      }}
      open={shouldShow}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <SparklesIcon className="h-5 w-5 text-yellow-500" />
            New: Sync Your Credit Cards
          </DialogTitle>
          <DialogDescription className="text-base">
            Your custom credit cards can now be saved to the cloud.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex gap-3">
            <CloudIcon className="mt-0.5 h-5 w-5 shrink-0 text-blue-500" />
            <div>
              <p className="font-medium">Keep your custom cards</p>
              <p className="text-sm text-muted-foreground">
                Create a free account and your existing credit cards—including
                any custom points values you&apos;ve set—will automatically
                migrate.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <MonitorSmartphoneIcon className="mt-0.5 h-5 w-5 shrink-0 text-green-500" />
            <div>
              <p className="font-medium">Access on any device</p>
              <p className="text-sm text-muted-foreground">
                Your cards and calculator settings stay in sync whether
                you&apos;re on your phone, tablet, or computer.
              </p>
            </div>
          </div>

          <div className="rounded-md bg-muted/50 p-3">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Coming soon:</span>{" "}
              Custom price alerts so you never miss a deal.
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button className="w-full" onClick={handleSignUp} size="lg">
            Create Free Account
          </Button>
          <Button
            className="w-full"
            onClick={handleSignIn}
            size="lg"
            variant="outline"
          >
            I Already Have an Account
          </Button>
          <Button
            className="w-full"
            onClick={handleDismiss}
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
