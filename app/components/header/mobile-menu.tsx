import { Show, useClerk } from "@clerk/react-router";
import { Bell, LogIn, Menu, UserPlus } from "lucide-react";
import { Link } from "react-router";

import { UpgradeButton } from "@/components/subscription/upgrade-button";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSubscription } from "@/features/subscription/hooks/use-subscription";

import { ThemeMenuItems } from "./theme-toggle";
import { UserButtonWithPro } from "./user-button-with-pro";

export const MobileMenu = () => {
  const { openSignIn, openSignUp } = useClerk();
  const { isPro } = useSubscription();

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

        {/* Auth Section */}
        <DropdownMenuSeparator />
        <Show when="signed-out">
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
        </Show>
        <Show when="signed-in">
          {import.meta.env.VITE_STRIPE_ENABLED === "true" ? (
            <DropdownMenuItem asChild>
              <Link to="/alerts">
                <Bell className="mr-2 h-4 w-4" />
                Alerts
              </Link>
            </DropdownMenuItem>
          ) : null}
          <div className="px-2 py-1.5">
            <UpgradeButton className="w-full justify-start" size="sm" />
          </div>
          <div className="flex items-center gap-2 px-2 py-1.5">
            <UserButtonWithPro avatarSize="size-[28px]" />
            <span className="text-sm">
              Account
              {isPro ? <span className="ml-1 text-amber-500">Pro</span> : null}
            </span>
          </div>
        </Show>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
