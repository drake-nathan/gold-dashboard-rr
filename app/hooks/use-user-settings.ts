/**
 * User Settings Hook
 *
 * Manages user settings like Costco membership toggle.
 * - Authenticated users: Convex database
 * - Anonymous users: React state (not persisted)
 */

import { useAuth } from "@clerk/react-router";
import { api } from "convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useState } from "react";

interface UseUserSettingsReturn {
  /**
   * Whether Costco Executive membership cashback is enabled
   */
  costcoMembershipEnabled: boolean;

  /**
   * Whether settings are loading
   */
  isLoading: boolean;

  /**
   * Toggle Costco membership
   */
  setCostcoMembershipEnabled: (enabled: boolean) => Promise<void>;
}

/**
 * Hook for managing user settings with automatic data source selection.
 */
export const useUserSettings = (): UseUserSettingsReturn => {
  const { isLoaded: isAuthLoaded, isSignedIn } = useAuth();

  // Local state for anonymous users (default to true - most users are Executive members)
  const [localCostcoEnabled, setLocalCostcoEnabled] = useState(true);

  // Convex query/mutation (only run when authenticated)
  const convexSettings = useQuery(api.userSettings.getSettings, isSignedIn ? {} : "skip");
  const updateSettingsMutation = useMutation(api.userSettings.updateSettings);

  const isLoading = !isAuthLoaded || (isSignedIn && convexSettings === undefined);

  // Get current value
  const costcoMembershipEnabled: boolean = (() => {
    if (!isSignedIn) {
      return localCostcoEnabled;
    }
    // Default to true if settings don't exist yet
    return convexSettings?.costcoMembershipEnabled ?? true;
  })();

  // Update setting
  const setCostcoMembershipEnabled = useCallback(
    async (enabled: boolean) => {
      if (isSignedIn) {
        await updateSettingsMutation({ costcoMembershipEnabled: enabled });
      } else {
        setLocalCostcoEnabled(enabled);
      }
    },
    [isSignedIn, updateSettingsMutation],
  );

  return {
    costcoMembershipEnabled,
    isLoading,
    setCostcoMembershipEnabled,
  };
};
