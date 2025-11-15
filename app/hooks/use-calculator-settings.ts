import { useMemo, useState } from "react";

import type { CalculatorSettings } from "@/components/calculator-settings";

import { useCreditCardsStorage } from "@/hooks/use-credit-cards-storage";
import { usePureFeeTierStorage } from "@/hooks/use-pure-fee-tier-storage";
import {
  calculateCashbackPercentage,
  type CreditCard,
  DEFAULT_PRESET_CARDS,
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
 */
export const useCalculatorSettings = (): CalculatorSettingsActions &
  CalculatorSettingsState => {
  // Use the new useLocalStorage hooks
  const [creditCardsStorage, setCreditCardsStorage] = useCreditCardsStorage();
  const [pureFeeTierStorage, setPureFeeTierStorage] = usePureFeeTierStorage();

  // Derive available cards from storage
  const availableCards = creditCardsStorage.cards;

  // Store only IDs and membership setting - derive full objects during render
  const [selectedCardId, setSelectedCardId] = useState<string>(() => {
    // Storage hooks guarantee these values are defined (have defaults in deserializers)
    return creditCardsStorage.lastSelectedId || DEFAULT_PRESET_CARDS[0].id;
  });

  const [selectedTierId, setSelectedTierId] = useState<string>(() => {
    // Storage hooks guarantee these values are defined (have defaults in deserializers)
    return pureFeeTierStorage.selectedTierId || PURE_FEE_TIERS[0].id;
  });

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
    }),
    [costcoMembershipEnabled, selectedCard, selectedTier],
  );

  // Handle card changes from manager
  const handleCardsChange = (
    newCards: CreditCard[],
    selectCardId?: string,
  ) => {
    // Determine which card to select:
    // 1. If selectCardId is provided (e.g., newly created card), use it
    // 2. If current card still exists, keep it selected
    // 3. Otherwise, fallback to first available card
    const newSelectedCardId =
      selectCardId ??
      newCards.find((c) => c.id === selectedCardId)?.id ??
      newCards[0].id;

    // Update selected card ID in state
    if (newSelectedCardId !== selectedCardId) {
      setSelectedCardId(newSelectedCardId);
    }

    // Save to localStorage (happens in event handler, not Effect)
    setCreditCardsStorage({
      cards: newCards,
      lastSelectedId: newSelectedCardId,
    });
  };

  // Update calculator settings (called from event handlers)
  const updateCalculatorSettings = (settings: CalculatorSettings) => {
    // Update membership state
    if (settings.costcoMembershipEnabled !== costcoMembershipEnabled) {
      setCostcoMembershipEnabled(settings.costcoMembershipEnabled);
    }

    // Update selected card ID and save to localStorage
    if (settings.creditCard.id !== selectedCardId) {
      setSelectedCardId(settings.creditCard.id);
      setCreditCardsStorage({
        cards: availableCards,
        lastSelectedId: settings.creditCard.id,
      });
    }

    // Update selected tier ID and save to localStorage
    if (settings.pureFeeTier.id !== selectedTierId) {
      setSelectedTierId(settings.pureFeeTier.id);
      setPureFeeTierStorage({
        selectedTierId: settings.pureFeeTier.id,
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
