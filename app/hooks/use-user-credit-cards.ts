/**
 * User Credit Cards Hook
 *
 * Abstracts credit card data source:
 * - Authenticated users: Convex database
 * - Anonymous users: localStorage
 *
 * Handles one-time migration from localStorage to Convex on first auth.
 */

import { useAuth } from "@clerk/react-router";
import { api } from "convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  CREDIT_CARDS_STORAGE_KEY,
  type CreditCard,
  DEFAULT_PRESET_CARDS,
} from "@/lib/credit-cards";

import {
  loadCreditCardsStorageFromLocalStorage,
  useCreditCardsStorage,
} from "./use-credit-cards-storage";

interface UseUserCreditCardsReturn {
  /**
   * Add a new card (custom or preset with modified values)
   */
  addCard: (card: CreditCard) => Promise<void>;

  /**
   * All available cards (presets + custom)
   */
  cards: CreditCard[];

  /**
   * Delete a card (custom only)
   */
  deleteCard: (cardId: string) => Promise<void>;

  /**
   * Whether data is still loading
   */
  isLoading: boolean;

  /**
   * Whether migration is in progress
   */
  isMigrating: boolean;

  /**
   * Last selected card ID
   */
  lastSelectedId: string;

  /**
   * Reset all cards to defaults (delete custom, reset presets)
   */
  resetAllCards: () => Promise<void>;

  /**
   * Reset a preset card to defaults
   */
  resetPresetCard: (cardId: string) => Promise<void>;

  /**
   * Set the last selected card ID
   */
  setLastSelectedId: (cardId: string) => Promise<void>;

  /**
   * Update a card's values
   */
  updateCard: (cardId: string, updates: Partial<CreditCard>) => Promise<void>;
}

/**
 * Hook for managing user credit cards with automatic data source selection
 * and migration from localStorage to Convex on first authentication.
 */
