import { convexTest } from "convex-test";
import { expect, test, vi } from "vitest";

import { api } from "./_generated/api";
import schema from "./schema";
import { modules } from "./test.setup";

const createTestProduct = ({
  currentInStock = true,
  currentPrice = 2500,
  currentPricePerOunce = 2500,
  lastInStockAt = null,
  matchStatus,
  metalType = "gold" as const,
  name,
  productId,
  pureProductId,
}: {
  currentInStock?: boolean;
  currentPrice?: number;
  currentPricePerOunce?: null | number;
  lastInStockAt?: null | number;
  matchStatus?:
    | "auto_matched"
    | "fallback"
    | "manual_matched"
    | "needs_review"
    | "pending_approval"
    | null;
  metalType?: "gold" | "silver";
  name: string;
  productId: string;
  pureProductId?: null | string;
}) => ({
  brand: "Test Brand",
  categories: [metalType],
  currentInStock,
  currentPrice,
  currentPricePerOunce,
  firstSeen: Date.now(),
  isMemberOnly: null,
  isOnlineOnly: null,
  lastInStockAt,
  lastPriceChange: null,
  lastStockChange: null,
  lastUpdated: Date.now(),
  marketingFeatures: null,
  matchApprovedAt: null,
  matchApprovedBy: null,
  matchStatus,
  maxQuantity: null,
  metalType,
  metalWeight: "1 oz",
  name,
  productId,
  pureProductId,
  retailerId: "costco",
  shortDescription: null,
  thumbnail: null,
  upc: null,
  url: `https://example.com/${productId}`,
  verifiedInStock: null,
});

test("dashboard queries keep mixed product and summary shapes aligned", async () => {
  const t = convexTest(schema, modules);
  const now = Date.now();

  await t.run(async (ctx) => {
    await ctx.db.insert("pureProducts", {
      currentBidPrice: 2450,
      currentBidPricePerOz: 2450,
      isGenericFallback: false,
      lastUpdated: now,
      manufacturer: "PAMP Suisse",
      metalType: "gold",
      productName: "Matched Gold Bar",
      productType: "bar",
      pureProductId: "pure-gold-direct",
      sku: "gold-direct",
      weight: 1,
      weightGrams: null,
    });

    await ctx.db.insert("pureProducts", {
      currentBidPrice: 34,
      currentBidPricePerOz: 34,
      isGenericFallback: true,
      lastUpdated: now,
      manufacturer: "Generic",
      metalType: "silver",
      productName: "Generic Silver Fallback",
      productType: "round",
      pureProductId: "pure-silver-fallback",
      sku: "silver-fallback",
      weight: 1,
      weightGrams: null,
    });

    await ctx.db.insert("collectPurePrices", {
      askPrice: null,
      bidPrice: 32,
      isMock: false,
      metalType: "silver",
      spotPrice: 33,
      timestamp: now,
    });

    await ctx.db.insert("marketPrices", {
      assetType: "gold",
      currentPrice: 2400,
      lastUpdated: now,
      percentChange: 1.2,
      symbol: "XAU",
    });

    await ctx.db.insert("marketPrices", {
      assetType: "silver",
      currentPrice: 31,
      lastUpdated: now,
      percentChange: -0.4,
      symbol: "XAG",
    });

    await ctx.db.insert("fetchRuns", {
      creditsRemaining: null,
      error: null,
      priceChanges: 2,
      productsFound: 3,
      productsUpdated: 3,
      source: "costco",
      stockChanges: 1,
      timestamp: now,
    });

    await ctx.db.insert(
      "costcoProducts",
      createTestProduct({
        currentPrice: 2499,
        currentPricePerOunce: 2499,
        metalType: "gold",
        name: "Matched Gold Product",
        productId: "gold-1",
        pureProductId: "pure-gold-direct",
      }),
    );

    await ctx.db.insert(
      "costcoProducts",
      createTestProduct({
        currentInStock: false,
        currentPrice: 39,
        currentPricePerOunce: 39,
        lastInStockAt: now - 1000,
        metalType: "silver",
        name: "Fallback Silver Product",
        productId: "silver-1",
      }),
    );
  });

  const summary = await t.query(api.dashboard.getDashboardSummary, {});
  const products = await t.query(api.dashboard.getDashboardProducts, {});

  expect(summary).toMatchObject({
    goldProducts: { inStock: 1, total: 1 },
    lastFetch: {
      priceChanges: 2,
      productsFound: 3,
      stockChanges: 1,
      timestamp: now,
    },
    marketPrices: [
      {
        assetType: "gold",
        currentPrice: 2400,
        percentChange: 1.2,
        symbol: "XAU",
      },
      {
        assetType: "silver",
        currentPrice: 31,
        percentChange: -0.4,
        symbol: "XAG",
      },
    ],
    silverProducts: { inStock: 0, total: 1 },
    totalProducts: 2,
  });

  expect(products.goldProducts[0]).toMatchObject({
    isUsingGenericFallback: false,
    name: "Matched Gold Product",
    productId: "gold-1",
    pureBidPrice: 2450,
    pureBidPricePerOz: 2450,
    pureProductName: "Matched Gold Bar",
    pureProductSku: "gold-direct",
    pureSpread: 49,
  });

  expect(products.silverProducts[0]).toMatchObject({
    isUsingGenericFallback: true,
    lastInStockAt: now - 1000,
    name: "Fallback Silver Product",
    productId: "silver-1",
    pureBidPrice: 34,
    pureBidPricePerOz: 34,
    pureProductName: "Generic Silver Fallback",
    pureProductSku: "silver-fallback",
    pureSpread: 5,
  });
});

