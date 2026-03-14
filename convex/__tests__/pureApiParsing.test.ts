import { expect, test } from "vitest";

import {
  extractProductType,
  getHighestOfferPrice,
  hasMorePages,
  parseWeightToOz,
  type PureProduct,
  type PureSpotPriceV2,
  transformSpotPricesV2,
} from "../lib/pureApiParsing";

// ============================================================================
// parseWeightToOz TESTS
// ============================================================================

// weightGrams parameter (takes precedence)
test("parseWeightToOz: converts weightGrams parameter to oz", () => {
  expect(parseWeightToOz("ignored", 31.1035)).toBeCloseTo(1, 4);
});

test("parseWeightToOz: prioritizes weightGrams over weight string", () => {
  expect(parseWeightToOz("10 oz", 31.1035)).toBeCloseTo(1, 4); // Uses 31.1035g, not "10 oz"
});

test("parseWeightToOz: converts 100 grams via weightGrams", () => {
  expect(parseWeightToOz("", 100)).toBeCloseTo(3.215, 3);
});

// Ounce formats from weight string
test("parseWeightToOz: parses '1 oz' format", () => {
  expect(parseWeightToOz("1 oz")).toBe(1);
});

test("parseWeightToOz: parses '10 oz' format", () => {
  expect(parseWeightToOz("10 oz")).toBe(10);
});

test("parseWeightToOz: parses '0.5 oz' decimal", () => {
  expect(parseWeightToOz("0.5 oz")).toBe(0.5);
});

test("parseWeightToOz: parses '1 ounce' full word", () => {
  expect(parseWeightToOz("1 ounce")).toBe(1);
});

test("parseWeightToOz: parses '10 troy ounce' format", () => {
  expect(parseWeightToOz("10 troy ounce")).toBe(10);
});

test("parseWeightToOz: 'troy oz' format defaults to 1 (not matched)", () => {
  // Regex matches "troy ounce", "ounce", or "oz" but not "troy oz"
  expect(parseWeightToOz("2 troy oz")).toBe(1);
});

// Gram formats from weight string
test("parseWeightToOz: converts '31.1035 gram' to 1 oz", () => {
  expect(parseWeightToOz("31.1035 gram")).toBeCloseTo(1, 4);
});

test("parseWeightToOz: converts '100 gram' to oz", () => {
  expect(parseWeightToOz("100 gram")).toBeCloseTo(3.215, 3);
});

test("parseWeightToOz: converts '50 g' to oz", () => {
  expect(parseWeightToOz("50 g")).toBeCloseTo(1.6075, 4);
});

test("parseWeightToOz: converts '1000 g' to oz", () => {
  expect(parseWeightToOz("1000 g")).toBeCloseTo(32.15, 2);
});

// Case insensitivity
test("parseWeightToOz: handles uppercase OZ", () => {
  expect(parseWeightToOz("5 OZ")).toBe(5);
});

test("parseWeightToOz: handles uppercase GRAM", () => {
  expect(parseWeightToOz("100 GRAM")).toBeCloseTo(3.215, 3);
});

test("parseWeightToOz: handles mixed case Troy Ounce", () => {
  expect(parseWeightToOz("1 Troy Ounce")).toBe(1);
});

// Edge cases - defaults to 1 oz
test("parseWeightToOz: defaults to 1 for empty string", () => {
  expect(parseWeightToOz("")).toBe(1);
});

test("parseWeightToOz: defaults to 1 for invalid format", () => {
  expect(parseWeightToOz("random text")).toBe(1);
});

test("parseWeightToOz: defaults to 1 for unsupported unit", () => {
  expect(parseWeightToOz("10 pounds")).toBe(1);
});

test("parseWeightToOz: defaults to 1 for number without unit", () => {
  expect(parseWeightToOz("5")).toBe(1);
});

test("parseWeightToOz: defaults to 1 for unit without number", () => {
  expect(parseWeightToOz("oz")).toBe(1);
});

// ============================================================================
// extractProductType TESTS
// ============================================================================

// Helper to create minimal PureProduct
const createPureProduct = (overrides: Partial<PureProduct> = {}): PureProduct => ({
  title: "Test Product",
  ...overrides,
});

// Title-based detection - "bar"
test("extractProductType: detects 'bar' from title", () => {
  const product = createPureProduct({ title: "1 oz Gold Bar" });

  expect(extractProductType(product)).toBe("bar");
});

test("extractProductType: detects 'bar' case insensitively", () => {
  const product = createPureProduct({ title: "GOLD BAR 10oz" });

  expect(extractProductType(product)).toBe("bar");
});

