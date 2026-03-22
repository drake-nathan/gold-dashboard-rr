import { test } from "vitest";

import {
  type ProductCardData,
  filterProducts,
  shouldAutoFlipToOutOfStock,
  sortProducts,
} from "./product-filters";

// Mock product data helpers
const createMockProduct = (overrides: Partial<ProductCardData> = {}): ProductCardData => {
  return {
    currentInStock: true,
    currentPrice: 100,
    currentPricePerOunce: 100,
    isUsingGenericFallback: false,
    lastInStockAt: null,
    metalType: "gold",
    metalWeight: "1 oz",
    name: "Test Product",
    productId: "costco-123",
    pureBidPrice: 95,
    pureBidPricePerOz: 95,
    pureProductName: "Pure Product",
    pureProductSku: "SKU123",
    spread: 5,
    spreadPercentage: 5,
    thumbnail: null,
    url: "https://costco.com/product",
    ...overrides,
  };
};

// === FILTER PRODUCTS TESTS ===

test("filterProducts: filters by metal type - all", ({ expect }) => {
  const goldProducts = [createMockProduct({ metalType: "gold" })];
  const silverProducts = [createMockProduct({ metalType: "silver" })];

  const result = filterProducts(goldProducts, silverProducts, {
    metalFilter: "all",
    showOutOfStock: true,
  });

  expect(result).toHaveLength(2);
  expect(result[0]?.metalType).toBe("gold");
  expect(result[1]?.metalType).toBe("silver");
});

test("filterProducts: filters by metal type - gold only", ({ expect }) => {
  const goldProducts = [createMockProduct({ metalType: "gold" })];
  const silverProducts = [createMockProduct({ metalType: "silver" })];

  const result = filterProducts(goldProducts, silverProducts, {
    metalFilter: "gold",
    showOutOfStock: true,
  });

  expect(result).toHaveLength(1);
  expect(result[0]?.metalType).toBe("gold");
});

test("filterProducts: filters by metal type - silver only", ({ expect }) => {
  const goldProducts = [createMockProduct({ metalType: "gold" })];
  const silverProducts = [createMockProduct({ metalType: "silver" })];

  const result = filterProducts(goldProducts, silverProducts, {
    metalFilter: "silver",
    showOutOfStock: true,
  });

  expect(result).toHaveLength(1);
  expect(result[0]?.metalType).toBe("silver");
});

test("filterProducts: filters out of stock products when showOutOfStock is false", ({ expect }) => {
  const goldProducts = [
    createMockProduct({ currentInStock: true, metalType: "gold" }),
    createMockProduct({ currentInStock: false, metalType: "gold" }),
  ];
  const silverProducts = [
    createMockProduct({ currentInStock: true, metalType: "silver" }),
    createMockProduct({ currentInStock: false, metalType: "silver" }),
  ];

  const result = filterProducts(goldProducts, silverProducts, {
    metalFilter: "all",
    showOutOfStock: false,
  });

  expect(result).toHaveLength(2);
  expect(result.every((p) => p.currentInStock)).toBe(true);
});

test("filterProducts: includes out of stock products when showOutOfStock is true", ({ expect }) => {
  const goldProducts = [
    createMockProduct({ currentInStock: true, metalType: "gold" }),
    createMockProduct({ currentInStock: false, metalType: "gold" }),
  ];
  const silverProducts = [
    createMockProduct({ currentInStock: true, metalType: "silver" }),
    createMockProduct({ currentInStock: false, metalType: "silver" }),
  ];

  const result = filterProducts(goldProducts, silverProducts, {
    metalFilter: "all",
    showOutOfStock: true,
  });

  expect(result).toHaveLength(4);
});

test("filterProducts: returns empty array when no products match", ({ expect }) => {
  const goldProducts = [createMockProduct({ currentInStock: false, metalType: "gold" })];
  const silverProducts: ProductCardData[] = [];

  const result = filterProducts(goldProducts, silverProducts, {
    metalFilter: "silver",
    showOutOfStock: false,
  });

  expect(result).toHaveLength(0);
});

// === SORT PRODUCTS TESTS ===

test("sortProducts: sorts by spread ascending (default)", ({ expect }) => {
  const products = [
    createMockProduct({ spreadPercentage: 10 }),
    createMockProduct({ spreadPercentage: 5 }),
    createMockProduct({ spreadPercentage: 15 }),
  ];

  const result = sortProducts(products, "profit-desc");

  expect(result[0]?.spreadPercentage).toBe(5);
  expect(result[1]?.spreadPercentage).toBe(10);
  expect(result[2]?.spreadPercentage).toBe(15);
});

