import { SignedIn, SignedOut, useClerk, UserButton } from "@clerk/react-router";
import { api } from "convex/_generated/api";
import { useQuery } from "convex/react";
import { Coffee, LogIn, Menu, Settings, UserPlus } from "lucide-react";
import { usePostHog } from "posthog-js/react";
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

import { ThemeMenuItems } from "./theme-toggle";

export const MobileMenu = () => {
  const { openSignIn, openSignUp } = useClerk();
  const posthog = usePostHog();

  const trackCoffeeClick = () => {
    posthog.capture("buy_me_a_coffee_clicked", { location: "mobile_menu" });
  };

  // Check if current user is admin
  const adminCheck = useQuery(api.admin.checkIsAdmin);
  const isAdmin = adminCheck?.isAdmin ?? false;

  // Hide auth UI in production until subscription feature is ready
  const isAuthEnabled =
    import.meta.env.DEV || import.meta.env.VITE_ENABLE_AUTH === "true";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button aria-label="Open menu" size="icon" variant="ghost">
          <Menu className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {/* Theme Options */}
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          Theme
        </DropdownMenuLabel>
        <ThemeMenuItems />

        {/* Buy Me a Coffee */}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <a
            className="text-yellow-600 dark:text-yellow-400"
            href="https://buymeacoffee.com/thenathandrake"
            onClick={trackCoffeeClick}
            rel="noopener noreferrer"
            target="_blank"
          >
            <Coffee className="mr-2 h-4 w-4" />
            Buy Me a Coffee
          </a>
        </DropdownMenuItem>

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
        {isAuthEnabled ?
          <>
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
                <UserButton />
                <span className="text-sm">Account</span>
              </div>
            </SignedIn>
          </>
        : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