export const useUserCreditCards = (): UseUserCreditCardsReturn => {
  const { isLoaded: isAuthLoaded, isSignedIn } = useAuth();

  // localStorage storage (for anonymous users and migration source)
  const [localStorageData, setLocalStorageData] = useCreditCardsStorage();

  // Track migration state
  const [isMigrating, setIsMigrating] = useState(false);
  const migrationAttempted = useRef(false);

  // Convex queries/mutations (only run when authenticated)
  const convexCards = useQuery(api.userCards.getUserCards, isSignedIn ? {} : "skip");
  const convexSettings = useQuery(api.userSettings.getSettings, isSignedIn ? {} : "skip");
  const needsMigration = useQuery(api.userSettings.needsMigration, isSignedIn ? {} : "skip");

  const addCardMutation = useMutation(api.userCards.addCard);
  const updateCardMutation = useMutation(api.userCards.updateCard);
  const deleteCardMutation = useMutation(api.userCards.deleteCard);
  const resetPresetCardMutation = useMutation(api.userCards.resetPresetCard);
  const migrateFromLocalStorageMutation = useMutation(api.userCards.migrateFromLocalStorage);
  const updateSettingsMutation = useMutation(api.userSettings.updateSettings);
  const markMigrationCompleteMutation = useMutation(api.userSettings.markMigrationComplete);

  // Helper to check if localStorage has custom data worth merging
  const getCardsToMerge = useCallback((cards: CreditCard[]) => {
    const cardsToMerge = cards
      .filter((card) => {
        if (!card.isPreset) return true; // Always merge custom cards

        // Check if preset has been modified
        const defaultPreset = DEFAULT_PRESET_CARDS.find((p) => p.id === card.id);
        if (!defaultPreset) return true;

        return (
          card.pointsPerDollar !== defaultPreset.pointsPerDollar ||
          card.valuePerPoint !== defaultPreset.valuePerPoint ||
          card.signupBonus !== undefined
        );
      })
      .map((card) => ({
        cardId: card.id,
        cardType: card.cardType,
        isCustomizable: card.isCustomizable,
        isPreset: card.isPreset,
        issuer: card.issuer,
        name: card.name,
        pointsPerDollar: card.pointsPerDollar,
        signupBonus: card.signupBonus,
        valuePerPoint: card.valuePerPoint,
      }));

    return cardsToMerge;
  }, []);

  // Run migration/merge when user authenticates
  // - First device: full migration, mark complete, clear localStorage
  // - Additional devices: merge any new cards, clear localStorage
  useEffect(() => {
    const runMigrationOrMerge = async () => {
      // Skip if not authenticated, already migrating, or already attempted
      if (
        !isSignedIn ||
        isMigrating ||
        migrationAttempted.current ||
        needsMigration === undefined
      ) {
        return;
      }

      const migrationSource =
        typeof window === "undefined" ? localStorageData : loadCreditCardsStorageFromLocalStorage();

      const cardsToMerge = getCardsToMerge(migrationSource.cards);
      const hasDataToMerge = cardsToMerge.length > 0;

      // Case 1: First device - needs full migration
      if (needsMigration) {
        migrationAttempted.current = true;

        // No custom data - just mark migration complete
        if (!hasDataToMerge) {
          await markMigrationCompleteMutation({});
          return;
        }

        setIsMigrating(true);

        try {
          // Migrate cards
          await migrateFromLocalStorageMutation({ cards: cardsToMerge });

          // Migrate settings
          await updateSettingsMutation({
            lastSelectedCardId: migrationSource.lastSelectedId,
          });

          // Mark migration complete
          await markMigrationCompleteMutation({});

          // Clear localStorage after successful migration
          if (typeof window !== "undefined") {
            localStorage.removeItem(CREDIT_CARDS_STORAGE_KEY);
          }

          console.info(`Migration complete: ${cardsToMerge.length} cards migrated`);
        } catch (error) {
          console.error("Migration failed:", error);
          migrationAttempted.current = false;
        } finally {
          setIsMigrating(false);
        }
        return;
      }

      // Case 2: Additional device - migration already done, but may have local data to merge
      if (!hasDataToMerge) {
        // No local data to merge, but clean up any stale localStorage
        if (typeof window !== "undefined") {
          const hasLocalStorage = localStorage.getItem(CREDIT_CARDS_STORAGE_KEY) !== null;
          if (hasLocalStorage) {
            localStorage.removeItem(CREDIT_CARDS_STORAGE_KEY);
          }
        }
        return;
      }

      // Has data to merge from this device
      migrationAttempted.current = true;
      setIsMigrating(true);

      try {
        // Merge cards (backend deduplicates by ID)
        const result = await migrateFromLocalStorageMutation({
          cards: cardsToMerge,
        });

        // Clear localStorage after successful merge
        if (typeof window !== "undefined") {
          localStorage.removeItem(CREDIT_CARDS_STORAGE_KEY);
        }

        console.info(
          `Merge complete: ${result.imported} cards imported, ${result.skipped} skipped (already existed)`,
        );
      } catch (error) {
        console.error("Merge failed:", error);
        migrationAttempted.current = false;
      } finally {
        setIsMigrating(false);
      }
    };

    void runMigrationOrMerge();
  }, [
    isSignedIn,
    needsMigration,
    isMigrating,
    localStorageData,
    getCardsToMerge,
    migrateFromLocalStorageMutation,
    updateSettingsMutation,
    markMigrationCompleteMutation,
  ]);

  // Determine if we're still loading
  const isLoading =
    !isAuthLoaded || (isSignedIn && (convexCards === undefined || convexSettings === undefined));

  // Build cards array (merge Convex cards with default presets)
  const cards: CreditCard[] = (() => {
    if (!isSignedIn) {
      return localStorageData.cards;
    }

    if (convexCards === undefined || isMigrating) {
      // Still loading or migrating - show localStorage data to avoid flash
      return localStorageData.cards;
    }

    // Merge Convex cards with default presets
    // Convex only stores modified presets and custom cards
    const convexCardIds = new Set(convexCards.map((c) => c.id));

    // Start with default presets that aren't in Convex
    const defaultPresets = DEFAULT_PRESET_CARDS.filter((p) => !convexCardIds.has(p.id));

    // Add Convex cards (modified presets + custom)
    const allCards = [...defaultPresets, ...convexCards];

    // Sort: presets first, then custom, alphabetically
    return allCards.toSorted((a, b) => {
      if (a.isPreset !== b.isPreset) {
        return a.isPreset ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
  })();

  // Determine last selected card ID
  const lastSelectedId: string = (() => {
    if (!isSignedIn) {
      return localStorageData.lastSelectedId ?? DEFAULT_PRESET_CARDS[0].id;
    }
    // During loading/migration, use localStorage to avoid flash
    if (convexSettings === undefined || convexSettings === null || isMigrating) {
      return localStorageData.lastSelectedId ?? DEFAULT_PRESET_CARDS[0].id;
    }
    return convexSettings.lastSelectedCardId ?? DEFAULT_PRESET_CARDS[0].id;
  })();

  // CRUD operations
  const addCard = useCallback(
    async (card: CreditCard) => {
      if (isSignedIn) {
        await addCardMutation({
          cardId: card.id,
          cardType: card.cardType,
          isCustomizable: card.isCustomizable,
          isPreset: card.isPreset,
          issuer: card.issuer,
          name: card.name,
          pointsPerDollar: card.pointsPerDollar,
          signupBonus: card.signupBonus,
          valuePerPoint: card.valuePerPoint,
        });
      } else {
        // Use functional update to avoid stale closure
        setLocalStorageData((current) => ({
          cards: [...current.cards, card],
          lastSelectedId: card.id,
        }));
      }
    },
    [isSignedIn, addCardMutation, setLocalStorageData],
  );

  const updateCard = useCallback(
    async (cardId: string, updates: Partial<CreditCard>) => {
      if (isSignedIn) {
        await updateCardMutation({
          cardId,
          cardType: updates.cardType,
          isCustomizable: updates.isCustomizable,
          isPreset: updates.isPreset,
          issuer: updates.issuer,
          name: updates.name,
          pointsPerDollar: updates.pointsPerDollar,
          signupBonus: updates.signupBonus,
          valuePerPoint: updates.valuePerPoint,
        });
      } else {
        // Use functional update to avoid stale closure
        setLocalStorageData((current) => ({
          cards: current.cards.map((c) => (c.id === cardId ? { ...c, ...updates } : c)),
          lastSelectedId: current.lastSelectedId,
        }));
      }
    },
    [isSignedIn, updateCardMutation, setLocalStorageData],
  );

  const deleteCard = useCallback(
    async (cardId: string) => {
      if (isSignedIn) {
        await deleteCardMutation({ cardId });
      } else {
        // Use functional update to avoid stale closure
        setLocalStorageData((current) => {
          const filteredCards = current.cards.filter((c) => c.id !== cardId);
          const newSelectedId =
            current.lastSelectedId === cardId
              ? (filteredCards[0]?.id ?? DEFAULT_PRESET_CARDS[0].id)
              : current.lastSelectedId;
          return {
            cards: filteredCards,
            lastSelectedId: newSelectedId,
          };
        });
      }
    },
    [isSignedIn, deleteCardMutation, setLocalStorageData],
  );

  const resetPresetCard = useCallback(
    async (cardId: string) => {
      if (isSignedIn) {
        await resetPresetCardMutation({ cardId });
      } else {
        const defaultCard = DEFAULT_PRESET_CARDS.find((c) => c.id === cardId);
        if (!defaultCard) return;

        // Use functional update to avoid stale closure
        setLocalStorageData((current) => ({
          cards: current.cards.map((c) => (c.id === cardId ? defaultCard : c)),
          lastSelectedId: current.lastSelectedId,
        }));
      }
    },
    [isSignedIn, resetPresetCardMutation, setLocalStorageData],
  );

  const setLastSelectedId = useCallback(
    async (cardId: string) => {
      if (isSignedIn) {
        await updateSettingsMutation({ lastSelectedCardId: cardId });
      } else {
        // Use functional update to avoid stale closure - ensures we get
        // the current cards array, not a stale captured version
        setLocalStorageData((current) => ({
          cards: current.cards,
          lastSelectedId: cardId,
        }));
      }
    },
    [isSignedIn, updateSettingsMutation, setLocalStorageData],
  );

  const resetAllCardsMutation = useMutation(api.userCards.resetAllCards);

  const resetAllCards = useCallback(async () => {
    if (isSignedIn) {
      await resetAllCardsMutation({});
    } else {
      // Reset to default preset cards
      setLocalStorageData({
        cards: DEFAULT_PRESET_CARDS,
        lastSelectedId: DEFAULT_PRESET_CARDS[0].id,
      });
    }
  }, [isSignedIn, resetAllCardsMutation, setLocalStorageData]);

  return {
    addCard,
    cards,
    deleteCard,
    isLoading,
    isMigrating,
    lastSelectedId,
    resetAllCards,
    resetPresetCard,
    setLastSelectedId,
    updateCard,
  };
};
