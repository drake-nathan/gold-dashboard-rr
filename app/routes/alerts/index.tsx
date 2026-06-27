import { getAuth } from "@clerk/react-router/server";
import { redirect, useRouteError } from "react-router";

import { RouteErrorPage } from "@/components/ui/route-error-page";
import { FEATURE_FLAGS } from "@/lib/feature-flags";
import { evaluateFeatureFlags } from "@/lib/feature-flags.server";

import type { Route } from "./+types/index";
export { AlertsPage as default } from './alerts-page';
export const meta = () => [
  { title: "Alerts - Dashboard.Gold" },
  {
    content: "Manage your Dashboard.Gold price and stock alerts",
    name: "description",
  },
  { content: "noindex, nofollow", name: "robots" },
];

export const loader = async (args: Route.LoaderArgs) => {
  const auth = await getAuth(args);
  // Signed-out users see the in-page sign-in prompt; they can't reach gated UI
  // until they authenticate, at which point this loader re-runs.
  if (!auth.userId) {
    return null;
  }

  const flags = await evaluateFeatureFlags(auth.userId);
  if (!flags[FEATURE_FLAGS.PAID_FEATURES]) {
    // React Router idiom: redirect() returns a Response.
    // oxlint-disable-next-line typescript/only-throw-error
    throw redirect("/");
  }

  return null;
};



export const ErrorBoundary = () => {
  const error = useRouteError();

  return (
    <RouteErrorPage
      description="Something went wrong while loading your alerts. Your saved alerts are safe — refreshing usually fixes this."
      error={error}
      title="Couldn't load alerts"
    />
  );
};
