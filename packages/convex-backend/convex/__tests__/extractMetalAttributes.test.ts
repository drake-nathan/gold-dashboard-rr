import { expect, test } from "vitest";

import { extractMetalAttributes, type RawProduct } from "../lib/metalParsing";

// Helper to create a minimal valid RawProduct
const createProduct = (overrides: Partial<RawProduct> = {}): RawProduct => ({
  attributes: [],
  categories: [],
  id: "test-product-1",
  in_stock: true,
  name: "Test Product",
  price: 100,
  retailer_id: "costco",
  url: "https://example.com/product",
  ...overrides,
});

// ============================================================================
// GOLD PRODUCTS
// ============================================================================

test("extractMetalAttributes: extracts gold bar with weight", () => {
  const product = createProduct({
    attributes: [{ key: "Metal Weight", value: "1 oz" }],
    name: "1 oz Gold Bar",
    price: 2500,
  });

  const result = extractMetalAttributes(product);

  expect(result).not.toBeNull();
  expect(result?.metalType).toBe("gold");
  expect(result?.metalWeight).toBe("1 oz");
  expect(result?.pricePerOunce).toBe(2500);
});

test("extractMetalAttributes: extracts gold coin", () => {
  const product = createProduct({
    attributes: [{ key: "Metal Weight", value: "1 troy ounce" }],
    name: "American Gold Eagle Coin",
    price: 2600,
  });

  const result = extractMetalAttributes(product);

  expect(result).not.toBeNull();
  expect(result?.metalType).toBe("gold");
  expect(result?.metalWeight).toBe("1 troy ounce");
  expect(result?.pricePerOunce).toBe(2600);
});

test("extractMetalAttributes: gold with gram weight", () => {
  const product = createProduct({
    attributes: [{ key: "Metal Weight", value: "100 gram" }],
    name: "100g Gold Bar",
    price: 8000,
  });

  const result = extractMetalAttributes(product);

  expect(result).not.toBeNull();
  expect(result?.metalType).toBe("gold");
  expect(result?.metalWeight).toBe("100 gram");
  // 100g = ~3.215 oz, so 8000 / 3.215 ≈ 2488
  expect(result?.pricePerOunce).toBeCloseTo(2488, 0);
});

test("extractMetalAttributes: gold with multiple weight attributes", () => {
  const product = createProduct({
    attributes: [
      { key: "Dimensions", value: "1x2 inches" },
      { key: "Metal Weight", value: "10 oz" },
      { key: "Packaging Weight", value: "12 oz" },
    ],
    name: "10 oz Gold Bar",
    price: 25000,
  });

  const result = extractMetalAttributes(product);

  expect(result).not.toBeNull();
  expect(result?.metalWeight).toBe("10 oz");
  expect(result?.pricePerOunce).toBe(2500);
});

test("extractMetalAttributes: gold with lowercase weight attribute", () => {
  const product = createProduct({
    attributes: [{ key: "weight", value: "5 oz" }],
    name: "5 oz Gold Bar",
    price: 12500,
  });

  const result = extractMetalAttributes(product);

  expect(result).not.toBeNull();
  expect(result?.metalWeight).toBe("5 oz");
  expect(result?.pricePerOunce).toBe(2500);
});

// ============================================================================
// SILVER PRODUCTS
// ============================================================================

test("extractMetalAttributes: extracts silver bar", () => {
  const product = createProduct({
    attributes: [{ key: "Metal Weight", value: "10 oz" }],
    name: "10 oz Silver Bar",
    price: 300,
  });

  const result = extractMetalAttributes(product);

  expect(result).not.toBeNull();
  expect(result?.metalType).toBe("silver");
  expect(result?.metalWeight).toBe("10 oz");
  expect(result?.pricePerOunce).toBe(30);
});

