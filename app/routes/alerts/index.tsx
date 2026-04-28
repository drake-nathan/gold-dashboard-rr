import { getAuth } from "@clerk/react-router/server";
import { redirect } from "react-router";

import { FEATURE_FLAGS } from "@/lib/feature-flags";
import { evaluateFeatureFlags } from "@/lib/feature-flags.server";

import type { Route } from "./+types/index";
import { AlertsPage } from "./alerts-page";

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
  if (!flags[FEATURE_FLAGS.ALERTS_BETA]) {
    // React Router idiom: redirect() returns a Response.
    // oxlint-disable-next-line typescript/only-throw-error
    throw redirect("/");
  }

  return null;
};

export default AlertsPage;
