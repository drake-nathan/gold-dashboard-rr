/**
 * Smoke test to verify convex-test setup works correctly.
 */

import { convexTest } from "convex-test";
import { expect, test } from "vitest";

import { api } from "./_generated/api";
import schema from "./schema";
import { modules } from "./test.setup";

test("dashboard queries return empty data when database is empty", async () => {
  const t = convexTest(schema, modules);

  const summary = await t.query(api.dashboard.getDashboardSummary, {});
  const products = await t.query(api.dashboard.getDashboardProducts, {});

  expect(summary).toMatchObject({
    goldProducts: { inStock: 0, total: 0 },
    lastFetch: null,
    marketPrices: [],
    silverProducts: { inStock: 0, total: 0 },
    totalProducts: 0,
  });
  expect(products).toMatchObject({
    goldProducts: [],
    silverProducts: [],
  });
});

test("direct DB access works for inserting and querying data", async () => {
  const t = convexTest(schema, modules);

  // Insert a test product directly
  await t.run(async (ctx) => {
    await ctx.db.insert("costcoProducts", {
      brand: "Test Brand",
      categories: ["Test Category"],
      currentInStock: true,
      currentPrice: 2500,
      currentPricePerOunce: 2500,
      firstSeen: Date.now(),
      // Optional fields
      isMemberOnly: null,
      isOnlineOnly: null,
      lastPriceChange: null,
      lastStockChange: null,
      lastUpdated: Date.now(),
      marketingFeatures: null,
      maxQuantity: null,
      metalType: "gold",
      metalWeight: "1 oz",
      name: "Test Gold Bar",
      productId: "test-gold-1",
      retailerId: "test-retailer",
      shortDescription: null,
      thumbnail: null,
      upc: null,
      url: "https://example.com/test",
    });
  });

  // Query and verify the data
  const summary = await t.query(api.dashboard.getDashboardSummary, {});
  const products = await t.query(api.dashboard.getDashboardProducts, {});

  expect(summary.totalProducts).toBe(1);
  expect(summary.goldProducts.total).toBe(1);
  expect(summary.goldProducts.inStock).toBe(1);
  expect(products.goldProducts).toHaveLength(1);
  expect(products.goldProducts[0].name).toBe("Test Gold Bar");
});

test("dashboard products use related pure products when present", async () => {
  const t = convexTest(schema, modules);

  await t.run(async (ctx) => {
    await ctx.db.insert("pureProducts", {
      currentBidPrice: 2450,
      currentBidPricePerOz: 2450,
      isGenericFallback: false,
      lastUpdated: Date.now(),
      manufacturer: "PAMP Suisse",
      metalType: "gold",
      productName: "1 oz Gold Bar",
      productType: "bar",
      pureProductId: "pure-gold-1",
      sku: "gold-bar-1oz",
      weight: 1,
      weightGrams: null,
    });

    await ctx.db.insert("costcoProducts", {
      brand: "PAMP Suisse",
      categories: ["Gold"],
      currentInStock: true,
      currentPrice: 2500,
      currentPricePerOunce: 2500,
      firstSeen: Date.now(),
      isMemberOnly: null,
      isOnlineOnly: null,
      lastPriceChange: null,
      lastStockChange: null,
      lastUpdated: Date.now(),
      marketingFeatures: null,
      maxQuantity: null,
      metalType: "gold",
      metalWeight: "1 oz",
      name: "Test Gold Bar",
      productId: "test-gold-1",
      pureProductId: "pure-gold-1",
      retailerId: "test-retailer",
      shortDescription: null,
      thumbnail: null,
      upc: null,
      url: "https://example.com/test",
      verifiedInStock: null,
    });
  });

  const products = await t.query(api.dashboard.getDashboardProducts, {});

  expect(products.goldProducts[0]).toMatchObject({
    pureBidPrice: 2450,
    pureProductName: "1 oz Gold Bar",
    pureSpread: 50,
  });
});
