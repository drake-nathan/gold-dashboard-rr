import { useMemo, useState } from "react";

import type { CalculatorSettings } from "@/components/calculator-settings";

import { useCreditCardsStorage } from "@/hooks/use-credit-cards-storage";
import { usePureFeeTierStorage } from "@/hooks/use-pure-fee-tier-storage";
import { useQuantityStorage } from "@/hooks/use-quantity-storage";
import {
  calculateCashbackPercentage,
  type CreditCard,
} from "@/lib/credit-cards";
import { PURE_FEE_TIERS } from "@/lib/pure-fee-tiers";

export interface CalculatorSettingsState {
  availableCards: CreditCard[];
  calculatorSettings: CalculatorSettings;
  totalCashbackPercentage: number;
}

export interface CalculatorSettingsActions {
  handleCardsChange: (newCards: CreditCard[], selectCardId?: string) => void;
  updateCalculatorSettings: (settings: CalculatorSettings) => void;
}

/**
 * Custom hook for managing calculator settings (credit cards, membership, fee tiers)
 *
 * Handles:
 * - Local storage persistence for credit cards and fee tier
 * - Credit card CRUD operations
 * - Calculator settings state (membership, selected card, fee tier)
 * - Total cashback percentage calculation
 *
 * Following React best practices:
 * - No Effects for localStorage writes (done in event handlers)
 * - Derived state computed during render (selected card synced with availableCards)
 * - IDs are read directly from storage hooks (not duplicated in useState)
 *   to ensure localStorage values are loaded after SSR hydration
 */
export const useCalculatorSettings = (): CalculatorSettingsActions &
  CalculatorSettingsState => {
  // Use the useLocalStorage hooks - these handle SSR-safe deferred loading
  // with initializeWithValue: false, returning defaults on first render
  // then the actual localStorage values after hydration
  const [creditCardsStorage, setCreditCardsStorage] = useCreditCardsStorage();
  const [pureFeeTierStorage, setPureFeeTierStorage] = usePureFeeTierStorage();
  const [quantityStorage, setQuantityStorage] = useQuantityStorage();

  // Derive available cards from storage
  const availableCards = creditCardsStorage.cards;

  // Read IDs directly from storage hooks (not useState) to ensure
  // localStorage values are loaded after hydration.
  // useState initializers only run once and would capture the default values
  // before the storage hooks have read from localStorage.
  const selectedCardId = creditCardsStorage.lastSelectedId;
  const selectedTierId = pureFeeTierStorage.selectedTierId;
  const quantity = quantityStorage.quantity;

  // Only costcoMembershipEnabled uses useState since it's not persisted
  const [costcoMembershipEnabled, setCostcoMembershipEnabled] =
    useState<boolean>(true);

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
  const handleCardsChange = (newCards: CreditCard[], selectCardId?: string) => {
    // Determine which card to select:
    // 1. If selectCardId is provided (e.g., newly created card), use it
    // 2. If current card still exists, keep it selected
    // 3. Otherwise, fallback to first available card
    const newSelectedCardId =
      selectCardId ??
      newCards.find((c) => c.id === selectedCardId)?.id ??
      newCards[0].id;

    // Save to localStorage (happens in event handler, not Effect)
    // The storage hook will trigger a re-render with the new values
    setCreditCardsStorage({
      cards: newCards,
      lastSelectedId: newSelectedCardId,
    });
  };

  // Update calculator settings (called from event handlers)
  const updateCalculatorSettings = (settings: CalculatorSettings) => {
    // Update membership state (only setting not persisted to localStorage)
    if (settings.costcoMembershipEnabled !== costcoMembershipEnabled) {
      setCostcoMembershipEnabled(settings.costcoMembershipEnabled);
    }

    // Update selected card ID in localStorage
    // The storage hook will trigger a re-render with the new value
    if (settings.creditCard.id !== selectedCardId) {
      setCreditCardsStorage({
        cards: availableCards,
        lastSelectedId: settings.creditCard.id,
      });
    }

    // Update selected tier ID in localStorage
    if (settings.pureFeeTier.id !== selectedTierId) {
      setPureFeeTierStorage({
        selectedTierId: settings.pureFeeTier.id,
      });
    }

    // Update quantity in localStorage
    if (settings.quantity !== quantity) {
      setQuantityStorage({
        quantity: settings.quantity,
      });
    }
  };

  // Calculate total cashback percentage
  const totalCashbackPercentage =
    (costcoMembershipEnabled ? 2 : 0) +
    calculateCashbackPercentage(selectedCard);

  return {
    availableCards,
    calculatorSettings,
    handleCardsChange,
    totalCashbackPercentage,
    updateCalculatorSettings,
  };
};
