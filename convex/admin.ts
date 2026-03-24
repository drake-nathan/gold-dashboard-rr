import { v } from "convex/values";

import { action, internalMutation, mutation, query } from "./_generated/server";
import { requireAdmin, reviewStatusValidator } from "./admin/access";
import { fetchAndAddPureProductHelper, rematchProductHelper } from "./admin/actions";
import {
  getAdminStatusHelper,
  getAllPureProductsHelper,
  getPureProductBySkuHelper,
  searchPureProductsHelper,
} from "./admin/catalog";
import {
  applyFallbackHelper,
  approveMatchHelper,
  clearManualMatchHelper,
  confirmMatchHelper,
  selectMatchHelper,
} from "./admin/mutations";
import { insertPureProductHelper } from "./admin/pure";
import {
  enrichReviewProducts,
  getProductReviewCounts,
  getTopMatchesForProduct,
  listProductsForReviewStatus,
} from "./admin/review";

/**
 * Get product counts for admin review tabs
 */
export const getProductsForReviewCounts = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    return getProductReviewCounts(ctx);
  },
});

/**
 * Get products for a single admin review tab
 */
export const getProductsForReviewStatus = query({
  args: {
    status: reviewStatusValidator,
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const products = await listProductsForReviewStatus(ctx, args.status);
    return enrichReviewProducts(ctx, products);
  },
});

/**
 * Get top N match candidates for a Costco product
 * Runs the same scoring algorithm as auto-matching but returns top results
 */
export const getTopMatches = query({
  args: {
    costcoProductId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return getTopMatchesForProduct(ctx, {
      costcoProductId: args.costcoProductId,
      limit: args.limit ?? 5,
    });
  },
});

/**
 * Find a Pure product by SKU (from URL slug)
 * URL format: https://www.collectpure.com/marketplace/product/{sku}
 */
export const getPureProductBySku = query({
  args: {
    sku: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return getPureProductBySkuHelper(ctx, args.sku);
  },
});

/**
 * Search Pure products by name
 */
export const searchPureProducts = query({
  args: {
    limit: v.optional(v.number()),
    metalType: v.optional(v.union(v.literal("gold"), v.literal("silver"))),
    query: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return searchPureProductsHelper(ctx, args);
  },
});

/**
 * Select a product match (sets pending_approval status)
 * Use confirmMatch to finalize the selection
 */
export const selectMatch = mutation({
  args: {
    costcoProductId: v.string(),
    pureProductId: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return selectMatchHelper(ctx, args);
  },
});

/**
 * Confirm a pending match - moves from pending_approval to manual_matched
 */
export const confirmMatch = mutation({
  args: {
    costcoProductId: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireAdmin(ctx);
    return confirmMatchHelper(ctx, { costcoProductId: args.costcoProductId, userId });
  },
});

/**
 * Legacy: Approve or change a product match directly
 * Sets matchStatus to manual_matched and records approval metadata
 *
 * @deprecated Use selectMatch + confirmMatch for two-step workflow
 */
export const approveMatch = mutation({
  args: {
    costcoProductId: v.string(),
    pureProductId: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireAdmin(ctx);
    return approveMatchHelper(ctx, { ...args, userId });
  },
});

/**
 * Use fallback for a product (removes specific Pure product match)
 */
export const useFallback = mutation({
  args: {
    costcoProductId: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireAdmin(ctx);
    return applyFallbackHelper(ctx, { costcoProductId: args.costcoProductId, userId });
  },
});

/**
 * Re-run auto-matching for a product (for "rematch" button)
 * Does NOT override if already manually matched
 */
export const rematchProduct = action({
  args: {
    costcoProductId: v.string(),
    force: v.optional(v.boolean()), // If true, override even manual matches
  },
  handler: (ctx, args) => rematchProductHelper(ctx, args),
});

// Internal mutation to check admin access (used by actions)
export const checkAdminAccess = internalMutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return { authorized: true };
  },
});

// Internal mutation to clear manual match status
export const clearManualMatch = internalMutation({
  args: {
    costcoProductId: v.string(),
  },
  handler: (ctx, args) => clearManualMatchHelper(ctx, args),
});

/**
 * Get all Pure products (for dropdown/search)
 */
export const getAllPureProducts = query({
  args: {
    metalType: v.optional(v.union(v.literal("gold"), v.literal("silver"))),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return getAllPureProductsHelper(ctx, args);
  },
});

/**
 * Check if current user is admin (for frontend auth checks)
 */
export const checkIsAdmin = query({
  args: {},
  handler: (ctx) => getAdminStatusHelper(ctx),
});

/**
 * Fetch a Pure product by SKU from the API and add it to the database
 */
export const fetchAndAddPureProduct = action({
  args: {
    sku: v.string(),
  },
  handler: (ctx, args) => fetchAndAddPureProductHelper(ctx, args),
});

/**
 * Internal mutation to insert a Pure product
 */
export const insertPureProduct = internalMutation({
  args: {
    currentBidPrice: v.union(v.number(), v.null()),
    currentBidPricePerOz: v.union(v.number(), v.null()),
    isGenericFallback: v.boolean(),
    lastUpdated: v.number(),
    manufacturer: v.union(v.string(), v.null()),
    metalType: v.union(v.literal("gold"), v.literal("silver")),
    productName: v.string(),
    productType: v.union(v.string(), v.null()),
    pureProductId: v.string(),
    sku: v.union(v.string(), v.null()),
    weight: v.number(),
    weightGrams: v.union(v.number(), v.null()),
  },
  handler: async (ctx, args) => {
    return insertPureProductHelper(ctx, args);
  },
});
