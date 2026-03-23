import { useMemo } from "react";

import { useUserCreditCards } from "@/features/credit-cards/hooks/use-user-credit-cards";
import {
  calculateCashbackPercentage,
  type CreditCard,
  DEFAULT_PRESET_CARDS,
} from "@/lib/credit-cards";
import { PURE_FEE_TIERS } from "@/lib/pure-fee-tiers";

import { usePureFeeTierStorage } from "../calculator/hooks/use-pure-fee-tier-storage";
import { useUserSettings } from "../calculator/hooks/use-user-settings";
import type { CalculatorSettings } from "../calculator/types";
import { useQuantityStorage } from "./use-quantity-storage";

export interface CalculatorSettingsState {
  availableCards: CreditCard[];
  calculatorSettings: CalculatorSettings;
  isLoading: boolean;
  isMigrating: boolean;
  totalCashbackPercentage: number;
}

export interface CalculatorSettingsActions {
  handleCardsChange: (newCards: CreditCard[], selectCardId?: string) => Promise<void>;
  handleResetAll: () => Promise<void>;
  updateCalculatorSettings: (settings: CalculatorSettings) => Promise<void>;
}

/**
 * Custom hook for managing calculator settings (credit cards, membership, fee tiers)
 *
 * Handles:
 * - Data source abstraction (Convex for authenticated, localStorage for anonymous)
 * - Automatic migration from localStorage to Convex on first auth
 * - Credit card CRUD operations
 * - Calculator settings state (membership, selected card, fee tier)
 * - Total cashback percentage calculation
 *
 * Following React best practices:
 * - No Effects for localStorage writes (done in event handlers)
 * - Derived state computed during render (selected card synced with availableCards)
 */
export const useCalculatorSettings = (): CalculatorSettingsActions & CalculatorSettingsState => {
  // User data hooks (handle auth-aware data source selection)
  const {
    addCard,
    cards: availableCards,
    deleteCard: deleteCardData,
    isLoading: isCardsLoading,
    isMigrating,
    lastSelectedId: selectedCardId,
    resetAllCards,
    setLastSelectedId,
    updateCard: updateCardData,
  } = useUserCreditCards();

  const {
    costcoMembershipEnabled,
    isLoading: isSettingsLoading,
    setCostcoMembershipEnabled,
  } = useUserSettings();

  // Pure fee tier and quantity (still using localStorage - not user-specific)
  const [pureFeeTierStorage, setPureFeeTierStorage] = usePureFeeTierStorage();
  const [quantityStorage, setQuantityStorage] = useQuantityStorage();

  const selectedTierId = pureFeeTierStorage.selectedTierId;
  const quantity = quantityStorage.quantity;

  // Derive selected card from availableCards (always fresh, no stale data)
  const selectedCard = useMemo(() => {
    const card = availableCards.find((c) => c.id === selectedCardId);
    // If selected card was deleted, fallback to first card
    return card ?? availableCards[0];
  }, [availableCards, selectedCardId]);

  // Derive selected tier from PURE_FEE_TIERS
  const selectedTier = useMemo(() => {
    const tier = PURE_FEE_TIERS.find((t) => t.id === selectedTierId);
    return tier ?? PURE_FEE_TIERS[0];
  }, [selectedTierId]);

  // Build calculator settings from derived state
  const calculatorSettings: CalculatorSettings = useMemo(
    () => ({
      costcoMembershipEnabled,
      creditCard: selectedCard,
      pureFeeTier: selectedTier,
      quantity,
    }),
    [costcoMembershipEnabled, selectedCard, selectedTier, quantity],
  );

  // Handle card changes from manager
  const handleCardsChange = async (newCards: CreditCard[], selectCardId?: string) => {
    // Find which cards were added, updated, or deleted
    const existingIds = new Set(availableCards.map((c) => c.id));
    const newIds = new Set(newCards.map((c) => c.id));

    // Handle deletions
    for (const card of availableCards) {
      if (!newIds.has(card.id) && !card.isPreset) {
        await deleteCardData(card.id);
      }
    }

    // Handle additions and updates
    for (const card of newCards) {
      if (!existingIds.has(card.id)) {
        // New card
        await addCard(card);
      } else {
        // Existing card - check if updated
        const existingCard = availableCards.find((c) => c.id === card.id);
        if (existingCard) {
          const hasChanges =
            existingCard.name !== card.name ||
            existingCard.issuer !== card.issuer ||
            existingCard.pointsPerDollar !== card.pointsPerDollar ||
            existingCard.valuePerPoint !== card.valuePerPoint ||
            existingCard.cardType !== card.cardType ||
            JSON.stringify(existingCard.signupBonus) !== JSON.stringify(card.signupBonus);

          if (hasChanges) {
            await updateCardData(card.id, card);
          }
        }
      }
    }

    // Update selected card if specified
    if (selectCardId) {
      await setLastSelectedId(selectCardId);
    }
  };

  // Update calculator settings (called from event handlers)
  const updateCalculatorSettings = async (settings: CalculatorSettings) => {
    // Update membership state
    if (settings.costcoMembershipEnabled !== costcoMembershipEnabled) {
      await setCostcoMembershipEnabled(settings.costcoMembershipEnabled);
    }

    // Update selected card ID
    if (settings.creditCard.id !== selectedCardId) {
      await setLastSelectedId(settings.creditCard.id);
    }

    // Update selected tier ID in localStorage (not user-specific)
    if (settings.pureFeeTier.id !== selectedTierId) {
      setPureFeeTierStorage({
        selectedTierId: settings.pureFeeTier.id,
      });
    }

    // Update quantity in localStorage (not user-specific)
    if (settings.quantity !== quantity) {
      setQuantityStorage({
        quantity: settings.quantity,
      });
    }
  };

  // Calculate total cashback percentage
  const totalCashbackPercentage =
    (costcoMembershipEnabled ? 2 : 0) + calculateCashbackPercentage(selectedCard);

  const isLoading = isCardsLoading || isSettingsLoading;

  // Handle reset all cards (delete custom, reset presets to defaults)
  const handleResetAll = async () => {
    await resetAllCards();
    // Also reset last selected to first default card
    await setLastSelectedId(DEFAULT_PRESET_CARDS[0].id);
  };

  return {
    availableCards,
    calculatorSettings,
    handleCardsChange,
    handleResetAll,
    isLoading,
    isMigrating,
    totalCashbackPercentage,
    updateCalculatorSettings,
  };
};