test("extractProductType: detects 'bar' in mixed case", () => {
  const product = createPureProduct({ title: "Silver Bar 100g" });

  expect(extractProductType(product)).toBe("bar");
});

// Title-based detection - "coin"
test("extractProductType: detects 'coin' from title", () => {
  const product = createPureProduct({ title: "American Eagle Coin" });

  expect(extractProductType(product)).toBe("coin");
});

test("extractProductType: detects 'coin' case insensitively", () => {
  const product = createPureProduct({ title: "GOLD COIN 1oz" });

  expect(extractProductType(product)).toBe("coin");
});

test("extractProductType: detects 'coin' in mixed case", () => {
  const product = createPureProduct({ title: "Maple Leaf Coin" });

  expect(extractProductType(product)).toBe("coin");
});

// SubCategory fallback
test("extractProductType: uses subCategory title when no bar/coin in title", () => {
  const product = createPureProduct({
    subCategory: { title: "Gold Bars" },
    title: "PAMP Lady Fortuna",
  });

  expect(extractProductType(product)).toBe("gold bars");
});

test("extractProductType: lowercases subCategory title", () => {
  const product = createPureProduct({
    subCategory: { title: "SILVER ROUNDS" },
    title: "Test Product",
  });

  expect(extractProductType(product)).toBe("silver rounds");
});

test("extractProductType: prefers title bar/coin over subCategory", () => {
  const product = createPureProduct({
    subCategory: { title: "Coins" },
    title: "Gold Bar PAMP",
  });

  expect(extractProductType(product)).toBe("bar"); // Title wins
});

// Returns null when no match
test("extractProductType: returns null when no bar/coin and no subCategory", () => {
  const product = createPureProduct({ title: "Gold Bullion" });

  expect(extractProductType(product)).toBeNull();
});

test("extractProductType: returns null for empty subCategory", () => {
  const product = createPureProduct({
    subCategory: undefined,
    title: "Test Product",
  });

  expect(extractProductType(product)).toBeNull();
});

// Real-world examples
test("extractProductType: real example - PAMP bar", () => {
  const product = createPureProduct({
    subCategory: { title: "Gold Bars" },
    title: "1 oz PAMP Suisse Lady Fortuna Gold Bar",
  });

  expect(extractProductType(product)).toBe("bar");
});

test("extractProductType: real example - American Eagle coin", () => {
  const product = createPureProduct({
    subCategory: { title: "Government Coins" },
    title: "2024 American Silver Eagle Coin",
  });

  expect(extractProductType(product)).toBe("coin");
});

test("extractProductType: real example - round via subCategory", () => {
  const product = createPureProduct({
    subCategory: { title: "Silver Rounds" },
    title: "1 oz Silver Buffalo Round",
  });

  // "round" is not a keyword, so it falls through to subCategory
  expect(extractProductType(product)).toBe("silver rounds");
});

test("extractProductType: edge case - both bar and coin in title", () => {
  const product = createPureProduct({
    title: "Gold Bar shaped like a Coin",
  });

  expect(extractProductType(product)).toBe("bar"); // "bar" is checked first
});

test("extractProductType: bullion without bar/coin uses subCategory", () => {
  const product = createPureProduct({
    subCategory: { title: "Bars" },
    title: "Gold Bullion",
  });

  expect(extractProductType(product)).toBe("bars");
});

// ============================================================================
// transformSpotPricesV2 TESTS
// ============================================================================

test("transformSpotPricesV2: transforms gold and silver spot prices", () => {
  const data: PureSpotPriceV2[] = [
    { ask: 2010, bid: 2000, changePositive: true, changePrice: 15, material: "Gold" },
    { ask: 30.5, bid: 30, changePositive: false, changePrice: -0.5, material: "Silver" },
  ];

  const result = transformSpotPricesV2(data);

  expect(result).toHaveLength(2);
  expect(result[0]).toStrictEqual({
    askPrice: 2010,
    bidPrice: 2000,
    metalType: "gold",
    spotPrice: 2000,
  });
  expect(result[1]).toStrictEqual({
    askPrice: 30.5,
    bidPrice: 30,
    metalType: "silver",
    spotPrice: 30,
  });
});

test("transformSpotPricesV2: excludes Bitcoin", () => {
  const data: PureSpotPriceV2[] = [
    { ask: 2010, bid: 2000, changePositive: true, changePrice: 15, material: "Gold" },
    { ask: 65_000, bid: 64_000, changePositive: true, changePrice: 500, material: "Bitcoin" },
  ];

  const result = transformSpotPricesV2(data);

  expect(result).toHaveLength(1);
  expect(result[0].metalType).toBe("gold");
});

