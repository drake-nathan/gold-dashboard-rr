import { Show, useClerk } from "@clerk/react-router";
import { Bell, LayoutDashboard } from "lucide-react";
import { Link, useLocation } from "react-router";

import { UpgradeButton } from "@/components/subscription/upgrade-button";
import { Button } from "@/components/ui/button";
import { FEATURE_FLAGS, useFeatureFlag } from "@/lib/feature-flags";

export const HeaderActions = () => {
  const { openSignIn, openSignUp } = useClerk();
  const location = useLocation();
  const isAlertsPage = location.pathname === "/alerts";
  const alertsEnabled = useFeatureFlag(FEATURE_FLAGS.PAID_FEATURES);

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
        {alertsEnabled ? (
          <Button asChild size="sm" variant="outline">
            <Link to={isAlertsPage ? "/" : "/alerts"}>
              {isAlertsPage ? (
                <>
                  <LayoutDashboard className="h-4 w-4" />
                  <span className="ml-1.5">Dashboard</span>
                </>
              ) : (
                <>
                  <Bell className="h-4 w-4" />
                  <span className="ml-1.5">Alerts</span>
                </>
              )}
            </Link>
          </Button>
        ) : null}
        <UpgradeButton size="sm" />
      </Show>
    </>
  );
};
