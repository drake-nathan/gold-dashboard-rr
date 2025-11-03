import { useEffect, useState } from "react";

import type { CalculatorSettings } from "@/components/calculator-settings";

import {
  calculateCashbackPercentage,
  type CreditCard,
  loadCreditCards,
  saveCreditCards,
} from "@/lib/credit-cards";
import {
  loadPureFeeTier,
  PURE_FEE_TIERS,
  savePureFeeTier,
} from "@/lib/pure-fee-tiers";

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
  // Credit card management state (lazy initialization from localStorage)
  const [availableCards, setAvailableCards] = useState<CreditCard[]>(() => {
    const stored = loadCreditCards();
    return stored.cards;
  });

  // Calculator settings state (lazy initialization from localStorage)
  const [calculatorSettings, setCalculatorSettings] =
    useState<CalculatorSettings>(() => {
      const stored = loadCreditCards();
      const savedTierId = loadPureFeeTier();
      const savedTier =
        PURE_FEE_TIERS.find((t) => t.id === savedTierId) ?? PURE_FEE_TIERS[0];

      return {
        costcoMembershipEnabled: true,
        creditCard:
          stored.cards.find((c) => c.id === stored.lastSelectedId) ??
          stored.cards[0],
        pureFeeTier: savedTier,
      };
    });

  // Save selected card to local storage when changed
  useEffect(() => {
    if (availableCards.length > 0) {
      saveCreditCards({
        cards: availableCards,
        lastSelectedId: calculatorSettings.creditCard.id,
      });
    }
  }, [calculatorSettings.creditCard.id, availableCards]);

  // Save selected Pure fee tier to local storage when changed
  useEffect(() => {
    savePureFeeTier(calculatorSettings.pureFeeTier.id);
  }, [calculatorSettings.pureFeeTier]);

  // Handle card changes from manager
  const handleCardsChange = (newCards: CreditCard[]) => {
    setAvailableCards(newCards);
    // If current card was deleted, switch to first available
    if (!newCards.find((c) => c.id === calculatorSettings.creditCard.id)) {
      setCalculatorSettings({
        ...calculatorSettings,
        creditCard: newCards[0],
      });
    }
    saveCreditCards({
      cards: newCards,
      lastSelectedId: calculatorSettings.creditCard.id,
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
