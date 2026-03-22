/**
 * Smoke test to verify convex-test setup works correctly.
 */

import { convexTest } from "convex-test";
import { expect, test } from "vitest";

import { api } from "./_generated/api";
import schema from "./schema";
import { modules } from "./test.setup";

test("dashboard.getStats returns empty data when database is empty", async () => {
  const t = convexTest(schema, modules);

  const stats = await t.query(api.dashboard.getStats, {});

  expect(stats).toMatchObject({
    goldProducts: { bestSpread: [], inStock: 0, total: 0 },
    lastFetch: null,
    marketPrices: [],
    silverProducts: { bestSpread: [], inStock: 0, total: 0 },
    totalProducts: 0,
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
  const stats = await t.query(api.dashboard.getStats, {});

  expect(stats.totalProducts).toBe(1);
  expect(stats.goldProducts.total).toBe(1);
  expect(stats.goldProducts.inStock).toBe(1);
  expect(stats.goldProducts.bestSpread).toHaveLength(1);
  expect(stats.goldProducts.bestSpread[0].name).toBe("Test Gold Bar");
});
