import { Crown } from "lucide-react";

import { useSubscription } from "@/hooks/use-subscription";
import { cn } from "@/lib/cn";

interface SubscriptionBadgeProps {
  className?: string;
  /**
   * Whether to show the badge even for non-Pro users (as "Free")
   */
  showFree?: boolean;
}

/**
 * Badge showing the user's subscription tier.
 * Shows "Pro" with a crown icon for subscribers.
 */
export const SubscriptionBadge = ({
  className,
  showFree = false,
}: SubscriptionBadgeProps) => {
  const { isLoading, isPro, subscription } = useSubscription();

  if (isLoading) {
    return null;
  }

  if (isPro) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400",
          className,
        )}
      >
        <Crown className="size-3" />
        Pro
      </span>
    );
  }

  if (showFree && subscription.status !== "anonymous") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground",
          className,
        )}
      >
        Free
      </span>
    );
  }

  return null;
};
