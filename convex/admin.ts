import { v } from "convex/values";

import { internal } from "./_generated/api";
import { action, internalMutation, mutation, query } from "./_generated/server";
import { isAdmin, requireAdmin, reviewStatusValidator } from "./admin/access";
import {
  applyFallbackHelper,
  approveMatchHelper,
  clearManualMatchHelper,
  confirmMatchHelper,
  selectMatchHelper,
} from "./admin/mutations";
import {
  enrichReviewProducts,
  getProductReviewCounts,
  getTopMatchesForProduct,
  listProductsForReviewStatus,
} from "./admin/review";
import { fetchPureProductBySku, toPureProductInsertData } from "./admin/pure";

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

    const pureProduct = await ctx.db
      .query("pureProducts")
      .withIndex("by_sku", (q) => q.eq("sku", args.sku))
      .first();

    if (!pureProduct) {
      return null;
    }

    return {
      currentBidPrice: pureProduct.currentBidPrice,
      currentBidPricePerOz: pureProduct.currentBidPricePerOz,
      isGenericFallback: pureProduct.isGenericFallback,
      manufacturer: pureProduct.manufacturer,
      metalType: pureProduct.metalType,
      productName: pureProduct.productName,
      productType: pureProduct.productType,
      pureProductId: pureProduct.pureProductId,
      sku: pureProduct.sku,
      weight: pureProduct.weight,
    };
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

    const limit = args.limit ?? 10;
    const searchQuery = args.query.toLowerCase();

    let pureProducts;
    if (args.metalType) {
      pureProducts = await ctx.db
        .query("pureProducts")
        .withIndex("by_metal_type", (q) => q.eq("metalType", args.metalType ?? "gold"))
        .collect();
    } else {
      pureProducts = await ctx.db.query("pureProducts").collect();
    }

    // Filter by search query
    const filtered = pureProducts.filter((p) => {
      const name = p.productName.toLowerCase();
      const sku = p.sku?.toLowerCase() ?? "";
      const manufacturer = p.manufacturer?.toLowerCase() ?? "";

      return (
        name.includes(searchQuery) ||
        sku.includes(searchQuery) ||
        manufacturer.includes(searchQuery)
      );
    });

    // Return top results
    return filtered.slice(0, limit).map((p) => ({
      currentBidPrice: p.currentBidPrice,
      isGenericFallback: p.isGenericFallback,
      manufacturer: p.manufacturer,
      metalType: p.metalType,
      productName: p.productName,
      pureProductId: p.pureProductId,
      sku: p.sku,
      weight: p.weight,
    }));
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
  handler: async (
    ctx,
    args,
  ): Promise<{
    candidates?: {
      details: string;
      productName: string;
      pureProductId: string;
      score: number;
    }[];
    matched: boolean;
    pureProductId?: string;
    score?: number;
    skipped?: boolean;
    status?: string;
  }> => {
    // Check admin access via internal mutation
    await ctx.runMutation(internal.admin.checkAdminAccess, {});

    // If forcing, clear the manual match status first
    if (args.force) {
      await ctx.runMutation(internal.admin.clearManualMatch, {
        costcoProductId: args.costcoProductId,
      });
    }

    // Run the matching algorithm
    const result = await ctx.runMutation(internal.costco.matchCostcoProductToPure, {
      costcoProductId: args.costcoProductId,
    });

    return result;
  },
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

    let pureProducts;
    if (args.metalType) {
      pureProducts = await ctx.db
        .query("pureProducts")
        .withIndex("by_metal_type", (q) => q.eq("metalType", args.metalType ?? "gold"))
        .collect();
    } else {
      pureProducts = await ctx.db.query("pureProducts").collect();
    }

    return pureProducts.map((p) => ({
      currentBidPrice: p.currentBidPrice,
      isGenericFallback: p.isGenericFallback,
      manufacturer: p.manufacturer,
      metalType: p.metalType,
      productName: p.productName,
      pureProductId: p.pureProductId,
      sku: p.sku,
      weight: p.weight,
    }));
  },
});

/**
 * Check if current user is admin (for frontend auth checks)
 */
export const checkIsAdmin = query({
  args: {},
  handler: async (ctx) => {
    const tokenIdentifier = (await ctx.auth.getUserIdentity())?.tokenIdentifier ?? null;

    return {
      isAdmin: isAdmin(tokenIdentifier),
      userTokenIdentifier: tokenIdentifier,
    };
  },
});

/**
 * Fetch a Pure product by SKU from the API and add it to the database
 */
export const fetchAndAddPureProduct = action({
  args: {
    sku: v.string(),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{
    error?: string;
    product?: {
      currentBidPrice: null | number;
      manufacturer: null | string;
      metalType: "gold" | "silver";
      productName: string;
      pureProductId: string;
      sku: string;
      weight: number;
    };
    success: boolean;
  }> => {
    // Check admin access
    await ctx.runMutation(internal.admin.checkAdminAccess, {});

    try {
      const result = await fetchPureProductBySku(args.sku);
      if (!result.success || !result.product) {
        return { error: result.error ?? "Product not found in Pure API", success: false };
      }

      const productData = toPureProductInsertData(result.product);

      await ctx.runMutation(internal.admin.insertPureProduct, productData);

      return {
        product: {
          currentBidPrice: productData.currentBidPrice,
          manufacturer: productData.manufacturer,
          metalType: productData.metalType,
          productName: productData.productName,
          pureProductId: productData.pureProductId,
          sku: productData.sku,
          weight: productData.weight,
        },
        success: true,
      };
    } catch (error) {
      console.error("Error fetching Pure product:", error);
      return {
        error: error instanceof Error ? error.message : "Unknown error",
        success: false,
      };
    }
  },
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
    // Check if product already exists
    const existing = await ctx.db
      .query("pureProducts")
      .withIndex("by_pure_id", (q) => q.eq("pureProductId", args.pureProductId))
      .first();

    if (existing) {
      // Update existing product
      await ctx.db.patch(existing._id, {
        currentBidPrice: args.currentBidPrice,
        currentBidPricePerOz: args.currentBidPricePerOz,
        lastUpdated: args.lastUpdated,
        manufacturer: args.manufacturer,
        productName: args.productName,
        productType: args.productType,
        sku: args.sku,
        weight: args.weight,
        weightGrams: args.weightGrams,
      });
      return { inserted: false, updated: true };
    }

    // Insert new product
    await ctx.db.insert("pureProducts", args);
    return { inserted: true, updated: false };
  },
});
