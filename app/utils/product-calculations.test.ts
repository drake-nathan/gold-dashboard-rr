import { test, expect } from "vitest";

import type { CalculatorSettings } from "@/components/calculator-settings";
import type { ProductCardData } from "@/components/dashboard";

import { DEFAULT_PRESET_CARDS } from "@/lib/credit-cards";
import { PURE_FEE_TIERS } from "@/lib/pure-fee-tiers";

import { calculateProductMetrics } from "./product-calculations";

// Test fixtures
const mockMarketPrices = [
  {
    assetType: "gold" as const,
    changePercentage24h: 1.5,
    currentPrice: 2000,
    lastUpdated: Date.now(),
  },
  {
    assetType: "silver" as const,
    changePercentage24h: 0.8,
    currentPrice: 25,
    lastUpdated: Date.now(),
  },
];

const mockGoldProduct: ProductCardData = {
  _creationTime: Date.now(),
  _id: "test-product-1" as any,
  brand: "Test Brand",
  categories: ["Precious Metals", "Gold"],
  currentInStock: true,
  currentPrice: 4000,
  currentPricePerOunce: 2100, // $100 above spot
  lastFetch: Date.now(),
  metalType: "gold",
  metalWeight: "2 oz",
  name: "Test Gold Bar 2oz",
  productId: "test-123",
  pureBidPrice: 3900, // Product-specific bid
  pureBidPricePerOz: 1950,
  pureProductId: "pure-123",
  pureProductName: "Test Gold Bar",
  pureProductSku: "GOLD-2OZ",
  spread: 150,
  spreadPercentage: 7.5,
  thumbnail: "https://example.com/image.jpg",
  url: "https://costco.com/test",
};

const mockCalculatorSettings: CalculatorSettings = {
  costcoMembershipEnabled: true, // 2% cashback
  creditCard: DEFAULT_PRESET_CARDS[0], // Costco Visa: 2% (2 pts @ 1¢)
  pureFeeTier: PURE_FEE_TIERS[0], // Pure Copper: 0.75% gold fee
};

// ============================================================================
// CORE CALCULATION TESTS
// ============================================================================

test("calculates profit correctly with all cashback enabled", () => {
  const result = calculateProductMetrics(
    mockGoldProduct,
    mockMarketPrices,
    mockCalculatorSettings,
  );

  // Costco price: $4000
  // Pure bid: $3900
  // Pure fee (0.75%): $29.25
  // Net from sale: $3900 - $29.25 = $3870.75
  // Initial cash loss: $4000 - $3870.75 = $129.25
  // Costco cashback (2%): $80
  // Credit card cashback (2%): $80
  // Total cashback: $160
  // Net profit: $160 - $129.25 = $30.75

  expect(result.costcoPrice).toBe(4000);
  expect(result.pureBidPrice).toBe(3900);
  expect(result.pureFee).toBeCloseTo(29.25, 2);
  expect(result.netFromSale).toBeCloseTo(3870.75, 2);
  expect(result.initialCashLoss).toBeCloseTo(129.25, 2);
  expect(result.costcoCashback).toBe(80);
  expect(result.creditCardCashback).toBe(80);
  expect(result.totalCashback).toBe(160);
  expect(result.netProfit).toBeCloseTo(30.75, 2);
});

test("calculates profit correctly with only credit card cashback", () => {
  const settings: CalculatorSettings = {
    ...mockCalculatorSettings,
    costcoMembershipEnabled: false, // No Costco membership
  };

  const result = calculateProductMetrics(
    mockGoldProduct,
    mockMarketPrices,
    settings,
  );

  // Only credit card cashback: $80
  // Initial cash loss: $129.25
  // Net profit: $80 - $129.25 = -$49.25 (loss)

  expect(result.costcoCashback).toBe(0);
  expect(result.creditCardCashback).toBe(80);
  expect(result.totalCashback).toBe(80);
  expect(result.netProfit).toBeCloseTo(-49.25, 2);
});

test("calculates above spot percentage correctly", () => {
  const result = calculateProductMetrics(
    mockGoldProduct,
    mockMarketPrices,
    mockCalculatorSettings,
  );

  // Current price per oz: $2100
  // Market spot price: $2000
  // Above spot: ($2100 - $2000) / $2000 * 100 = 5%

  expect(result.aboveSpotPercentage).toBeCloseTo(5, 2);
});

// ============================================================================
// EDGE CASE TESTS
// ============================================================================

test("handles missing Pure bid price gracefully", () => {
  const productNoBid: ProductCardData = {
    ...mockGoldProduct,
    pureBidPrice: null,
    pureBidPricePerOz: null,
  };

  const result = calculateProductMetrics(
    productNoBid,
    mockMarketPrices,
    mockCalculatorSettings,
  );

  expect(result.pureBidPrice).toBeNull();
  expect(result.pureFee).toBe(0);
  expect(result.netFromSale).toBeNull();
  expect(result.initialCashLoss).toBeNull();
  expect(result.netProfit).toBeNull();
  expect(result.netProfitPercentage).toBeNull();
  expect(result.profitColor).toBe(""); // No color when no bid price
});

test("handles missing price per ounce for above spot calculation", () => {
  const productNoPricePerOz: ProductCardData = {
    ...mockGoldProduct,
    currentPricePerOunce: null,
  };

  const result = calculateProductMetrics(
    productNoPricePerOz,
    mockMarketPrices,
    mockCalculatorSettings,
  );

  expect(result.aboveSpotPercentage).toBeNull();
});

