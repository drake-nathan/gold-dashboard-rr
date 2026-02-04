import { SignedIn, SignedOut, useClerk, UserButton } from "@clerk/react-router";
import { api } from "convex/_generated/api";
import { useQuery } from "convex/react";
import { CreditCard, Crown, Settings } from "lucide-react";
import { useCallback } from "react";
import { Link } from "react-router";
import { toast } from "sonner";

import { UpgradeButton } from "@/components/subscription";
import { Button } from "@/components/ui/button";
import { useSubscription } from "@/hooks/use-subscription";
import { cn } from "@/lib/cn";

import { SubscriptionPageContent } from "./subscription-page-content";

export const AuthButtons = () => {
  const { openSignIn, openSignUp } = useClerk();
  const { isLoading, isPro, openPortal } = useSubscription();

  // Only show Pro ring when we've confirmed subscription status (not during loading)
  const showProRing = !isLoading && isPro;

  // Check if current user is admin
  const adminCheck = useQuery(api.admin.checkIsAdmin);
  const isAdmin = adminCheck?.isAdmin ?? false;

  const handleManageSubscription = useCallback(async () => {
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
  }, [openPortal]);

  return (
    <>
      <SignedOut>
        <Button
          onClick={() => {
            openSignIn();
          }}
          size="sm"
          variant="ghost"
        >
          Sign In
        </Button>
        <Button
          onClick={() => {
            openSignUp();
          }}
          size="sm"
          variant="default"
        >
          Sign Up
        </Button>
      </SignedOut>
      <SignedIn>
        {isAdmin ?
          <Button asChild size="sm" variant="ghost">
            <Link to="/admin">
              <Settings className="h-4 w-4" />
              <span className="ml-1.5">Admin</span>
            </Link>
          </Button>
        : null}
        <UpgradeButton size="sm" />
        {/* Wrapper for Pro ring indicator - only show after subscription loads */}
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
                avatarBox: "size-[32px]", // 36px total with 2px ring
                userButtonTrigger:
                  "rounded-full focus:shadow-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              },
            }}
          >
            {/* Show "Manage Subscription" menu item for Pro users */}
            {isPro ?
              <UserButton.MenuItems>
                <UserButton.Action
                  label="Manage subscription"
                  labelIcon={<CreditCard className="size-4" />}
                  onClick={() => void handleManageSubscription()}
                />
              </UserButton.MenuItems>
            : null}
            {/* Custom user profile page for subscription info */}
            <UserButton.UserProfilePage
              label="Subscription"
              labelIcon={<Crown className="size-4" />}
              url="subscription"
            >
              <SubscriptionPageContent />
            </UserButton.UserProfilePage>
          </UserButton>
        </div>
      </SignedIn>
    </>
  );
};
