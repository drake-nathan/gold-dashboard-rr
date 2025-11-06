import { useEffect, useState } from "react";

import type { CalculatorSettings } from "@/components/calculator-settings";

import { useCreditCardsStorage } from "@/hooks/use-credit-cards-storage";
import { usePureFeeTierStorage } from "@/hooks/use-pure-fee-tier-storage";
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
  handleCardsChange: (newCards: CreditCard[]) => void;
  updateCalculatorSettings: (settings: CalculatorSettings) => void;
}

/**
 * Custom hook for managing calculator settings (credit cards, membership, fee tiers)
 *
 * Handles:
 * - Local storage persistence for credit cards and fee tier
 * - Credit card CRUD operations
 * - Calculator settings state (membership, selected card, fee tier)
 * - Automatic saving when settings change
 * - Total cashback percentage calculation
 */
export const useCalculatorSettings = (): CalculatorSettingsActions &
  CalculatorSettingsState => {
  // Use the new useLocalStorage hooks
  const [creditCardsStorage, setCreditCardsStorage] = useCreditCardsStorage();
  const [pureFeeTierStorage, setPureFeeTierStorage] = usePureFeeTierStorage();

  // Derive available cards from storage
  const availableCards = creditCardsStorage.cards;

  // Calculator settings state (lazy initialization from localStorage)
  const [calculatorSettings, setCalculatorSettings] =
    useState<CalculatorSettings>(() => {
      const savedTier =
        PURE_FEE_TIERS.find(
          (t) => t.id === pureFeeTierStorage.selectedTierId,
        ) ?? PURE_FEE_TIERS[0];

      return {
        costcoMembershipEnabled: true,
        creditCard:
          creditCardsStorage.cards.find(
            (c) => c.id === creditCardsStorage.lastSelectedId,
          ) ?? creditCardsStorage.cards[0],
        pureFeeTier: savedTier,
      };
    });

  // Save selected Pure fee tier to local storage when changed
  useEffect(() => {
    if (
      calculatorSettings.pureFeeTier.id !== pureFeeTierStorage.selectedTierId
    ) {
      setPureFeeTierStorage({
        selectedTierId: calculatorSettings.pureFeeTier.id,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calculatorSettings.pureFeeTier.id]);

  // Save selected card ID to localStorage when it changes
  // (but only update lastSelectedId, not the cards array)
  useEffect(() => {
    // Only update if the selected card ID differs from what's in storage
    if (
      calculatorSettings.creditCard.id !== creditCardsStorage.lastSelectedId
    ) {
      setCreditCardsStorage({
        cards: creditCardsStorage.cards, // Keep existing cards
        lastSelectedId: calculatorSettings.creditCard.id,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calculatorSettings.creditCard.id]);

  // Sync selected card with availableCards when cards are updated
  // This ensures the selected card reflects any edits made in the card manager
  useEffect(() => {
    const updatedCard = availableCards.find(
      (c) => c.id === calculatorSettings.creditCard.id,
    );

    // If the selected card was updated (values changed), update calculator settings
    if (
      updatedCard &&
      (updatedCard.name !== calculatorSettings.creditCard.name ||
        updatedCard.pointsPerDollar !==
          calculatorSettings.creditCard.pointsPerDollar ||
        updatedCard.valuePerPoint !==
          calculatorSettings.creditCard.valuePerPoint)
    ) {
      setCalculatorSettings({
        ...calculatorSettings,
        creditCard: updatedCard,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableCards]);

  // Handle card changes from manager
  const handleCardsChange = (newCards: CreditCard[]) => {
    // If current card was deleted, switch to first available
    const updatedCreditCard =
      newCards.find((c) => c.id === calculatorSettings.creditCard.id) ?
        calculatorSettings.creditCard
      : newCards[0];

    // Update calculator settings if card changed
    if (updatedCreditCard.id !== calculatorSettings.creditCard.id) {
      setCalculatorSettings({
        ...calculatorSettings,
        creditCard: updatedCreditCard,
      });
    }

    // Save to localStorage (this automatically updates availableCards)
    setCreditCardsStorage({
      cards: newCards,
      lastSelectedId: updatedCreditCard.id,
    });
  };

  // Calculate total cashback percentage
  const totalCashbackPercentage =
    (calculatorSettings.costcoMembershipEnabled ? 2 : 0) +
    calculateCashbackPercentage(calculatorSettings.creditCard);

  return {
    availableCards,
    calculatorSettings,
    handleCardsChange,
    totalCashbackPercentage,
    updateCalculatorSettings: setCalculatorSettings,
  };
};