test("handles missing market price for metal type", () => {
  const platinumProduct: ProductCardData = {
    ...mockGoldProduct,
    metalType: "platinum" as any, // Not in our mock market prices
  };

  const result = calculateProductMetrics(
    platinumProduct,
    mockMarketPrices,
    mockCalculatorSettings,
  );

  expect(result.aboveSpotPercentage).toBeNull();
});

test("handles zero Costco price correctly", () => {
  const freeProduct: ProductCardData = {
    ...mockGoldProduct,
    currentPrice: 0,
  };

  const result = calculateProductMetrics(
    freeProduct,
    mockMarketPrices,
    mockCalculatorSettings,
  );

  expect(result.costcoPrice).toBe(0);
  expect(result.costcoCashback).toBe(0);
  expect(result.creditCardCashback).toBe(0);
  expect(result.netProfitPercentage).toBeNull(); // Avoid division by zero
});

// ============================================================================
// COLOR CODING TESTS
// ============================================================================

test("applies green color for profitable deals", () => {
  const result = calculateProductMetrics(
    mockGoldProduct,
    mockMarketPrices,
    mockCalculatorSettings,
  );

  // Net profit is positive ($30.75)
  expect(result.netProfit).toBeGreaterThan(0);
  expect(result.profitColor).toBe("text-green-600 dark:text-green-400");
});

test("applies red color for unprofitable deals", () => {
  const expensiveProduct: ProductCardData = {
    ...mockGoldProduct,
    currentPrice: 5000, // More expensive, worse deal
    pureBidPrice: 3900, // Same bid price
  };

  const result = calculateProductMetrics(
    expensiveProduct,
    mockMarketPrices,
    mockCalculatorSettings,
  );

  // Net profit should be negative
  expect(result.netProfit).toBeLessThan(0);
  expect(result.profitColor).toBe("text-red-600 dark:text-red-400");
});

// ============================================================================
// PERCENTAGE CALCULATION TESTS
// ============================================================================

test("calculates cashback percentages correctly", () => {
  const result = calculateProductMetrics(
    mockGoldProduct,
    mockMarketPrices,
    mockCalculatorSettings,
  );

  expect(result.costcoCashbackPercentage).toBe(2); // 2%
  expect(result.creditCardCashbackPercentage).toBe(2); // 2%
  expect(result.totalCashbackPercentage).toBe(4); // 4% total
  expect(result.pureFeePercentage).toBe(0.75); // 0.75% for Pure Copper tier gold
});

test("calculates net profit percentage correctly", () => {
  const result = calculateProductMetrics(
    mockGoldProduct,
    mockMarketPrices,
    mockCalculatorSettings,
  );

  // Net profit: $30.75
  // Costco price: $4000
  // Percentage: ($30.75 / $4000) * 100 = 0.76875%

  expect(result.netProfitPercentage).toBeCloseTo(0.76875, 4);
});

// ============================================================================
// FEE TIER TESTS
// ============================================================================

test("applies correct fee rate for different Pure tiers", () => {
  // Test with Pure Gold tier (lower fees)
  const goldTierSettings: CalculatorSettings = {
    ...mockCalculatorSettings,
    pureFeeTier: PURE_FEE_TIERS[2], // Pure Gold: 0.625% gold fee
  };

  const result = calculateProductMetrics(
    mockGoldProduct,
    mockMarketPrices,
    goldTierSettings,
  );

  expect(result.pureFeePercentage).toBe(0.625);
  expect(result.pureFee).toBeCloseTo(24.375, 2); // $3900 * 0.00625
});

test("applies correct fee rate for silver products", () => {
  const silverProduct: ProductCardData = {
    ...mockGoldProduct,
    metalType: "silver",
    currentPrice: 500,
    pureBidPrice: 480,
  };

  const result = calculateProductMetrics(
    silverProduct,
    mockMarketPrices,
    mockCalculatorSettings,
  );

  // Pure Copper tier: 1% for silver
  expect(result.pureFeePercentage).toBe(1);
  expect(result.pureFee).toBeCloseTo(4.8, 2); // $480 * 0.01
});

// ============================================================================
// HIGH-VALUE CREDIT CARD TESTS
// ============================================================================

test("calculates correctly with high-value credit card", () => {
  // Test with Robinhood Gold Card (3% flat cashback)
  const robinhoodCard = DEFAULT_PRESET_CARDS.find(
    (c) => c.id === "robinhood",
  )!;

  const settings: CalculatorSettings = {
    costcoMembershipEnabled: true,
    creditCard: robinhoodCard, // 3 pts @ 1¢ = 3%
    pureFeeTier: PURE_FEE_TIERS[0],
  };

  const result = calculateProductMetrics(
    mockGoldProduct,
    mockMarketPrices,
    settings,
  );

  // Costco cashback: $80 (2%)
  // Credit card cashback: $120 (3%)
  // Total cashback: $200
  // Initial cash loss: $129.25
  // Net profit: $200 - $129.25 = $70.75

  expect(result.creditCardCashback).toBe(120);
  expect(result.totalCashback).toBe(200);
  expect(result.netProfit).toBeCloseTo(70.75, 2);
});
