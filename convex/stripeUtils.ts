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
 * Statuses that can be evaluated for alert access.
 */
export type AlertEntitlementsStatus =
  | "active"
  | "anonymous"
  | "canceled"
  | "free"
  | "past_due"
  | "trialing"
  | "unpaid";

export type AlertPauseReason = "billing_hold" | "inactive_subscription";

/**
 * Alert feature gates derived from subscription status.
 */
export interface AlertEntitlements {
  canCreateAlerts: boolean;
  canEnableAlerts: boolean;
  canManageAlerts: boolean;
  canSendAlerts: boolean;
  pauseReason?: AlertPauseReason;
  shouldPauseEnabledAlerts: boolean;
}

const alertEntitlementsStatuses = new Set<AlertEntitlementsStatus>([
  "active",
  "anonymous",
  "canceled",
  "free",
  "past_due",
  "trialing",
  "unpaid",
]);

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
  // Select by latest currentPeriodEnd when multiple eligible subscriptions exist.
  let activeSubscription: StripeSubscription | undefined;
  for (const subscription of subscriptions) {
    if (subscription.status !== "active" && subscription.status !== "trialing") {
      continue;
    }
    if (
      !activeSubscription ||
      (subscription.currentPeriodEnd ?? 0) > (activeSubscription.currentPeriodEnd ?? 0)
    ) {
      activeSubscription = subscription;
    }
  }

  if (activeSubscription) {
    return {
      cancelAtPeriodEnd: activeSubscription.cancelAtPeriodEnd,
      currentPeriodEnd: activeSubscription.currentPeriodEnd,
      isPro: true,
      status: activeSubscription.status as "active" | "trialing",
    };
  }

  // Check for past_due subscription (not Pro, but show status)
  const pastDueSubscription = subscriptions.find((sub) => sub.status === "past_due");

  if (pastDueSubscription) {
    return {
      cancelAtPeriodEnd: pastDueSubscription.cancelAtPeriodEnd,
      currentPeriodEnd: pastDueSubscription.currentPeriodEnd,
      isPro: false,
      status: "past_due",
    };
  }

  // Check for unpaid subscription (not Pro, but show status)
  const unpaidSubscription = subscriptions.find((sub) => sub.status === "unpaid");

  if (unpaidSubscription) {
    return {
      cancelAtPeriodEnd: unpaidSubscription.cancelAtPeriodEnd,
      currentPeriodEnd: unpaidSubscription.currentPeriodEnd,
      isPro: false,
      status: "unpaid",
    };
  }

  // Check for canceled subscription
  const canceledSubscription = subscriptions.find((sub) => sub.status === "canceled");

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

/**
 * Determines alert entitlements from subscription status.
 *
 * Policy:
 * - active/trialing: full access, alerts can send
 * - past_due/unpaid: can manage existing alerts, cannot create/enable/send
 * - canceled/free: can manage existing alerts, cannot create/enable/send
 * - anonymous: no alert access
 */
export const determineAlertEntitlements = (status: AlertEntitlementsStatus): AlertEntitlements => {
  if (status === "active" || status === "trialing") {
    return {
      canCreateAlerts: true,
      canEnableAlerts: true,
      canManageAlerts: true,
      canSendAlerts: true,
      shouldPauseEnabledAlerts: false,
    };
  }

  if (status === "past_due" || status === "unpaid") {
    return {
      canCreateAlerts: false,
      canEnableAlerts: false,
      canManageAlerts: true,
      canSendAlerts: false,
      pauseReason: "billing_hold",
      shouldPauseEnabledAlerts: true,
    };
  }

  if (status === "canceled" || status === "free") {
    return {
      canCreateAlerts: false,
      canEnableAlerts: false,
      canManageAlerts: true,
      canSendAlerts: false,
      pauseReason: "inactive_subscription",
      shouldPauseEnabledAlerts: true,
    };
  }

  return {
    canCreateAlerts: false,
    canEnableAlerts: false,
    canManageAlerts: false,
    canSendAlerts: false,
    shouldPauseEnabledAlerts: false,
  };
};

/**
 * Best-effort conversion from raw Stripe/component status string to our entitlement status union.
 */
export const toAlertEntitlementsStatus = (status: string): AlertEntitlementsStatus | undefined => {
  const normalizedStatus = status as AlertEntitlementsStatus;
  if (alertEntitlementsStatuses.has(normalizedStatus)) {
    return normalizedStatus;
  }
  return undefined;
};

/**
 * Returns the pause reason when a subscription status requires disabling enabled alerts.
 */
export const getPauseReasonFromSubscriptionStatus = (
  status: string,
): AlertPauseReason | undefined => {
  const entitlementsStatus = toAlertEntitlementsStatus(status);
  if (!entitlementsStatus) {
    return undefined;
  }

  const entitlements = determineAlertEntitlements(entitlementsStatus);
  if (!entitlements.shouldPauseEnabledAlerts) {
    return undefined;
  }

  return entitlements.pauseReason;
};