test("sortProducts: sorts by spread descending", ({ expect }) => {
  const products = [
    createMockProduct({ spreadPercentage: 10 }),
    createMockProduct({ spreadPercentage: 5 }),
    createMockProduct({ spreadPercentage: 15 }),
  ];

  const result = sortProducts(products, "profit-asc");

  expect(result[0]?.spreadPercentage).toBe(15);
  expect(result[1]?.spreadPercentage).toBe(10);
  expect(result[2]?.spreadPercentage).toBe(5);
});

test("sortProducts: handles null spread percentages (profit-desc)", ({ expect }) => {
  const products = [
    createMockProduct({ spreadPercentage: 10 }),
    createMockProduct({ spreadPercentage: null }),
    createMockProduct({ spreadPercentage: 5 }),
  ];

  const result = sortProducts(products, "profit-desc");

  expect(result[0]?.spreadPercentage).toBe(5);
  expect(result[1]?.spreadPercentage).toBe(10);
  expect(result[2]?.spreadPercentage).toBe(null); // null should be last (treated as 999)
});

test("sortProducts: handles null spread percentages (profit-asc)", ({ expect }) => {
  const products = [
    createMockProduct({ spreadPercentage: 10 }),
    createMockProduct({ spreadPercentage: null }),
    createMockProduct({ spreadPercentage: 5 }),
  ];

  const result = sortProducts(products, "profit-asc");

  expect(result[0]?.spreadPercentage).toBe(10);
  expect(result[1]?.spreadPercentage).toBe(5);
  expect(result[2]?.spreadPercentage).toBe(null); // null should be last (treated as -999)
});

test("sortProducts: sorts by price ascending", ({ expect }) => {
  const products = [
    createMockProduct({ currentPrice: 100 }),
    createMockProduct({ currentPrice: 50 }),
    createMockProduct({ currentPrice: 150 }),
  ];

  const result = sortProducts(products, "price-asc");

  expect(result[0]?.currentPrice).toBe(50);
  expect(result[1]?.currentPrice).toBe(100);
  expect(result[2]?.currentPrice).toBe(150);
});

test("sortProducts: sorts by price descending", ({ expect }) => {
  const products = [
    createMockProduct({ currentPrice: 100 }),
    createMockProduct({ currentPrice: 50 }),
    createMockProduct({ currentPrice: 150 }),
  ];

  const result = sortProducts(products, "price-desc");

  expect(result[0]?.currentPrice).toBe(150);
  expect(result[1]?.currentPrice).toBe(100);
  expect(result[2]?.currentPrice).toBe(50);
});

test("sortProducts: sorts by last in stock (most recent first)", ({ expect }) => {
  const products = [
    createMockProduct({ lastInStockAt: 1000 }),
    createMockProduct({ lastInStockAt: 2000 }),
    createMockProduct({ lastInStockAt: 500 }),
  ];

  const result = sortProducts(products, "last-in-stock");

  expect(result[0]?.lastInStockAt).toBe(2000);
  expect(result[1]?.lastInStockAt).toBe(1000);
  expect(result[2]?.lastInStockAt).toBe(500);
});

test("sortProducts: handles null lastInStockAt (currently in stock products)", ({ expect }) => {
  const products = [
    createMockProduct({ lastInStockAt: 1000 }),
    createMockProduct({ lastInStockAt: null }), // Currently in stock
    createMockProduct({ lastInStockAt: 2000 }),
  ];

  const result = sortProducts(products, "last-in-stock");

  expect(result[0]?.lastInStockAt).toBe(2000);
  expect(result[1]?.lastInStockAt).toBe(1000);
  expect(result[2]?.lastInStockAt).toBe(null); // null should be last (-Infinity)
});

test("sortProducts: does not mutate original array", ({ expect }) => {
  const products = [
    createMockProduct({ spreadPercentage: 10 }),
    createMockProduct({ spreadPercentage: 5 }),
  ];

  const original = [...products];
  sortProducts(products, "profit-desc");

  expect(products).toEqual(original); // Original unchanged
});

// === PRODUCTS WITHOUT BIDS TESTS ===

