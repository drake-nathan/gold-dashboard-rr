import { expect, test } from "vitest";

import {
  extractCountMultiplier,
  extractWeightInOz,
  getFallbackPureId,
  PURE_FALLBACK_IDS,
} from "../lib/metalParsing";

// ============================================================================
// extractWeightInOz TESTS
// ============================================================================

// Standard ounce formats
test("extractWeightInOz: parses '1 oz' format", () => {
  expect(extractWeightInOz("1 oz")).toBe(1);
});

test("extractWeightInOz: parses '10 oz' format", () => {
  expect(extractWeightInOz("10 oz")).toBe(10);
});

test("extractWeightInOz: parses '100 oz' format", () => {
  expect(extractWeightInOz("100 oz")).toBe(100);
});

// No space between number and unit
test("extractWeightInOz: parses '1oz' without space", () => {
  expect(extractWeightInOz("1oz")).toBe(1);
});

test("extractWeightInOz: parses '10oz' without space", () => {
  expect(extractWeightInOz("10oz")).toBe(10);
});

// Troy ounce format
test("extractWeightInOz: parses '1 troy ounce' format", () => {
  expect(extractWeightInOz("1 troy ounce")).toBe(1);
});

test("extractWeightInOz: parses '10 troy oz' format", () => {
  expect(extractWeightInOz("10 troy oz")).toBe(10);
});

// Decimal ounces
test("extractWeightInOz: parses '0.5 oz' decimal format", () => {
  expect(extractWeightInOz("0.5 oz")).toBe(0.5);
});

test("extractWeightInOz: parses '2.5 oz' decimal format", () => {
  expect(extractWeightInOz("2.5 oz")).toBe(2.5);
});

// Gram formats
test("extractWeightInOz: converts '31.1035 gram' to 1 oz", () => {
  const result = extractWeightInOz("31.1035 gram");

  expect(result).toBeCloseTo(1, 4); // 4 decimal places
});

test("extractWeightInOz: converts '311.035 grams' to 10 oz", () => {
  const result = extractWeightInOz("311.035 grams");

  expect(result).toBeCloseTo(10, 3);
});

test("extractWeightInOz: converts '50 g' to oz", () => {
  const result = extractWeightInOz("50 g");

  expect(result).toBeCloseTo(1.6075, 4); // 50 / 31.1035 ≈ 1.6075
});

test("extractWeightInOz: converts '100 g' to oz", () => {
  const result = extractWeightInOz("100 g");

  expect(result).toBeCloseTo(3.215, 3); // 100 / 31.1035 ≈ 3.215
});

test("extractWeightInOz: converts '1000 gram' to oz", () => {
  const result = extractWeightInOz("1000 gram");

  expect(result).toBeCloseTo(32.15, 2); // 1000 / 31.1035 ≈ 32.15
});

// Edge cases
test("extractWeightInOz: returns null for null input", () => {
  expect(extractWeightInOz(null)).toBeNull();
});

test("extractWeightInOz: returns null for empty string", () => {
  expect(extractWeightInOz("")).toBeNull();
});

test("extractWeightInOz: returns null for invalid format", () => {
  expect(extractWeightInOz("random text")).toBeNull();
});

test("extractWeightInOz: returns null for 'oz' without number", () => {
  expect(extractWeightInOz("oz")).toBeNull();
});

test("extractWeightInOz: returns null for unsupported unit", () => {
  expect(extractWeightInOz("10 pounds")).toBeNull();
});

// Multiple matches (should extract first one)
test("extractWeightInOz: extracts first match when multiple present", () => {
  expect(extractWeightInOz("1 oz gold bar 10 oz silver")).toBe(1);
});

// Case insensitivity
test("extractWeightInOz: handles uppercase OZ", () => {
  expect(extractWeightInOz("5 OZ")).toBe(5);
});

test("extractWeightInOz: handles uppercase GRAM", () => {
  const result = extractWeightInOz("31.1035 GRAM");

  expect(result).toBeCloseTo(1, 4);
});

test("extractWeightInOz: handles mixed case", () => {
  expect(extractWeightInOz("10 Oz")).toBe(10);
});

