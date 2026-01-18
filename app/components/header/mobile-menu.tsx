import { SignedIn, SignedOut, useClerk, UserButton } from "@clerk/react-router";
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

interface MobileMenuProps {
  isAdmin: boolean;
}

export const MobileMenu = ({ isAdmin }: MobileMenuProps) => {
  const { openSignIn, openSignUp } = useClerk();
  const posthog = usePostHog();

  const trackCoffeeClick = () => {
    posthog.capture("buy_me_a_coffee_clicked", { location: "mobile_menu" });
  };

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
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
