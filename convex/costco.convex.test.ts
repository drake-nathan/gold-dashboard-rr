/**
 * Costco - Convex Function Tests
 *
 * Covers the out-of-stock sweep, which behaves differently per provider:
 * - Bright: match a catalog snapshot (item numbers) against retailerId, so a
 *   failed detail fetch leaves a product's last-known state alone.
 * - Unwrangle: "missing from search = OOS", matched on productId.
 */

import { convexTest } from "convex-test";
import { expect, test } from "vitest";

import { internal } from "./_generated/api";
import schema from "./schema";
import { modules } from "./test.setup";

let seq = 0;

const inStockProduct = (overrides: { name?: string; productId: string; retailerId: string }) => ({
  brand: null,
  categories: ["https://www.costco.com/precious-metals.html"],
  currentInStock: true,
  currentPrice: 719.99,
  currentPricePerOunce: 72,
  firstSeen: 1,
  isMemberOnly: null,
  isOnlineOnly: null,
  lastPriceChange: null,
  lastStockChange: null,
  lastUpdated: 1,
  marketingFeatures: null,
  maxQuantity: null,
  metalType: "silver" as const,
  metalWeight: "10 oz",
  name: overrides.name ?? `Product ${(seq += 1)}`,
  productId: overrides.productId,
  retailerId: overrides.retailerId,
  shortDescription: null,
  thumbnail: null,
  upc: null,
  url: "https://www.costco.com/x.html",
});

test("bright OOS sweep marks delisted products OOS but leaves failed-fetch products alone (matchField=retailerId)", async () => {
  const t = convexTest(schema, modules);

  await t.run(async (ctx) => {
    await ctx.db.insert(
      "costcoProducts",
      inStockProduct({ productId: "sku-A", retailerId: "111" }),
    );
    await ctx.db.insert(
      "costcoProducts",
      inStockProduct({ productId: "sku-B", retailerId: "222" }),
    );
    await ctx.db.insert(
      "costcoProducts",
      inStockProduct({ productId: "sku-C", retailerId: "333" }),
    );
  });

  // Catalog (category page) still lists item numbers 111 and 333. 222 is gone
  // (delisted). 333 is present even though its detail fetch failed this run.
  const result = await t.mutation(internal.costco.markUnseenProductsOutOfStock, {
    matchField: "retailerId",
    seenProductIds: ["111", "333"],
    timestamp: 1000,
  });

  expect(result.stockChanges).toBe(1);

  const states = await t.run(async (ctx) => {
    const rows = await ctx.db.query("costcoProducts").collect();
    return Object.fromEntries(rows.map((r) => [r.retailerId, r.currentInStock]));
  });

  expect(states["111"]).toBeTruthy(); // still in catalog → untouched
  expect(states["222"]).toBeFalsy(); // delisted → OOS
  expect(states["333"]).toBeTruthy(); // detail fetch failed but still in catalog → untouched
});

test("unwrangle OOS sweep marks products missing from search OOS (matchField defaults to productId)", async () => {
  const t = convexTest(schema, modules);

  await t.run(async (ctx) => {
    await ctx.db.insert(
      "costcoProducts",
      inStockProduct({ productId: "sku-A", retailerId: "111" }),
    );
    await ctx.db.insert(
      "costcoProducts",
      inStockProduct({ productId: "sku-B", retailerId: "222" }),
    );
  });

  const result = await t.mutation(internal.costco.markUnseenProductsOutOfStock, {
    seenProductIds: ["sku-A"],
    timestamp: 1000,
  });

  expect(result.stockChanges).toBe(1);

  const states = await t.run(async (ctx) => {
    const rows = await ctx.db.query("costcoProducts").collect();
    return Object.fromEntries(rows.map((r) => [r.productId, r.currentInStock]));
  });

  expect(states["sku-A"]).toBeTruthy();
  expect(states["sku-B"]).toBeFalsy();
});
