import { UserButton } from "@clerk/react-router";
import { CreditCard, Crown } from "lucide-react";

import { SubscriptionPageContent } from "@/components/subscription/subscription-page-content";
import { Skeleton } from "@/components/ui/skeleton";
import { useManagePortal } from "@/features/subscription/hooks/use-manage-portal";
import { cn } from "@/lib/cn";
import { FEATURE_FLAGS, useFeatureFlag } from "@/lib/feature-flags";

/** Skeleton sizes account for the avatar + 2px border on each side (p-[2px] wrapper) */
const SKELETON_SIZES: Record<string, string> = {
  "size-[28px]": "size-[32px]",
  "size-[32px]": "size-[36px]",
};

export const UserButtonWithPro = ({ avatarSize = "size-[32px]" }: { avatarSize?: string }) => {
  const { handleManagePortal, isLoading, isPro } = useManagePortal();
  const alertsEnabled = useFeatureFlag(FEATURE_FLAGS.ALERTS_BETA);
  const showProRing = !isLoading && isPro;

  // While subscription status is loading, show a skeleton circle matching
  // the avatar size. This prevents the upgrade button flash and avoids
  // showing an un-ringed avatar that pops into a pro ring.
  if (isLoading) {
    return <Skeleton className={cn("rounded-full", SKELETON_SIZES[avatarSize] ?? avatarSize)} />;
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full p-[2px] transition-all duration-300",
        showProRing && "bg-linear-to-br from-yellow-400 via-amber-500 to-yellow-600",
      )}
    >
      <UserButton
        appearance={{
          elements: {
            avatarBox: avatarSize,
            userButtonTrigger:
              "rounded-full focus:shadow-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          },
        }}
      >
        {isPro ? (
          <UserButton.MenuItems>
            <UserButton.Action
              label="Manage subscription"
              labelIcon={<CreditCard className="size-4" />}
              onClick={() => void handleManagePortal()}
            />
          </UserButton.MenuItems>
        ) : null}
        {alertsEnabled ? (
          <UserButton.UserProfilePage
            label="Subscription"
            labelIcon={<Crown className="size-4" />}
            url="subscription"
          >
            <SubscriptionPageContent />
          </UserButton.UserProfilePage>
        ) : null}
      </UserButton>
    </div>
  );
};
