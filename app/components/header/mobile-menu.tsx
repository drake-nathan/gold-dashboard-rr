import { SignedIn, SignedOut, useClerk, UserButton } from "@clerk/react-router";
import { api } from "convex/_generated/api";
import { useQuery } from "convex/react";
import {
  CreditCard,
  Crown,
  LogIn,
  Menu,
  Settings,
  UserPlus,
} from "lucide-react";
import { Link } from "react-router";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useManagePortal } from "@/hooks/use-manage-portal";
import { cn } from "@/lib/cn";

import { SubscriptionPageContent } from "./subscription-page-content";
import { ThemeMenuItems } from "./theme-toggle";

export const MobileMenu = () => {
  const { openSignIn, openSignUp } = useClerk();
  const { handleManagePortal, isLoading, isPro } = useManagePortal();

  // Only show Pro indicators when we've confirmed subscription status
  const showProRing = !isLoading && isPro;

  // Check if current user is admin
  const adminCheck = useQuery(api.admin.checkIsAdmin);
  const isAdmin = adminCheck?.isAdmin ?? false;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button aria-label="Open menu" size="icon" variant="ghost">
          <Menu className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {/* Theme Options */}
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          Theme
        </DropdownMenuLabel>
        <ThemeMenuItems />

        {/* Admin Link */}
        {isAdmin ?
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/admin">
                <Settings className="mr-2 h-4 w-4" />
                Admin
              </Link>
            </DropdownMenuItem>
          </>
        : null}

        {/* Auth Section */}
        <DropdownMenuSeparator />
        <SignedOut>
          <DropdownMenuItem
            onClick={() => {
              openSignIn();
            }}
          >
            <LogIn className="mr-2 h-4 w-4" />
            Sign In
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              openSignUp();
            }}
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Sign Up
          </DropdownMenuItem>
        </SignedOut>
        <SignedIn>
          <div className="flex items-center gap-2 px-2 py-1.5">
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
                    avatarBox: "size-[28px]",
                    userButtonTrigger: "rounded-full focus:shadow-none",
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
            <span className="text-sm">
              Account
              {showProRing ?
                <span className="ml-1 text-amber-500">Pro</span>
              : null}
            </span>
          </div>
        </SignedIn>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
