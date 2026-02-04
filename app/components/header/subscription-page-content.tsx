import { Crown, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useSubscription } from "@/hooks/use-subscription";

/**
 * Content for the Subscription page in Clerk's UserProfile modal.
 * Needs to be a separate component to use hooks.
 */
export const SubscriptionPageContent = () => {
  const { isActionLoading, isPro, openPortal, subscription } =
    useSubscription();

  const handleManageClick = async () => {
    const result = await openPortal();
    if (result.error) {
      toast.error(result.error);
      return;
    }
    if (result.url) {
      window.location.href = result.url;
    } else {
      toast.error("An unexpected error occurred. Please try again.");
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <div>
        <h2 className="text-lg font-semibold">Subscription</h2>
        <p className="text-sm text-neutral-500">
          Manage your billing and subscription.
        </p>
      </div>

      <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-800">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">
              {isPro ? "Dashboard.Gold Pro" : "Free Plan"}
            </p>
            <p className="text-sm text-neutral-500">
              {isPro ?
                subscription.status === "trialing" ?
                  "Trial period"
                : "Active subscription"
              : "Upgrade for premium features"}
            </p>
          </div>
          {isPro ?
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-sm font-medium text-amber-600 dark:text-amber-400">
              <Crown className="size-3.5" />
              Pro
            </span>
          : null}
        </div>
      </div>

      {isPro ?
        <Button
          className="w-full"
          disabled={isActionLoading}
          onClick={() => void handleManageClick()}
          variant="outline"
        >
          {isActionLoading ?
            <Loader2 className="size-4 animate-spin" />
          : <ExternalLink className="size-4" />}
          Manage on Stripe
        </Button>
      : <p className="text-center text-sm text-neutral-500">
          Use the &quot;Upgrade to Pro&quot; button in the header to subscribe.
        </p>
      }
    </div>
  );
};