test("extractMetalAttributes: extracts silver coin", () => {
  const product = createProduct({
    attributes: [{ key: "Metal Weight", value: "1 oz" }],
    name: "American Silver Eagle Coin",
    price: 35,
  });

  const result = extractMetalAttributes(product);

  expect(result).not.toBeNull();
  expect(result?.metalType).toBe("silver");
  expect(result?.pricePerOunce).toBe(35);
});

// ============================================================================
// NAME-BASED DETECTION
// ============================================================================

test("extractMetalAttributes: detects gold from name (ounce keyword)", () => {
  const product = createProduct({
    attributes: [{ key: "Metal Weight", value: "2 oz" }],
    name: "2 ounce Gold Bullion",
    price: 5000,
  });

  const result = extractMetalAttributes(product);

  expect(result).not.toBeNull();
  expect(result?.metalType).toBe("gold");
});

test("extractMetalAttributes: detects silver from name (gram keyword)", () => {
  const product = createProduct({
    attributes: [{ key: "Metal Weight", value: "31.1 gram" }],
    name: "Silver Round 31.1 gram",
    price: 30,
  });

  const result = extractMetalAttributes(product);

  expect(result).not.toBeNull();
  expect(result?.metalType).toBe("silver");
});

test("extractMetalAttributes: detects gold from name (oz keyword)", () => {
  const product = createProduct({
    attributes: [{ key: "Metal Weight", value: "1/4 oz" }],
    name: "1/4 oz Gold Coin",
    price: 600,
  });

  const result = extractMetalAttributes(product);

  expect(result).not.toBeNull();
  expect(result?.metalType).toBe("gold");
});

// ============================================================================
// MISSING DATA
// ============================================================================

test("extractMetalAttributes: handles missing weight attribute", () => {
  const product = createProduct({
    attributes: [],
    name: "1 oz Gold Bar",
    price: 2500,
  });

  const result = extractMetalAttributes(product);

  expect(result).not.toBeNull();
  expect(result?.metalType).toBe("gold");
  expect(result?.metalWeight).toBeUndefined();
  expect(result?.pricePerOunce).toBeUndefined();
});

test("extractMetalAttributes: handles missing price", () => {
  const product = createProduct({
    attributes: [{ key: "Metal Weight", value: "1 oz" }],
    name: "1 oz Gold Bar",
    price: 0,
  });

  const result = extractMetalAttributes(product);

  expect(result).not.toBeNull();
  expect(result?.metalWeight).toBe("1 oz");
  expect(result?.pricePerOunce).toBeUndefined();
});

test("extractMetalAttributes: handles unparseable weight", () => {
  const product = createProduct({
    attributes: [{ key: "Metal Weight", value: "varies" }],
    name: "Gold Bar",
    price: 2500,
  });

  const result = extractMetalAttributes(product);

  expect(result).not.toBeNull();
  expect(result?.metalWeight).toBe("varies");
  expect(result?.pricePerOunce).toBeUndefined();
});

// ============================================================================
// REJECTION CASES (returns null)
// ============================================================================

test("extractMetalAttributes: rejects non-metal product (no gold/silver)", () => {
  const product = createProduct({
    name: "Diamond Ring",
  });

  const result = extractMetalAttributes(product);

  expect(result).toBeNull();
});

test("extractMetalAttributes: rejects gold product without weight keywords", () => {
  const product = createProduct({
    name: "Gold Chain Necklace", // Has "gold" but not bar/coin/gram/ounce/oz
  });

  const result = extractMetalAttributes(product);

  expect(result).toBeNull();
});

test("extractMetalAttributes: rejects silver jewelry", () => {
  const product = createProduct({
    name: "Silver Bracelet", // Has "silver" but not bar/coin/gram/ounce/oz
  });

  const result = extractMetalAttributes(product);

  expect(result).toBeNull();
});

test("extractMetalAttributes: accepts gold with 'bar' keyword", () => {
  const product = createProduct({
    attributes: [{ key: "Metal Weight", value: "10 oz" }],
    name: "PAMP Gold Bar 10oz",
    price: 25000,
  });

  const result = extractMetalAttributes(product);

  expect(result).not.toBeNull();
  expect(result?.metalType).toBe("gold");
});

