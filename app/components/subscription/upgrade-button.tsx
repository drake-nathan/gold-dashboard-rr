import { useAuth } from "@clerk/react-router";
import { Loader2, Sparkles } from "lucide-react";
import { useCallback } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useSubscription } from "@/hooks/use-subscription";

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
  const { createCheckout, isActionLoading, isPro } = useSubscription();

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
    }
  }, [isSignedIn, createCheckout]);

  // Don't show if already Pro
  if (isPro) {
    return null;
  }

  return (
    <Button
      className={className}
      disabled={isActionLoading || !isSignedIn}
      onClick={() => void handleUpgrade()}
      size={size}
    >
      {isActionLoading ?
        <Loader2 className="animate-spin" />
      : <Sparkles className="size-4" />}
      {text}
    </Button>
  );
};