test("dashboard summary rejects market price result sets beyond the safe limit", async () => {
  const t = convexTest(schema, modules);

  await t.run(async (ctx) => {
    for (let index = 0; index < 11; index += 1) {
      await ctx.db.insert("marketPrices", {
        assetType: "gold",
        currentPrice: 2400 + index,
        lastUpdated: Date.now() + index,
        percentChange: null,
        symbol: `XAU-${index}`,
      });
    }
  });

  await expect(t.query(api.dashboard.getDashboardSummary, {})).rejects.toThrow(
    "dashboard market prices exceeded safe query limit of 10",
  );
});

test("dashboard products reject when per-metal product scans exceed the safe limit", async () => {
  const t = convexTest(schema, modules);

  await t.run(async (ctx) => {
    for (let index = 0; index < 1001; index += 1) {
      await ctx.db.insert(
        "costcoProducts",
        createTestProduct({
          metalType: "gold",
          name: `Gold Product ${index}`,
          productId: `gold-product-${index}`,
        }),
      );
    }
  });

  await expect(t.query(api.dashboard.getDashboardProducts, {})).rejects.toThrow(
    "dashboard gold products exceeded safe query limit of 1000",
  );
});

test("admin review counts reject when combined action-needed products exceed the safe limit", async () => {
  vi.stubEnv("ADMIN_USER_IDS", "clerk|admin-user");

  const t = convexTest(schema, modules);
  const asAdmin = t.withIdentity({
    subject: "user_admin_subject",
    tokenIdentifier: "clerk|admin-user",
  });

  await t.run(async (ctx) => {
    for (let index = 0; index < 1001; index += 1) {
      await ctx.db.insert(
        "costcoProducts",
        createTestProduct({
          matchStatus: "pending_approval",
          metalType: "gold",
          name: `Pending ${index}`,
          productId: `pending-${index}`,
        }),
      );

      await ctx.db.insert(
        "costcoProducts",
        createTestProduct({
          matchStatus: "needs_review",
          metalType: "silver",
          name: `Review ${index}`,
          productId: `review-${index}`,
        }),
      );
    }
  });

  await expect(asAdmin.query(api.admin.getProductsForReviewCounts, {})).rejects.toThrow(
    "admin action needed products exceeded safe query limit of 2000",
  );
});
