import { api } from "convex/_generated/api";
import { useQuery } from "convex/react";

import { useSubscription } from "@/features/subscription/hooks/use-subscription";

export const useAlertQueries = (isSignedIn: boolean) => {
  const { alertEntitlements, isLoading: isSubscriptionLoading } = useSubscription();

  const alerts = useQuery(api.alerts.getAlerts, isSignedIn ? {} : "skip");
  const productOptions = useQuery(api.alerts.getProductOptions, isSignedIn ? {} : "skip") ?? [];

  return { alertEntitlements, alerts, isSubscriptionLoading, productOptions };
};
