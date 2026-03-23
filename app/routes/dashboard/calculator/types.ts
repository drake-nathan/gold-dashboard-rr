import { type CreditCard, calculateCashbackPercentage } from "@/lib/credit-cards";
import type { PureFeeTier } from "@/lib/pure-fee-tiers";

// Legacy type for backward compatibility
export interface LegacyCreditCard {
  cashbackPercentage: number;
  earnRate: number;
  id: string;
  name: string;
  pointValue: number;
}

export const toLegacyCard = (card: CreditCard): LegacyCreditCard => ({
  cashbackPercentage: calculateCashbackPercentage(card),
  earnRate: card.pointsPerDollar,
  id: card.id,
  name: card.name,
  pointValue: card.valuePerPoint,
});

// Export the new type as well
export type { CreditCard };

export interface CalculatorSettings {
  costcoMembershipEnabled: boolean;
  creditCard: CreditCard;
  pureFeeTier: PureFeeTier;
  quantity: number;
}
