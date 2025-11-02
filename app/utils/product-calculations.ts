import type { api } from "convex/_generated/api";
import type { FunctionReturnType } from "convex/server";

import type { CalculatorSettings } from "@/components/calculator-settings";
import type { ProductCardData } from "@/components/dashboard";

import { calculateCashbackPercentage } from "@/lib/credit-cards";

type GetStats = FunctionReturnType<typeof api.dashboard.getStats>;
type MarketPrices = GetStats["marketPrices"];

export interface ProductCalculations {
  // Above spot calculation
  aboveSpotPercentage: null | number;

  // Cashback breakdown
  costcoCashback: number;
  costcoCashbackPercentage: number;
  // Immediate cash flow
  costcoPrice: number;
  creditCardCashback: number;
  creditCardCashbackPercentage: number;
  initialCashLoss: null | number;

  netFromSale: null | number;
  // Final profit
  netProfit: null | number;
  netProfitPercentage: null | number;
  // Color coding
  profitColor: string;
  pureBidPrice: null | number;

  pureFee: number;
  totalCashback: number;

  totalCashbackPercentage: number;
}

const PURE_FEE_PERCENTAGE = 0.0075; // 0.75%
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
  const creditCardCashbackPercentage =
    calculateCashbackPercentage(calculatorSettings.creditCard) / 100; // Convert from percentage to decimal

  const costcoCashback = product.currentPrice * costcoCashbackPercentage;
  const creditCardCashback =
    product.currentPrice * creditCardCashbackPercentage;
  const totalCashback = costcoCashback + creditCardCashback;
  const totalCashbackPercentage =
    (costcoCashbackPercentage + creditCardCashbackPercentage) * 100;

  // === IMMEDIATE CASH FLOW ===
  const costcoPrice = product.currentPrice;
  const pureBidPrice = product.pureBidPrice;
  const pureFee = pureBidPrice ? pureBidPrice * PURE_FEE_PERCENTAGE : 0;
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

  return {
    aboveSpotPercentage,
    costcoCashback,
    costcoCashbackPercentage: costcoCashbackPercentage * 100,
    costcoPrice,
    creditCardCashback,
    creditCardCashbackPercentage: creditCardCashbackPercentage * 100,
    initialCashLoss,
    netFromSale,
    netProfit,
    netProfitPercentage,
    profitColor,
    pureBidPrice,
    pureFee,
    totalCashback,
    totalCashbackPercentage,
  };
};