// ============================================================================
// getFallbackPureId TESTS
// ============================================================================

// Gold weights - exact matches
test("getFallbackPureId: matches gold 1oz exactly", () => {
  expect(getFallbackPureId("gold", 1)).toBe(PURE_FALLBACK_IDS.gold["1oz"]);
});

test("getFallbackPureId: matches gold 5g (0.1607 oz)", () => {
  const weightInOz = 5 / 31.1035; // ~0.1607 oz

  expect(getFallbackPureId("gold", weightInOz)).toBe(PURE_FALLBACK_IDS.gold["5g"]);
});

test("getFallbackPureId: matches gold 20g (0.643 oz)", () => {
  const weightInOz = 20 / 31.1035; // ~0.643 oz

  expect(getFallbackPureId("gold", weightInOz)).toBe(PURE_FALLBACK_IDS.gold["20g"]);
});

test("getFallbackPureId: matches gold 100g (3.215 oz)", () => {
  const weightInOz = 100 / 31.1035; // ~3.215 oz

  expect(getFallbackPureId("gold", weightInOz)).toBe(PURE_FALLBACK_IDS.gold["100g"]);
});

// Gold weights - within tolerance
test("getFallbackPureId: matches gold 1oz within 0.05 tolerance", () => {
  expect(getFallbackPureId("gold", 1.04)).toBe(PURE_FALLBACK_IDS.gold["1oz"]);
  expect(getFallbackPureId("gold", 0.96)).toBe(PURE_FALLBACK_IDS.gold["1oz"]);
});

test("getFallbackPureId: matches gold 5g with slight variation", () => {
  const weightInOz = 5.2 / 31.1035; // Slightly more than 5g

  expect(getFallbackPureId("gold", weightInOz)).toBe(PURE_FALLBACK_IDS.gold["5g"]);
});

// Gold weights - outside tolerance
test("getFallbackPureId: returns null for gold 2oz (no match)", () => {
  expect(getFallbackPureId("gold", 2)).toBeNull();
});

test("getFallbackPureId: returns null for gold 50g (no match)", () => {
  const weightInOz = 50 / 31.1035;

  expect(getFallbackPureId("gold", weightInOz)).toBeNull();
});

// Silver weights - exact matches
test("getFallbackPureId: matches silver 10oz exactly", () => {
  expect(getFallbackPureId("silver", 10)).toBe(PURE_FALLBACK_IDS.silver["10oz"]);
});

test("getFallbackPureId: matches silver 1000oz exactly", () => {
  expect(getFallbackPureId("silver", 1000)).toBe(PURE_FALLBACK_IDS.silver["1000oz"]);
});

// Silver weights - within tolerance
test("getFallbackPureId: matches silver 10oz within 0.5 tolerance", () => {
  expect(getFallbackPureId("silver", 10.4)).toBe(PURE_FALLBACK_IDS.silver["10oz"]);
  expect(getFallbackPureId("silver", 9.6)).toBe(PURE_FALLBACK_IDS.silver["10oz"]);
});

test("getFallbackPureId: matches silver 1000oz within 10 tolerance", () => {
  expect(getFallbackPureId("silver", 1005)).toBe(PURE_FALLBACK_IDS.silver["1000oz"]);
  expect(getFallbackPureId("silver", 995)).toBe(PURE_FALLBACK_IDS.silver["1000oz"]);
});

// Silver weights - outside tolerance
test("getFallbackPureId: returns null for silver 1oz (no match)", () => {
  expect(getFallbackPureId("silver", 1)).toBeNull();
});

test("getFallbackPureId: returns null for silver 100oz (no match)", () => {
  expect(getFallbackPureId("silver", 100)).toBeNull();
});

// Edge cases
test("getFallbackPureId: returns null for 0 oz", () => {
  expect(getFallbackPureId("gold", 0)).toBeNull();
  expect(getFallbackPureId("silver", 0)).toBeNull();
});

test("getFallbackPureId: returns null for negative weight", () => {
  expect(getFallbackPureId("gold", -1)).toBeNull();
  expect(getFallbackPureId("silver", -10)).toBeNull();
});

// ============================================================================
// PURE_FALLBACK_IDS CONSTANT TESTS
// ============================================================================

