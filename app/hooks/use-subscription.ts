/**
 * Subscription Hook
 *
 * Manages user subscription status and actions for Pro tier.
 * Integrates with Stripe via Convex component.
 */

import { useAuth } from "@clerk/react-router";
import { api } from "convex/_generated/api";
import { useAction, useQuery } from "convex/react";
import { useCallback, useState } from "react";

export interface SubscriptionStatus {
  cancelAtPeriodEnd?: boolean;
  currentPeriodEnd?: number;
  isPro: boolean;
  status:
    | "active"
    | "anonymous"
    | "canceled"
    | "free"
    | "past_due"
    | "trialing"
    | "unpaid";
  userId?: string;
}

interface UseSubscriptionReturn {
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
  // Feature flag check - must be checked before conditional hook usage
  const isStripeEnabled = import.meta.env.VITE_STRIPE_ENABLED === "true";

  const { isLoaded: isAuthLoaded, isSignedIn } = useAuth();
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Query subscription status (only when signed in AND Stripe is enabled)
  const subscriptionQuery = useQuery(
    api.stripe.getSubscriptionStatus,
    isStripeEnabled && isSignedIn ? {} : "skip",
  );

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
      createCheckout,
      isActionLoading: false,
      isEnabled: false,
      isLoading: false,
      isPro: false,
      openPortal,
      subscription: { isPro: false, status: "anonymous" as const },
    };
  }

  const isLoading =
    !isAuthLoaded || (isSignedIn && subscriptionQuery === undefined);

  // Default subscription status for anonymous/loading states
  const subscription: SubscriptionStatus = subscriptionQuery ?? {
    isPro: false,
    status: isSignedIn ? "free" : "anonymous",
  };

  return {
    createCheckout,
    isActionLoading,
    isEnabled: true,
    isLoading,
    isPro: subscription.isPro,
    openPortal,
    subscription,
  };
};
