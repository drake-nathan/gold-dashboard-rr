import { expect, test } from "vitest";

import {
  extractProductType,
  parseWeightToOz,
  type PureProduct,
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
const createPureProduct = (
  overrides: Partial<PureProduct> = {},
): PureProduct => ({
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
