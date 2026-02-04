/**
 * Pure utility functions for Stripe subscription logic.
 * Extracted for testability without Convex runtime dependencies.
 */

/**
 * Subscription data as returned by the Stripe component
 */
export interface StripeSubscription {
  cancelAtPeriodEnd?: boolean;
  currentPeriodEnd?: number;
  status: string;
}

/**
 * Subscription status result
 */
export interface SubscriptionStatusResult {
  cancelAtPeriodEnd?: boolean;
  currentPeriodEnd?: number;
  isPro: boolean;
  status: "active" | "canceled" | "free" | "past_due" | "trialing" | "unpaid";
}

/**
 * Determines subscription status from an array of subscriptions.
 * Prioritizes active/trialing subscriptions over canceled ones.
 *
 * @param subscriptions - Array of subscriptions from Stripe component
 * @returns Subscription status with isPro flag
 */
export const determineSubscriptionStatus = (
  subscriptions: StripeSubscription[],
): SubscriptionStatusResult => {
  // Find active or trialing subscription (these grant Pro access)
  // Sort by currentPeriodEnd to get the most recent subscription if multiple exist
  const activeSubscription = subscriptions
    .filter((sub) => sub.status === "active" || sub.status === "trialing")
    .sort((a, b) => (b.currentPeriodEnd ?? 0) - (a.currentPeriodEnd ?? 0))
    .at(0);

  if (activeSubscription) {
    return {
      cancelAtPeriodEnd: activeSubscription.cancelAtPeriodEnd,
      currentPeriodEnd: activeSubscription.currentPeriodEnd,
      isPro: true,
      status: activeSubscription.status as "active" | "trialing",
    };
  }

  // Check for past_due subscription (not Pro, but show status)
  const pastDueSubscription = subscriptions.find(
    (sub) => sub.status === "past_due",
  );

  if (pastDueSubscription) {
    return {
      cancelAtPeriodEnd: pastDueSubscription.cancelAtPeriodEnd,
      currentPeriodEnd: pastDueSubscription.currentPeriodEnd,
      isPro: false,
      status: "past_due",
    };
  }

  // Check for unpaid subscription (not Pro, but show status)
  const unpaidSubscription = subscriptions.find(
    (sub) => sub.status === "unpaid",
  );

  if (unpaidSubscription) {
    return {
      cancelAtPeriodEnd: unpaidSubscription.cancelAtPeriodEnd,
      currentPeriodEnd: unpaidSubscription.currentPeriodEnd,
      isPro: false,
      status: "unpaid",
    };
  }

  // Check for canceled subscription
  const canceledSubscription = subscriptions.find(
    (sub) => sub.status === "canceled",
  );

  if (canceledSubscription) {
    return {
      cancelAtPeriodEnd: canceledSubscription.cancelAtPeriodEnd,
      currentPeriodEnd: canceledSubscription.currentPeriodEnd,
      isPro: false,
      status: "canceled",
    };
  }

  // No subscriptions = free tier
  return {
    isPro: false,
    status: "free",
  };
};
