import { useAuth } from "@clerk/react-router";
import { Sparkles } from "lucide-react";
import { useCallback } from "react";
import { toast } from "sonner";

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
  const { createCheckout, isActionLoading, isEnabled, isLoading, isPro } = useSubscription();

  const handleUpgrade = useCallback(async () => {
    if (!isSignedIn) {
      toast.error("Please sign in to upgrade");
      return;
    }

    const result = await createCheckout();

    if (result.error) {
      toast.error(result.error);
      return;
    }

    if (result.url) {
      // Redirect to Stripe Checkout
      window.location.href = result.url;
    } else {
      toast.error("An unexpected error occurred. Please try again.");
    }
  }, [isSignedIn, createCheckout]);

  // Don't show if Stripe is disabled, already Pro, or still loading.
  // Hiding while loading prevents the upgrade button from flashing
  // to signed-in Pro users before their subscription status resolves.
  if (!isEnabled || isPro || isLoading) {
    return null;
  }

  return (
    <Button
      className={className}
      disabled={isActionLoading || !isSignedIn}
      onClick={() => void handleUpgrade()}
      size={size}
    >
      <Sparkles className="size-4" />
      {text}
    </Button>
  );
};
