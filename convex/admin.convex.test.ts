import { convexTest } from "convex-test";
import { afterEach, expect, test, vi } from "vitest";

import { api } from "./_generated/api";
import schema from "./schema";
import { modules } from "./test.setup";

afterEach(() => {
  vi.unstubAllEnvs();
});

test("checkIsAdmin uses token identifier instead of subject", async () => {
  vi.stubEnv("ADMIN_USER_IDS", "clerk|admin-user");

  const t = convexTest(schema, modules);

  const asAdmin = t.withIdentity({
    subject: "user_admin_subject",
    tokenIdentifier: "clerk|admin-user",
  });

  const adminCheck = await asAdmin.query(api.admin.checkIsAdmin, {});

  expect(adminCheck).toStrictEqual({
    isAdmin: true,
    userTokenIdentifier: "clerk|admin-user",
  });
});

test("checkIsAdmin does not grant access for matching subject alone", async () => {
  vi.stubEnv("ADMIN_USER_IDS", "clerk|admin-user");

  const t = convexTest(schema, modules);

  const asNonAdmin = t.withIdentity({
    subject: "clerk|admin-user",
    tokenIdentifier: "clerk|different-user",
  });

  const adminCheck = await asNonAdmin.query(api.admin.checkIsAdmin, {});

  expect(adminCheck).toStrictEqual({
    isAdmin: false,
    userTokenIdentifier: "clerk|different-user",
  });
});

test("getProductsForReview joins only matched pure products", async () => {
  vi.stubEnv("ADMIN_USER_IDS", "clerk|admin-user");

  const t = convexTest(schema, modules);

  await t.run(async (ctx) => {
    await ctx.db.insert("pureProducts", {
      currentBidPrice: 2450,
      currentBidPricePerOz: 2450,
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

    await ctx.db.insert("pureProducts", {
      currentBidPrice: 38,
      currentBidPricePerOz: 38,
      lastUpdated: Date.now(),
      manufacturer: "Generic",
      metalType: "silver",
      productName: "1 oz Silver Round",
      productType: "round",
      pureProductId: "pure-silver-1",
      sku: "silver-round-1oz",
      weight: 1,
      weightGrams: null,
    });

    await ctx.db.insert("costcoProducts", {
      brand: "PAMP Suisse",
      categories: [],
      currentInStock: true,
      currentPrice: 2499,
      currentPricePerOunce: 2499,
      firstSeen: Date.now(),
      isMemberOnly: null,
      isOnlineOnly: null,
      lastPriceChange: null,
      lastStockChange: null,
      lastUpdated: Date.now(),
      marketingFeatures: null,
      matchApprovedAt: null,
      matchApprovedBy: null,
      matchStatus: "manual_matched",
      maxQuantity: null,
      metalType: "gold",
      metalWeight: "1 oz",
      name: "1 oz Gold Bar",
      productId: "costco-gold-1",
      pureProductId: "pure-gold-1",
      retailerId: "costco",
      shortDescription: null,
      thumbnail: null,
      upc: null,
      url: "https://example.com/gold",
      verifiedInStock: null,
    });

    await ctx.db.insert("costcoProducts", {
      brand: "Costco",
      categories: [],
      currentInStock: false,
      currentPrice: 41,
      currentPricePerOunce: 41,
      firstSeen: Date.now(),
      isMemberOnly: null,
      isOnlineOnly: null,
      lastPriceChange: null,
      lastStockChange: null,
      lastUpdated: Date.now(),
      marketingFeatures: null,
      matchApprovedAt: null,
      matchApprovedBy: null,
      matchStatus: null,
      maxQuantity: null,
      metalType: "silver",
      metalWeight: "1 oz",
      name: "1 oz Silver Coin",
      productId: "costco-silver-1",
      retailerId: "costco",
      shortDescription: null,
      thumbnail: null,
      upc: null,
      url: "https://example.com/silver",
      verifiedInStock: null,
    });
  });

  const asAdmin = t.withIdentity({
    subject: "user_admin_subject",
    tokenIdentifier: "clerk|admin-user",
  });

  const products = await asAdmin.query(api.admin.getProductsForReview, {});

  expect(products.counts.manual_matched).toBe(1);
  expect(products.counts.unmatched).toBe(1);
  expect(products.manual_matched[0]?.pureProduct).toMatchObject({
    productName: "1 oz Gold Bar",
    pureProductId: "pure-gold-1",
  });
  expect(products.unmatched[0]?.pureProduct).toBeNull();
});
