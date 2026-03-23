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

test("getProductsForReviewStatus joins only matched pure products", async () => {
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

  const counts = await asAdmin.query(api.admin.getProductsForReviewCounts, {});
  const manualMatched = await asAdmin.query(api.admin.getProductsForReviewStatus, {
    status: "manual_matched",
  });
  const unmatched = await asAdmin.query(api.admin.getProductsForReviewStatus, {
    status: "unmatched",
  });

  expect(counts.manual_matched).toBe(1);
  expect(counts.unmatched).toBe(1);
  expect(manualMatched[0]?.pureProduct).toMatchObject({
    productName: "1 oz Gold Bar",
    pureProductId: "pure-gold-1",
  });
  expect(unmatched[0]?.pureProduct).toBeNull();
});

test("getProductsForReviewStatus combines pending approval and needs review for action_needed", async () => {
  vi.stubEnv("ADMIN_USER_IDS", "clerk|admin-user");

  const t = convexTest(schema, modules);

  await t.run(async (ctx) => {
    const now = Date.now();

    await ctx.db.insert("costcoProducts", {
      brand: "Brand A",
      categories: [],
      currentInStock: true,
      currentPrice: 2499,
      currentPricePerOunce: 2499,
      firstSeen: now,
      isMemberOnly: null,
      isOnlineOnly: null,
      lastPriceChange: null,
      lastStockChange: null,
      lastUpdated: now,
      marketingFeatures: null,
      matchApprovedAt: null,
      matchApprovedBy: null,
      matchStatus: "needs_review",
      maxQuantity: null,
      metalType: "gold",
      metalWeight: "1 oz",
      name: "Needs Review Product",
      productId: "review-1",
      retailerId: "costco",
      shortDescription: null,
      thumbnail: null,
      upc: null,
      url: "https://example.com/review-1",
      verifiedInStock: null,
    });

    await ctx.db.insert("costcoProducts", {
      brand: "Brand B",
      categories: [],
      currentInStock: true,
      currentPrice: 2599,
      currentPricePerOunce: 2599,
      firstSeen: now,
      isMemberOnly: null,
      isOnlineOnly: null,
      lastPriceChange: null,
      lastStockChange: null,
      lastUpdated: now,
      marketingFeatures: null,
      matchApprovedAt: null,
      matchApprovedBy: null,
      matchStatus: "pending_approval",
      maxQuantity: null,
      metalType: "gold",
      metalWeight: "1 oz",
      name: "Pending Product",
      productId: "pending-1",
      retailerId: "costco",
      shortDescription: null,
      thumbnail: null,
      upc: null,
      url: "https://example.com/pending-1",
      verifiedInStock: null,
    });
  });

  const asAdmin = t.withIdentity({
    subject: "user_admin_subject",
    tokenIdentifier: "clerk|admin-user",
  });

  const counts = await asAdmin.query(api.admin.getProductsForReviewCounts, {});
  const actionNeeded = await asAdmin.query(api.admin.getProductsForReviewStatus, {
    status: "action_needed",
  });

  expect(counts.needs_review).toBe(1);
  expect(counts.pending_approval).toBe(1);
  expect(actionNeeded.map((product) => product.productId)).toStrictEqual(["pending-1", "review-1"]);
});
