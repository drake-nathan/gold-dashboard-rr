import type { api } from "convex/_generated/api";
import type { FunctionReturnType } from "convex/server";

import {
  calculateCashbackPercentage,
  calculateSubBonusPercentage,
} from "../lib/credit-cards";
import { getFeeRateForMetal } from "../lib/pure-fee-tiers";
import type { CalculatorSettings, ProductCardData } from "../types/calculator";

type GetStats = FunctionReturnType<typeof api.dashboard.getStats>;
type MarketPrices = GetStats["marketPrices"];

export interface ProductCalculations {
  // Above spot calculation
  aboveSpotPercentage: null | number;

  // Points analysis (for travel cards)
  basePointsEarned: number;
  // Cashback breakdown
  costcoCashback: number;
  costcoCashbackPercentage: number;
  // Immediate cash flow
  costcoPrice: number;
  creditCardCashback: number;
  creditCardCashbackPercentage: number;
  // Signup bonus
  hasSignupBonus: boolean;

  initialCashLoss: null | number;
  netCostAfterCostcoCashback: null | number;
  netFromSale: null | number;
  // Final profit
  netProfit: null | number;
  netProfitPercentage: null | number;
  pointsEarned: number;
  pricePerPoint: null | number;

  // Color coding
  profitColor: string;
  pureBidPrice: null | number;
  pureFee: number;
  pureFeePercentage: number;

  purePayout: null | number;

  signupBonusCashback: number;
  signupBonusCashbackPercentage: number;
  signupBonusPoints: number;
  // SUB spend progress
  spendProgress: null | number;
  spendProgressPercentage: null | number;
  totalCashback: number;
  totalCashbackPercentage: number;
}

const COSTCO_EXECUTIVE_PERCENTAGE = 0.02; // 2%

export const calculateProductMetrics = (
  product: ProductCardData,
  marketPrices: MarketPrices,
  calculatorSettings: CalculatorSettings,
): ProductCalculations => {
  // === ABOVE SPOT CALCULATION ===
  const marketPrice = marketPrices.find(
    (p) => p.assetType === product.metalType,
  );
  const aboveSpotPercentage =
    product.currentPricePerOunce && marketPrice?.currentPrice ?
      ((product.currentPricePerOunce - marketPrice.currentPrice) /
        marketPrice.currentPrice) *
      100
    : null;

  // === CASHBACK BREAKDOWN ===
  const costcoCashbackPercentage =
    calculatorSettings.costcoMembershipEnabled ?
      COSTCO_EXECUTIVE_PERCENTAGE
    : 0;

  // Base credit card cashback
  const baseCreditCardCashbackPercentage =
    calculateCashbackPercentage(calculatorSettings.creditCard) / 100; // Convert from percentage to decimal

  // SUB bonus cashback
  const signupBonusCashbackPercentage =
    calculateSubBonusPercentage(calculatorSettings.creditCard) / 100; // Convert from percentage to decimal

  // Total credit card cashback (base + SUB)
  const creditCardCashbackPercentage =
    baseCreditCardCashbackPercentage + signupBonusCashbackPercentage;

  const costcoCashback = product.currentPrice * costcoCashbackPercentage;
  const creditCardCashback =
    product.currentPrice * baseCreditCardCashbackPercentage;
  const signupBonusCashback =
    product.currentPrice * signupBonusCashbackPercentage;
  const totalCashback =
    costcoCashback + creditCardCashback + signupBonusCashback;
  const totalCashbackPercentage =
    (costcoCashbackPercentage + creditCardCashbackPercentage) * 100;

  // SUB details
  const hasSignupBonus =
    calculatorSettings.creditCard.signupBonus?.enabled ?? false;
  const spendRequirement =
    calculatorSettings.creditCard.signupBonus?.spendRequirement ?? 0;
  const spendProgress =
    hasSignupBonus && spendRequirement > 0 ? product.currentPrice : null;
  const spendProgressPercentage =
    spendProgress !== null && spendRequirement > 0 ?
      (spendProgress / spendRequirement) * 100
    : null;

  // === IMMEDIATE CASH FLOW ===
  const costcoPrice = product.currentPrice;
  const pureBidPrice = product.pureBidPrice;

  // Get the fee rate based on metal type and selected tier
  const pureFeePercentage = getFeeRateForMetal(
    calculatorSettings.pureFeeTier,
    product.metalType,
  );
  const pureFee = pureBidPrice ? pureBidPrice * pureFeePercentage : 0;
  const netFromSale = pureBidPrice ? pureBidPrice - pureFee : null;
  const initialCashLoss =
    netFromSale !== null ? costcoPrice - netFromSale : null;

  // === FINAL PROFIT ===
  const netProfit =
    initialCashLoss !== null ? totalCashback - initialCashLoss : null;
  const netProfitPercentage =
    netProfit !== null && costcoPrice > 0 ?
      (netProfit / costcoPrice) * 100
    : null;

  // === COLOR CODING ===
  const positiveColor = "text-red-600 dark:text-red-400";
  const negativeColor = "text-green-600 dark:text-green-400";
  const profitColor =
    netProfit === null ? ""
    : netProfit > 0 ? negativeColor
    : positiveColor;

  // === POINTS ANALYSIS (for travel cards) ===
  const basePointsEarned =
    product.currentPrice * calculatorSettings.creditCard.pointsPerDollar;

  // SUB bonus points (proportional to this purchase)
  const signupBonusPointsTotal =
    calculatorSettings.creditCard.signupBonus?.pointsBonus ?? 0;
  const signupBonusPoints =
    hasSignupBonus && spendRequirement > 0 ?
      (signupBonusPointsTotal / spendRequirement) * product.currentPrice
    : 0;

  const pointsEarned = basePointsEarned + signupBonusPoints;

  const netCostAfterCostcoCashback =
    initialCashLoss !== null ? initialCashLoss - costcoCashback : null;
  const pricePerPoint =
    netCostAfterCostcoCashback !== null && pointsEarned > 0 ?
      netCostAfterCostcoCashback / pointsEarned
    : null;

  return {
    aboveSpotPercentage,
    basePointsEarned,
    costcoCashback,
    costcoCashbackPercentage: costcoCashbackPercentage * 100,
    costcoPrice,
    creditCardCashback,
    creditCardCashbackPercentage: baseCreditCardCashbackPercentage * 100,
    hasSignupBonus,
    initialCashLoss,
    netCostAfterCostcoCashback,
    netFromSale,
    netProfit,
    netProfitPercentage,
    pointsEarned,
    pricePerPoint,
    profitColor,
    pureBidPrice,
    pureFee,
    pureFeePercentage: pureFeePercentage * 100,
    purePayout: netFromSale,
    signupBonusCashback,
    signupBonusCashbackPercentage: signupBonusCashbackPercentage * 100,
    signupBonusPoints,
    spendProgress,
    spendProgressPercentage,
    totalCashback,
    totalCashbackPercentage,
  };
};
