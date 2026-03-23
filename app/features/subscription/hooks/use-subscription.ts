/**
 * Subscription Hook
 *
 * Manages user subscription status and actions for Pro tier.
 * Integrates with Stripe via Convex component.
 */

import { useAuth } from "@clerk/react-router";
import { api } from "convex/_generated/api";
import { useAction, useQuery } from "convex/react";
import { useCallback, useRef, useState } from "react";

export interface AlertEntitlements {
  canCreateAlerts: boolean;
  canEnableAlerts: boolean;
  canManageAlerts: boolean;
  canSendAlerts: boolean;
  pauseReason?: "billing_hold" | "inactive_subscription";
  shouldPauseEnabledAlerts: boolean;
}

export interface SubscriptionStatus {
  alertEntitlements: AlertEntitlements;
  cancelAtPeriodEnd?: boolean;
  currentPeriodEnd?: number;
  isPro: boolean;
  status: "active" | "anonymous" | "canceled" | "free" | "past_due" | "trialing" | "unpaid";
  userId?: string;
}

interface UseSubscriptionReturn {
  /**
   * Alert capability gates derived from subscription status.
   */
  alertEntitlements: AlertEntitlements;

  /**
   * Create a checkout session and return the URL
   * User should be redirected to this URL
   */
  createCheckout: () => Promise<{ error?: string; url?: string }>;

  /**
   * Whether an action is in progress (checkout or portal creation)
   */
  isActionLoading: boolean;

  /**
   * Whether Stripe is enabled (feature flag)
   * Components should hide subscription UI when false
   */
  isEnabled: boolean;

  /**
   * Whether subscription status is loading
   */
  isLoading: boolean;

  /**
   * Whether the user has an active Pro subscription
   */
  isPro: boolean;

  /**
   * Open the Stripe Customer Portal for managing subscription
   */
  openPortal: () => Promise<{ error?: string; url?: string }>;

  /**
   * Full subscription status details
   */
  subscription: SubscriptionStatus;
}

/**
 * Hook for managing user subscription status and actions.
 */
export const useSubscription = (): UseSubscriptionReturn => {
  const anonymousAlertEntitlements: AlertEntitlements = {
    canCreateAlerts: false,
    canEnableAlerts: false,
    canManageAlerts: false,
    canSendAlerts: false,
    shouldPauseEnabledAlerts: false,
  };

  const inactiveAlertEntitlements: AlertEntitlements = {
    canCreateAlerts: false,
    canEnableAlerts: false,
    canManageAlerts: true,
    canSendAlerts: false,
    pauseReason: "inactive_subscription",
    shouldPauseEnabledAlerts: true,
  };

  // Feature flag check - must be checked before conditional hook usage
  const isStripeEnabled = import.meta.env.VITE_STRIPE_ENABLED === "true";

  const { isLoaded: isAuthLoaded, isSignedIn } = useAuth();
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Query subscription status (only when signed in AND Stripe is enabled)
  const subscriptionQuery = useQuery(
    api.stripe.getSubscriptionStatus,
    isStripeEnabled && isSignedIn ? {} : "skip",
  );

  // Cache the last successful query result to prevent UI flash during revalidation.
  // When navigating between routes, the Convex query briefly returns undefined while
  // the WebSocket subscription re-establishes. Without this cache, the pro ring,
  // upgrade button, and other subscription-dependent UI would flash on every navigation.
  const lastKnownResult = useRef(subscriptionQuery);
  if (subscriptionQuery !== undefined) {
    lastKnownResult.current = subscriptionQuery;
  }
  // Clear cache when user signs out so stale pro status doesn't linger
  if (!isSignedIn) {
    lastKnownResult.current = undefined;
  }

  // Actions for checkout and portal
  const createCheckoutSession = useAction(api.stripe.createCheckoutSession);
  const createPortalSession = useAction(api.stripe.createPortalSession);

  const createCheckout = useCallback(async () => {
    if (!isStripeEnabled) {
      return { error: "Stripe is not enabled" };
    }
    if (!isSignedIn) {
      return { error: "You must be logged in to subscribe" };
    }

    // Get price ID from environment - check BEFORE setting loading state
    const priceId = import.meta.env.VITE_STRIPE_PRICE_ID;
    if (!priceId) {
      return { error: "Stripe not configured" };
    }

    setIsActionLoading(true);
    try {
      const result = await createCheckoutSession({ priceId });
      return result;
    } finally {
      setIsActionLoading(false);
    }
  }, [isStripeEnabled, isSignedIn, createCheckoutSession]);

  const openPortal = useCallback(async () => {
    if (!isStripeEnabled) {
      return { error: "Stripe is not enabled" };
    }
    if (!isSignedIn) {
      return { error: "You must be logged in to manage subscription" };
    }

    setIsActionLoading(true);
    try {
      const result = await createPortalSession({});
      return result;
    } finally {
      setIsActionLoading(false);
    }
  }, [isStripeEnabled, isSignedIn, createPortalSession]);

  // When Stripe is disabled, return disabled state
  if (!isStripeEnabled) {
    return {
      alertEntitlements: anonymousAlertEntitlements,
      createCheckout,
      isActionLoading: false,
      isEnabled: false,
      isLoading: false,
      isPro: false,
      openPortal,
      subscription: {
        alertEntitlements: anonymousAlertEntitlements,
        isPro: false,
        status: "anonymous" as const,
      },
    };
  }

  // Use cached result during brief revalidation windows to prevent UI flash.
  // Only show true loading state on first load (no cached data available).
  const effectiveQuery = subscriptionQuery ?? lastKnownResult.current;

  const isLoading = !isAuthLoaded || (isSignedIn && effectiveQuery === undefined);

  const fallbackAlertEntitlements = isSignedIn
    ? inactiveAlertEntitlements
    : anonymousAlertEntitlements;

  const queryAlertEntitlements = effectiveQuery?.alertEntitlements;

  // Default subscription status for anonymous/loading states
  const subscription: SubscriptionStatus = effectiveQuery
    ? {
        ...effectiveQuery,
        alertEntitlements: queryAlertEntitlements ?? fallbackAlertEntitlements,
      }
    : {
        alertEntitlements: fallbackAlertEntitlements,
        isPro: false,
        status: isSignedIn ? "free" : "anonymous",
      };

  return {
    alertEntitlements: subscription.alertEntitlements,
    createCheckout,
    isActionLoading,
    isEnabled: true,
    isLoading,
    isPro: subscription.isPro,
    openPortal,
    subscription,
  };
};
