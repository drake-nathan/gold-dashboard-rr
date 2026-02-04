import { Loader2, Settings } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useManagePortal } from "@/hooks/use-manage-portal";

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
  const { handleManagePortal, isActionLoading, isEnabled, isPro } =
    useManagePortal();

  // Only show for Pro users when Stripe is enabled
  if (!isEnabled || !isPro) {
    return null;
  }

  return (
    <Button
      className={className}
      disabled={isActionLoading}
      onClick={() => void handleManagePortal()}
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
