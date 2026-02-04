import { Loader2, Settings } from "lucide-react";
import { useCallback } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useSubscription } from "@/hooks/use-subscription";

interface ManageSubscriptionButtonProps {
  className?: string;
  /**
   * Size variant for the button
   */
  size?: "default" | "lg" | "sm";
  /**
   * Text to display on the button
   */
  text?: string;
  /**
   * Button variant
   */
  variant?: "default" | "ghost" | "link" | "outline" | "secondary";
}

/**
 * Button to open Stripe Customer Portal for managing subscription.
 * Only visible for Pro users.
 */
export const ManageSubscriptionButton = ({
  className,
  size = "default",
  text = "Manage Subscription",
  variant = "outline",
}: ManageSubscriptionButtonProps) => {
  const { isActionLoading, isEnabled, isPro, openPortal } = useSubscription();

  const handleManage = useCallback(async () => {
    const result = await openPortal();

    if (result.error) {
      toast.error(result.error);
      return;
    }

    if (result.url) {
      // Redirect to Stripe Portal
      window.location.href = result.url;
    } else {
      toast.error("An unexpected error occurred. Please try again.");
    }
  }, [openPortal]);

  // Only show for Pro users when Stripe is enabled
  if (!isEnabled || !isPro) {
    return null;
  }

  return (
    <Button
      className={className}
      disabled={isActionLoading}
      onClick={() => void handleManage()}
      size={size}
      variant={variant}
    >
      {isActionLoading ?
        <Loader2 className="animate-spin" />
      : <Settings className="size-4" />}
      {text}
    </Button>
  );
};