test("extractMetalAttributes: accepts silver with 'coin' keyword", () => {
  const product = createProduct({
    attributes: [{ key: "Metal Weight", value: "1 oz" }],
    name: "Silver Coin - Maple Leaf",
    price: 35,
  });

  const result = extractMetalAttributes(product);

  expect(result).not.toBeNull();
  expect(result?.metalType).toBe("silver");
});

// ============================================================================
// CASE INSENSITIVITY
// ============================================================================

test("extractMetalAttributes: handles uppercase GOLD", () => {
  const product = createProduct({
    attributes: [{ key: "Metal Weight", value: "1 oz" }],
    name: "GOLD BAR 1 OZ",
    price: 2500,
  });

  const result = extractMetalAttributes(product);

  expect(result).not.toBeNull();
  expect(result?.metalType).toBe("gold");
});

test("extractMetalAttributes: handles mixed case Silver", () => {
  const product = createProduct({
    attributes: [{ key: "Metal Weight", value: "10 oz" }],
    name: "Silver Coin AMERICAN EAGLE",
    price: 350,
  });

  const result = extractMetalAttributes(product);

  expect(result).not.toBeNull();
  expect(result?.metalType).toBe("silver");
});

// ============================================================================
// REAL-WORLD EXAMPLES
// ============================================================================

test("extractMetalAttributes: real example - PAMP Fortuna", () => {
  const product = createProduct({
    attributes: [
      { key: "Brand", value: "PAMP" },
      { key: "Metal Weight", value: "1 troy ounce" },
      { key: "Purity", value: ".9999" },
    ],
    brand: "PAMP",
    name: "1 oz PAMP Lady Fortuna Gold Bar .9999 Fine (In Assay)",
    price: 2850,
  });

  const result = extractMetalAttributes(product);

  expect(result).not.toBeNull();
  expect(result?.metalType).toBe("gold");
  expect(result?.metalWeight).toBe("1 troy ounce");
  expect(result?.pricePerOunce).toBe(2850);
  expect(result?.brand).toBe("PAMP");
});

test("extractMetalAttributes: real example - American Eagle", () => {
  const product = createProduct({
    attributes: [
      { key: "Metal Weight", value: "1 oz" },
      { key: "Year", value: "2024" },
    ],
    name: "2024 American Silver Eagle Coin (1 oz)",
    price: 38.5,
  });

  const result = extractMetalAttributes(product);

  expect(result).not.toBeNull();
  expect(result?.metalType).toBe("silver");
  expect(result?.pricePerOunce).toBe(38.5);
});

// ============================================================================
// SPREAD OPERATOR (preserves all original fields)
// ============================================================================

test("extractMetalAttributes: preserves all original product fields", () => {
  const product = createProduct({
    attributes: [{ key: "Metal Weight", value: "1 oz" }],
    brand: "Test Brand",
    categories: ["metals", "gold"],
    currency: "USD",
    in_stock: true,
    is_member_only: true,
    marketing_features: ["Best Value"],
    name: "1 oz Gold Bar",
    price: 2500,
    rating: 4.5,
    short_description: "High quality gold",
    thumbnail: "https://example.com/thumb.jpg",
    total_ratings: 150,
    upc: "123456789",
  });

  const result = extractMetalAttributes(product);

  expect(result).not.toBeNull();
  expect(result?.brand).toBe("Test Brand");
  expect(result?.categories).toStrictEqual(["metals", "gold"]);
  expect(result?.currency).toBe("USD");
  expect(result?.in_stock).toBe(true);
  expect(result?.is_member_only).toBe(true);
  expect(result?.marketing_features).toStrictEqual(["Best Value"]);
  expect(result?.rating).toBe(4.5);
  expect(result?.short_description).toBe("High quality gold");
  expect(result?.thumbnail).toBe("https://example.com/thumb.jpg");
  expect(result?.total_ratings).toBe(150);
  expect(result?.upc).toBe("123456789");
});
