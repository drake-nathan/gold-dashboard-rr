import { Show, useClerk } from "@clerk/react-router";
import { Bell } from "lucide-react";
import { Link } from "react-router";

import { UpgradeButton } from "@/components/subscription";
import { Button } from "@/components/ui/button";

export const HeaderActions = () => {
  const { openSignIn, openSignUp } = useClerk();

  return (
    <>
      <Show when="signed-out">
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
      </Show>
      <Show when="signed-in">
        {import.meta.env.VITE_STRIPE_ENABLED === "true" ? (
          <Button asChild size="sm" variant="outline">
            <Link to="/alerts">
              <Bell className="h-4 w-4" />
              <span className="ml-1.5">Alerts</span>
            </Link>
          </Button>
        ) : null}
        <UpgradeButton size="sm" />
      </Show>
    </>
  );
};