test("sortProducts: places products without bids at bottom (profit-desc)", ({ expect }) => {
  const products = [
    createMockProduct({ pureBidPrice: 95, spreadPercentage: 10 }),
    createMockProduct({ pureBidPrice: null, spreadPercentage: null }), // No bid
    createMockProduct({ pureBidPrice: 90, spreadPercentage: 5 }),
  ];

  const result = sortProducts(products, "profit-desc");

  expect(result[0]?.spreadPercentage).toBe(5);
  expect(result[1]?.spreadPercentage).toBe(10);
  expect(result[2]?.pureBidPrice).toBe(null); // Without bid at bottom
});

test("sortProducts: places products without bids at bottom (profit-asc)", ({ expect }) => {
  const products = [
    createMockProduct({ pureBidPrice: 95, spreadPercentage: 10 }),
    createMockProduct({ pureBidPrice: null, spreadPercentage: null }), // No bid
    createMockProduct({ pureBidPrice: 90, spreadPercentage: 15 }),
  ];

  const result = sortProducts(products, "profit-asc");

  expect(result[0]?.spreadPercentage).toBe(15);
  expect(result[1]?.spreadPercentage).toBe(10);
  expect(result[2]?.pureBidPrice).toBe(null); // Without bid at bottom
});

test("sortProducts: places products without bids at bottom (price-asc)", ({ expect }) => {
  const products = [
    createMockProduct({ currentPrice: 100, pureBidPrice: 95 }),
    createMockProduct({ currentPrice: 50, pureBidPrice: null }), // No bid
    createMockProduct({ currentPrice: 150, pureBidPrice: 140 }),
  ];

  const result = sortProducts(products, "price-asc");

  expect(result[0]?.currentPrice).toBe(100);
  expect(result[1]?.currentPrice).toBe(150);
  expect(result[2]?.pureBidPrice).toBe(null); // Without bid at bottom (even though price is lower)
});

test("sortProducts: places products without bids at bottom (price-desc)", ({ expect }) => {
  const products = [
    createMockProduct({ currentPrice: 100, pureBidPrice: 95 }),
    createMockProduct({ currentPrice: 200, pureBidPrice: null }), // No bid
    createMockProduct({ currentPrice: 150, pureBidPrice: 140 }),
  ];

  const result = sortProducts(products, "price-desc");

  expect(result[0]?.currentPrice).toBe(150);
  expect(result[1]?.currentPrice).toBe(100);
  expect(result[2]?.pureBidPrice).toBe(null); // Without bid at bottom (even though price is higher)
});

test("sortProducts: places products without bids at bottom (last-in-stock)", ({ expect }) => {
  const products = [
    createMockProduct({ lastInStockAt: 1000, pureBidPrice: 95 }),
    createMockProduct({ lastInStockAt: 3000, pureBidPrice: null }), // No bid
    createMockProduct({ lastInStockAt: 2000, pureBidPrice: 190 }),
  ];

  const result = sortProducts(products, "last-in-stock");

  expect(result[0]?.lastInStockAt).toBe(2000);
  expect(result[1]?.lastInStockAt).toBe(1000);
  expect(result[2]?.pureBidPrice).toBe(null); // Without bid at bottom (even though timestamp is most recent)
});

test("sortProducts: handles multiple products without bids", ({ expect }) => {
  const products = [
    createMockProduct({ currentPrice: 100, pureBidPrice: 95 }),
    createMockProduct({ currentPrice: 50, pureBidPrice: null }), // No bid #1
    createMockProduct({ currentPrice: 150, pureBidPrice: 140 }),
    createMockProduct({ currentPrice: 75, pureBidPrice: null }), // No bid #2
  ];

  const result = sortProducts(products, "price-asc");

  expect(result[0]?.pureBidPrice).toBe(95);
  expect(result[1]?.pureBidPrice).toBe(140);
  expect(result[2]?.pureBidPrice).toBe(null); // First without bid
  expect(result[3]?.pureBidPrice).toBe(null); // Second without bid
});

// === AUTO-FLIP LOGIC TESTS ===

test("shouldAutoFlipToOutOfStock: returns true when both counts are zero", ({ expect }) => {
  expect(shouldAutoFlipToOutOfStock(0, 0)).toBe(true);
});

test("shouldAutoFlipToOutOfStock: returns false when gold has stock", ({ expect }) => {
  expect(shouldAutoFlipToOutOfStock(1, 0)).toBe(false);
});

test("shouldAutoFlipToOutOfStock: returns false when silver has stock", ({ expect }) => {
  expect(shouldAutoFlipToOutOfStock(0, 1)).toBe(false);
});

test("shouldAutoFlipToOutOfStock: returns false when both have stock", ({ expect }) => {
  expect(shouldAutoFlipToOutOfStock(5, 3)).toBe(false);
});