test("transformSpotPricesV2: skips unknown materials", () => {
  const data: PureSpotPriceV2[] = [
    { ask: 100, bid: 90, changePositive: true, changePrice: 1, material: "Unobtainium" },
  ];

  const result = transformSpotPricesV2(data);

  expect(result).toHaveLength(0);
});

test("transformSpotPricesV2: handles empty array", () => {
  const result = transformSpotPricesV2([]);

  expect(result).toStrictEqual([]);
});

test("transformSpotPricesV2: includes all four precious metals", () => {
  const data: PureSpotPriceV2[] = [
    { ask: 2010, bid: 2000, changePositive: true, changePrice: 15, material: "Gold" },
    { ask: 30.5, bid: 30, changePositive: false, changePrice: -0.5, material: "Silver" },
    { ask: 1000, bid: 990, changePositive: true, changePrice: 5, material: "Platinum" },
    { ask: 1200, bid: 1180, changePositive: false, changePrice: -10, material: "Palladium" },
  ];

  const result = transformSpotPricesV2(data);

  expect(result).toHaveLength(4);
  expect(result.map((r) => r.metalType)).toStrictEqual(["gold", "silver", "platinum", "palladium"]);
});

test("transformSpotPricesV2: handles case-insensitive material names", () => {
  const data: PureSpotPriceV2[] = [
    { ask: 2010, bid: 2000, changePositive: true, changePrice: 15, material: "GOLD" },
    { ask: 30.5, bid: 30, changePositive: false, changePrice: -0.5, material: "silver" },
    { ask: 1000, bid: 990, changePositive: true, changePrice: 5, material: "Platinum" },
  ];

  const result = transformSpotPricesV2(data);

  expect(result).toHaveLength(3);
  expect(result.map((r) => r.metalType)).toStrictEqual(["gold", "silver", "platinum"]);
});

test("transformSpotPricesV2: excludes bitcoin regardless of casing", () => {
  const data: PureSpotPriceV2[] = [
    { ask: 65_000, bid: 64_000, changePositive: true, changePrice: 500, material: "BITCOIN" },
    { ask: 65_000, bid: 64_000, changePositive: true, changePrice: 500, material: "bitcoin" },
  ];

  const result = transformSpotPricesV2(data);

  expect(result).toHaveLength(0);
});

test("transformSpotPricesV2: uses bid as spotPrice", () => {
  const data: PureSpotPriceV2[] = [
    { ask: 2010, bid: 2000, changePositive: true, changePrice: 15, material: "Gold" },
  ];

  const result = transformSpotPricesV2(data);

  expect(result[0].spotPrice).toBe(result[0].bidPrice);
});

// ============================================================================
// getHighestOfferPrice TESTS
// ============================================================================

test("getHighestOfferPrice: returns highest offer across variants", () => {
  const result = getHighestOfferPrice([
    { highestOffer: { price: 2500 } },
    { highestOffer: { price: 2525 } },
    { highestOffer: { price: 2490 } },
  ]);

  expect(result).toBe(2525);
});

test("getHighestOfferPrice: ignores null offers", () => {
  const result = getHighestOfferPrice([
    { highestOffer: null },
    { highestOffer: { price: 1800 } },
    { highestOffer: null },
  ]);

  expect(result).toBe(1800);
});

test("getHighestOfferPrice: returns null when no offers", () => {
  const result = getHighestOfferPrice([{ highestOffer: null }, {}]);

  expect(result).toBeNull();
});

test("getHighestOfferPrice: returns null for empty variants", () => {
  const result = getHighestOfferPrice([]);

  expect(result).toBeNull();
});

// ============================================================================
// hasMorePages TESTS
// ============================================================================

test("hasMorePages: returns true when more pages available", () => {
  expect(hasMorePages(0, 100, 250)).toBeTruthy();
});

test("hasMorePages: returns true when exactly one more page", () => {
  expect(hasMorePages(100, 100, 250)).toBeTruthy();
});

test("hasMorePages: returns false when on last page", () => {
  expect(hasMorePages(200, 100, 250)).toBeFalsy();
});

test("hasMorePages: returns false when offset equals total", () => {
  expect(hasMorePages(200, 100, 200)).toBeFalsy();
});

test("hasMorePages: returns false when total is 0", () => {
  expect(hasMorePages(0, 100, 0)).toBeFalsy();
});

test("hasMorePages: works with server-capped page size smaller than requested", () => {
  // Requested 100 but server returned 50
  expect(hasMorePages(0, 50, 200)).toBeTruthy();
  expect(hasMorePages(150, 50, 200)).toBeFalsy();
});
