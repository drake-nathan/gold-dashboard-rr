/**
 * Manage Portal Hook
 *
 * Encapsulates the Stripe Customer Portal navigation logic with error handling.
 * Used by components that need to open the Stripe Customer Portal.
 */

import { useCallback } from "react";
import { toast } from "sonner";

import { useSubscription } from "./use-subscription";

interface UseManagePortalReturn {
  /**
   * Handler function to open the Stripe Customer Portal.
   * Shows toast on error, redirects to portal URL on success.
   */
  handleManagePortal: () => Promise<void>;

  /**
   * Whether the portal action is in progress
   */
  isActionLoading: boolean;

  /**
   * Whether Stripe is enabled
   */
  isEnabled: boolean;

  /**
   * Whether subscription status is loading
   */
  isLoading: boolean;

  /**
   * Whether the user has Pro subscription
   */
  isPro: boolean;
}

/**
 * Hook for managing Stripe Customer Portal navigation.
 * Handles error toasts and URL redirection.
 */
export const useManagePortal = (): UseManagePortalReturn => {
  const { isActionLoading, isEnabled, isLoading, isPro, openPortal } = useSubscription();

  const handleManagePortal = useCallback(async () => {
    const result = await openPortal();

    if (result.error) {
      toast.error(result.error);
      return;
    }

    if (result.url) {
      window.location.href = result.url;
    } else {
      toast.error("An unexpected error occurred. Please try again.");
    }
  }, [openPortal]);

  return {
    handleManagePortal,
    isActionLoading,
    isEnabled,
    isLoading,
    isPro,
  };
};
