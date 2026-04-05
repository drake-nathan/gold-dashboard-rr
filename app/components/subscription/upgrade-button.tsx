import { useAuth } from "@clerk/react-router";
import { Sparkles } from "lucide-react";
import { useCallback, useState } from "react";
import { useLocation } from "react-router";
import { toast } from "sonner";

import { UpgradeDialog } from "@/components/subscription/upgrade-dialog";
import { Button } from "@/components/ui/button";
import { useSubscription } from "@/features/subscription/hooks/use-subscription";

interface UpgradeButtonProps {
  className?: string;
  /**
   * Size variant for the button
   */
  size?: "default" | "lg" | "sm";
  /**
   * Text to display on the button
   */
  text?: string;
}

/**
 * Button to upgrade to Pro subscription.
 * Handles checkout flow and redirects to Stripe.
 */
export const UpgradeButton = ({
  className,
  size = "default",
  text = "Upgrade to Pro",
}: UpgradeButtonProps) => {
  const { isSignedIn } = useAuth();
  const location = useLocation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { createCheckout, isActionLoading, isEnabled, isLoading, isPro } = useSubscription();

  const handleCheckout = useCallback(async () => {
    if (!isSignedIn) {
      toast.error("Please sign in to upgrade");
      return;
    }

    try {
      const result = await createCheckout(`${location.pathname}${location.search}${location.hash}`);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      if (result.url) {
        window.location.assign(result.url);
      } else {
        toast.error("An unexpected error occurred. Please try again.");
      }
    } catch {
      toast.error("Failed to start checkout. Please try again.");
    }
  }, [createCheckout, isSignedIn, location.hash, location.pathname, location.search]);

  const handleUpgradeClick = useCallback(() => {
    if (!isSignedIn) {
      toast.error("Please sign in to upgrade");
      return;
    }

    setIsDialogOpen(true);
  }, [isSignedIn]);

  // Don't show the button if Stripe is disabled, already Pro, or still loading.
  // Hiding while loading prevents the upgrade button from flashing
  // to signed-in Pro users before their subscription status resolves.
  // The dialog renders unconditionally so its exit animation can't be
  // interrupted by a Convex subscription re-render that unmounts the tree.
  const showButton = isEnabled && !isPro && !isLoading;

  return (
    <>
      {showButton && (
        <Button
          className={className}
          disabled={isActionLoading || !isSignedIn}
          onClick={handleUpgradeClick}
          size={size}
        >
          <Sparkles className="size-4" />
          {text}
        </Button>
      )}
      <UpgradeDialog
        isLoading={isActionLoading}
        onConfirm={() => {
          void handleCheckout();
        }}
        onOpenChange={setIsDialogOpen}
        open={isDialogOpen}
      />
    </>
  );
};
