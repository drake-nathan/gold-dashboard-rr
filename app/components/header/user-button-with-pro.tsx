import { UserButton } from "@clerk/react-router";
import { CreditCard, Crown } from "lucide-react";

import { useManagePortal } from "@/hooks/use-manage-portal";
import { cn } from "@/lib/cn";

import { SubscriptionPageContent } from "./subscription-page-content";

export const UserButtonWithPro = ({
  avatarSize = "size-[32px]",
}: {
  avatarSize?: string;
}) => {
  const { handleManagePortal, isLoading, isPro } = useManagePortal();
  const showProRing = !isLoading && isPro;

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full p-[2px] transition-all duration-300",
        showProRing &&
          "bg-linear-to-br from-yellow-400 via-amber-500 to-yellow-600",
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
        {isPro ?
          <UserButton.MenuItems>
            <UserButton.Action
              label="Manage subscription"
              labelIcon={<CreditCard className="size-4" />}
              onClick={() => void handleManagePortal()}
            />
          </UserButton.MenuItems>
        : null}
        <UserButton.UserProfilePage
          label="Subscription"
          labelIcon={<Crown className="size-4" />}
          url="subscription"
        >
          <SubscriptionPageContent />
        </UserButton.UserProfilePage>
      </UserButton>
    </div>
  );
};
