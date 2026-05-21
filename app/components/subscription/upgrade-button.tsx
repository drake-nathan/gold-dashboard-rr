import { useAuth } from "@clerk/react-router";
import { Sparkles } from "lucide-react";
import { useCallback } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useSubscription } from "@/features/subscription/hooks/use-subscription";
import { type UpgradeFlowSource, useUpgradeFlow } from "@/features/subscription/use-upgrade-flow";

interface UpgradeButtonProps {
  className?: string;
  size?: "default" | "lg" | "sm";
  /**
   * Attribution for `upgrade_dialog_opened`. Defaults to `header` since that's
   * where this button has historically lived; callers in new surfaces should
   * pass their own source so the PostHog funnel attributes correctly.
   */
  source?: UpgradeFlowSource;
  text?: string;
}

export const UpgradeButton = ({
  className,
  size = "default",
  source = "header",
  text = "Upgrade to Pro",
}: UpgradeButtonProps) => {
  const { isSignedIn } = useAuth();
  const { isActionLoading, isEnabled, isLoading, isPro } = useSubscription();
  const { open } = useUpgradeFlow();

  const handleClick = useCallback(() => {
    if (!isSignedIn) {
      toast.error("Please sign in to upgrade");
      return;
    }
    open(source);
  }, [isSignedIn, open, source]);

  // Hide while loading to prevent flashing the upgrade button to Pro users
  // before their subscription status resolves.
  if (!isEnabled || isPro || isLoading) {
    return null;
  }

  return (
    <Button
      className={className}
      disabled={isActionLoading || !isSignedIn}
      onClick={handleClick}
      size={size}
    >
      <Sparkles className="size-4" />
      {text}
    </Button>
  );
};
