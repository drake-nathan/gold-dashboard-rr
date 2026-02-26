import { SignedIn, SignedOut, useClerk } from "@clerk/react-router";
import { api } from "convex/_generated/api";
import { useQuery } from "convex/react";
import { Bell, Settings } from "lucide-react";
import { Link } from "react-router";

import { UpgradeButton } from "@/components/subscription";
import { Button } from "@/components/ui/button";

export const HeaderActions = () => {
  const { openSignIn, openSignUp } = useClerk();

  const adminCheck = useQuery(api.admin.checkIsAdmin);
  const isAdmin = adminCheck?.isAdmin ?? false;

  return (
    <>
      <SignedOut>
        <Button
          onClick={() => {
            openSignIn();
          }}
          size="sm"
          variant="outline"
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
          <Button asChild size="sm" variant="outline">
            <Link to="/admin">
              <Settings className="h-4 w-4" />
              <span className="ml-1.5">Admin</span>
            </Link>
          </Button>
        : null}
        {import.meta.env.VITE_STRIPE_ENABLED === "true" ?
          <Button asChild size="sm" variant="outline">
            <Link to="/alerts">
              <Bell className="h-4 w-4" />
              <span className="ml-1.5">Alerts</span>
            </Link>
          </Button>
        : null}
        <UpgradeButton size="sm" />
      </SignedIn>
    </>
  );
};