test("pURE_FALLBACK_IDS: has gold fallback IDs", () => {
  expect(PURE_FALLBACK_IDS.gold).toBeDefined();
  expect(Object.keys(PURE_FALLBACK_IDS.gold)).toHaveLength(4);
});

test("pURE_FALLBACK_IDS: has silver fallback IDs", () => {
  expect(PURE_FALLBACK_IDS.silver).toBeDefined();
  expect(Object.keys(PURE_FALLBACK_IDS.silver)).toHaveLength(2);
});

test("pURE_FALLBACK_IDS: all IDs are valid UUIDs", () => {
  const uuidRegex = /^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i;

  Object.values(PURE_FALLBACK_IDS.gold).forEach((id) => {
    expect(id).toMatch(uuidRegex);
  });

  Object.values(PURE_FALLBACK_IDS.silver).forEach((id) => {
    expect(id).toMatch(uuidRegex);
  });
});

// ============================================================================
// extractCountMultiplier TESTS
// ============================================================================

// Standard count formats
test("extractCountMultiplier: parses '20-count' format", () => {
  expect(extractCountMultiplier("1 oz PAMP Lady of Liberty Silver Bar, 20-count")).toBe(20);
});

test("extractCountMultiplier: parses '20 count' format with space", () => {
  expect(extractCountMultiplier("Silver Coin 20 count")).toBe(20);
});

test("extractCountMultiplier: parses '5-pack' format", () => {
  expect(extractCountMultiplier("Gold Bar 5-pack")).toBe(5);
});

test("extractCountMultiplier: parses '10 pack' format with space", () => {
  expect(extractCountMultiplier("Silver Round 10 pack")).toBe(10);
});

test("extractCountMultiplier: parses '3-piece' format", () => {
  expect(extractCountMultiplier("Coin Set 3-piece")).toBe(3);
});

test("extractCountMultiplier: parses '12 pc' format", () => {
  expect(extractCountMultiplier("Silver Bars 12 pc")).toBe(12);
});

// Box/set formats
test("extractCountMultiplier: parses 'box of 20' format", () => {
  expect(extractCountMultiplier("Silver Eagles box of 20")).toBe(20);
});

test("extractCountMultiplier: parses 'set of 5' format", () => {
  expect(extractCountMultiplier("Gold Coins set of 5")).toBe(5);
});

test("extractCountMultiplier: parses 'pack of 10' format", () => {
  expect(extractCountMultiplier("Silver Rounds pack of 10")).toBe(10);
});

// Case insensitivity
test("extractCountMultiplier: handles uppercase COUNT", () => {
  expect(extractCountMultiplier("Bars 20-COUNT")).toBe(20);
});

test("extractCountMultiplier: handles mixed case Pack", () => {
  expect(extractCountMultiplier("Coins 5-Pack")).toBe(5);
});

test("extractCountMultiplier: handles uppercase BOX OF", () => {
  expect(extractCountMultiplier("Coins BOX OF 25")).toBe(25);
});

// No multiplier (should return 1)
test("extractCountMultiplier: returns 1 for single items", () => {
  expect(extractCountMultiplier("1 oz Gold Bar")).toBe(1);
});

test("extractCountMultiplier: returns 1 for products without count", () => {
  expect(extractCountMultiplier("PAMP Suisse Lady Fortuna Gold Bar")).toBe(1);
});

test("extractCountMultiplier: returns 1 for weight-only names", () => {
  expect(extractCountMultiplier("10 oz Silver Bar")).toBe(1);
});

// Edge cases
test("extractCountMultiplier: handles empty string", () => {
  expect(extractCountMultiplier("")).toBe(1);
});

test("extractCountMultiplier: doesn't confuse weight with count", () => {
  // "10 oz" should not be parsed as count
  expect(extractCountMultiplier("10 oz Silver Bar")).toBe(1);
});

test("extractCountMultiplier: handles real Costco product names", () => {
  expect(extractCountMultiplier("2025 1 oz American Eagle Silver Coin, 20-count")).toBe(20);
  expect(extractCountMultiplier("1 oz PAMP Lady of Liberty Silver Bar, 20-count")).toBe(20);
});
