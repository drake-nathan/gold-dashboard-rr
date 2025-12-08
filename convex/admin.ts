import { v } from "convex/values";

import type { QueryCtx } from "./_generated/server";

import { internal } from "./_generated/api";
import {
  action,
  internalMutation,
  mutation,
  query,
} from "./_generated/server";
import { extractWeightInOz, getFallbackPureId } from "./lib/metalParsing";

// Helper to check if a user is an admin
const isAdmin = (userId: null | string): boolean => {
  if (!userId) return false;

  const adminUserIds = process.env.ADMIN_USER_IDS;
  if (!adminUserIds) return false;

  const adminIds = adminUserIds.split(",").map((id) => id.trim());
  return adminIds.includes(userId);
};

// Helper to get authenticated user ID from context
const getAuthenticatedUserId = async (ctx: QueryCtx): Promise<null | string> => {
  const identity = await ctx.auth.getUserIdentity();
  return identity?.subject ?? null;
};

// Helper to require admin access
const requireAdmin = async (ctx: QueryCtx): Promise<string> => {
  const userId = await getAuthenticatedUserId(ctx);
  if (!isAdmin(userId)) {
    throw new Error("Unauthorized: Admin access required");
  }
  return userId!;
};

/**
 * Get all products for admin review, grouped by match status
 */
export const getProductsForReview = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    // Fetch all Costco products
    const products = await ctx.db.query("costcoProducts").collect();

    // Fetch all Pure products for joining
    const pureProducts = await ctx.db.query("pureProducts").collect();
    const pureProductsMap = new Map(
      pureProducts.map((p) => [p.pureProductId, p]),
    );

    // Group by match status
    const grouped = {
      auto_matched: [] as typeof products,
      fallback: [] as typeof products,
      manual_matched: [] as typeof products,
      needs_review: [] as typeof products,
      unmatched: [] as typeof products,
    };

    for (const product of products) {
      const status = product.matchStatus;
      if (status === "needs_review") {
        grouped.needs_review.push(product);
      } else if (status === "auto_matched") {
        grouped.auto_matched.push(product);
      } else if (status === "fallback") {
        grouped.fallback.push(product);
      } else if (status === "manual_matched") {
        grouped.manual_matched.push(product);
      } else {
        grouped.unmatched.push(product);
      }
    }

    // Enrich with Pure product info
    const enrichProduct = (product: (typeof products)[0]) => {
      const pureProduct = product.pureProductId
        ? pureProductsMap.get(product.pureProductId)
        : null;

      return {
        _id: product._id,
        currentInStock: product.currentInStock,
        currentPrice: product.currentPrice,
        firstSeen: product.firstSeen,
        matchApprovedAt: product.matchApprovedAt,
        matchApprovedBy: product.matchApprovedBy,
        matchStatus: product.matchStatus,
        metalType: product.metalType,
        metalWeight: product.metalWeight,
        name: product.name,
        productId: product.productId,
        pureProduct: pureProduct
          ? {
              currentBidPrice: pureProduct.currentBidPrice,
              isGenericFallback: pureProduct.isGenericFallback,
              manufacturer: pureProduct.manufacturer,
              productName: pureProduct.productName,
              pureProductId: pureProduct.pureProductId,
              sku: pureProduct.sku,
              weight: pureProduct.weight,
            }
          : null,
        pureProductId: product.pureProductId,
        thumbnail: product.thumbnail,
        url: product.url,
      };
    };

    return {
      auto_matched: grouped.auto_matched.map(enrichProduct),
      counts: {
        auto_matched: grouped.auto_matched.length,
        fallback: grouped.fallback.length,
        manual_matched: grouped.manual_matched.length,
        needs_review: grouped.needs_review.length,
        total: products.length,
        unmatched: grouped.unmatched.length,
      },
      fallback: grouped.fallback.map(enrichProduct),
      manual_matched: grouped.manual_matched.map(enrichProduct),
      needs_review: grouped.needs_review.map(enrichProduct),
      unmatched: grouped.unmatched.map(enrichProduct),
    };
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

    const limit = args.limit ?? 5;

    // Get the Costco product
    const costcoProduct = await ctx.db
      .query("costcoProducts")
      .withIndex("by_product_id", (q) =>
        q.eq("productId", args.costcoProductId),
      )
      .first();

    if (!costcoProduct) {
      throw new Error(`Costco product ${args.costcoProductId} not found`);
    }

    const weightInOz = extractWeightInOz(costcoProduct.metalWeight);

    // Get fallback Pure product info
    const fallbackPureId = weightInOz
      ? getFallbackPureId(costcoProduct.metalType, weightInOz)
      : null;

    let fallbackPureProduct = null;
    if (fallbackPureId) {
      fallbackPureProduct = await ctx.db
        .query("pureProducts")
        .withIndex("by_pure_id", (q) => q.eq("pureProductId", fallbackPureId))
        .first();
    }

    // Get all Pure products for this metal type
    const pureProducts = await ctx.db
      .query("pureProducts")
      .withIndex("by_metal_type", (q) =>
        q.eq("metalType", costcoProduct.metalType),
      )
      .collect();

    if (pureProducts.length === 0) {
      return {
        costcoProduct: {
          metalType: costcoProduct.metalType,
          metalWeight: costcoProduct.metalWeight,
          name: costcoProduct.name,
          productId: costcoProduct.productId,
          weightInOz,
        },
        fallback: fallbackPureProduct
          ? {
              currentBidPrice: fallbackPureProduct.currentBidPrice,
              isGenericFallback: fallbackPureProduct.isGenericFallback,
              manufacturer: fallbackPureProduct.manufacturer,
              productName: fallbackPureProduct.productName,
              pureProductId: fallbackPureProduct.pureProductId,
              sku: fallbackPureProduct.sku,
              weight: fallbackPureProduct.weight,
            }
          : null,
        matches: [],
      };
    }

    // Score each Pure product (same logic as auto-matching)
    interface ScoredMatch {
      details: string[];
      product: (typeof pureProducts)[0];
      score: number;
      weightMatch: boolean;
    }

    const matches: ScoredMatch[] = [];

    const costcoNameLower = costcoProduct.name
      .toLowerCase()
      .replaceAll(/[^\s\w]/g, " ")
      .replaceAll(/\s+/g, " ")
      .trim();

    for (const pureProduct of pureProducts) {
      const pureNameLower = pureProduct.productName
        .toLowerCase()
        .replaceAll(/[^\s\w]/g, " ")
        .replaceAll(/\s+/g, " ")
        .trim();

      let score = 0;
      const matchDetails: string[] = [];
      let weightMatch = false;

      // 1. WEIGHT MATCH
      if (weightInOz) {
        const weightDiff = Math.abs(pureProduct.weight - weightInOz);
        if (weightDiff <= 0.05) {
          score += 100;
          matchDetails.push("weight");
          weightMatch = true;
        }
      }

      // 2. MANUFACTURER MATCH
      if (pureProduct.manufacturer) {
        const manufacturer = pureProduct.manufacturer.toLowerCase();
        const manufacturerVariants = [
          manufacturer,
          manufacturer.replaceAll(/\s+/g, ""),
        ];

        const hasManufacturer = manufacturerVariants.some((variant) =>
          costcoNameLower.includes(variant),
        );

        if (hasManufacturer) {
          score += 100;
          matchDetails.push(`brand:${manufacturer}`);
        } else if (manufacturer.length > 3) {
          score -= 50;
        }
      }

      // 3. PRODUCT TYPE MATCH
      if (pureProduct.productType) {
        const productType = pureProduct.productType.toLowerCase();
        if (costcoNameLower.includes(productType)) {
          score += 50;
          matchDetails.push(`type:${productType}`);
        }
      }

      // 4. PHRASE MATCHING
      const pureWords = pureNameLower.split(/\s+/);
      const genericPhrases = [
        "gold bar",
        "silver bar",
        "gold coin",
        "silver coin",
        "fine gold",
        "fine silver",
        "troy ounce",
        "in assay",
        "new in",
      ];

      for (let i = 0; i < pureWords.length - 1; i++) {
        const twoWord = `${pureWords[i]} ${pureWords[i + 1]}`;
        const threeWord =
          i < pureWords.length - 2
            ? `${pureWords[i]} ${pureWords[i + 1]} ${pureWords[i + 2]}`
            : null;

        if (
          threeWord &&
          !genericPhrases.includes(threeWord) &&
          costcoNameLower.includes(threeWord)
        ) {
          score += 75;
          matchDetails.push(`phrase:"${threeWord}"`);
        } else if (
          !genericPhrases.includes(twoWord) &&
          costcoNameLower.includes(twoWord)
        ) {
          score += 40;
          matchDetails.push(`phrase:"${twoWord}"`);
        }
      }

      // Include all matches with positive score, or weight match
      if (score > 0 || weightMatch) {
        matches.push({
          details: matchDetails,
          product: pureProduct,
          score,
          weightMatch,
        });
      }
    }

    // Sort by score descending
    matches.sort((a, b) => b.score - a.score);

    // Return top N matches
    const topMatches = matches.slice(0, limit).map((m) => ({
      currentBidPrice: m.product.currentBidPrice,
      details: m.details,
      isGenericFallback: m.product.isGenericFallback,
      manufacturer: m.product.manufacturer,
      productName: m.product.productName,
      pureProductId: m.product.pureProductId,
      score: m.score,
      sku: m.product.sku,
      weight: m.product.weight,
      weightMatch: m.weightMatch,
    }));

    return {
      costcoProduct: {
        metalType: costcoProduct.metalType,
        metalWeight: costcoProduct.metalWeight,
        name: costcoProduct.name,
        productId: costcoProduct.productId,
        weightInOz,
      },
      fallback: fallbackPureProduct
        ? {
            currentBidPrice: fallbackPureProduct.currentBidPrice,
            isGenericFallback: fallbackPureProduct.isGenericFallback,
            manufacturer: fallbackPureProduct.manufacturer,
            productName: fallbackPureProduct.productName,
            pureProductId: fallbackPureProduct.pureProductId,
            sku: fallbackPureProduct.sku,
            weight: fallbackPureProduct.weight,
          }
        : null,
      matches: topMatches,
    };
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
        .withIndex("by_metal_type", (q) => q.eq("metalType", args.metalType!))
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
 * Approve or change a product match
 * Sets matchStatus to manual_matched and records approval metadata
 */
export const approveMatch = mutation({
  args: {
    costcoProductId: v.string(),
    pureProductId: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireAdmin(ctx);

    // Get the Costco product
    const costcoProduct = await ctx.db
      .query("costcoProducts")
      .withIndex("by_product_id", (q) =>
        q.eq("productId", args.costcoProductId),
      )
      .first();

    if (!costcoProduct) {
      throw new Error(`Costco product ${args.costcoProductId} not found`);
    }

    // Get the Pure product to verify it exists
    const pureProduct = await ctx.db
      .query("pureProducts")
      .withIndex("by_pure_id", (q) => q.eq("pureProductId", args.pureProductId))
      .first();

    if (!pureProduct) {
      throw new Error(`Pure product ${args.pureProductId} not found`);
    }

    // Update the match with approval metadata
    await ctx.db.patch(costcoProduct._id, {
      matchApprovedAt: Date.now(),
      matchApprovedBy: userId,
      matchStatus: "manual_matched",
      pureProductId: args.pureProductId,
    });

    return {
      costcoProduct: costcoProduct.name,
      pureProduct: pureProduct.productName,
      success: true,
    };
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

    // Get the Costco product
    const costcoProduct = await ctx.db
      .query("costcoProducts")
      .withIndex("by_product_id", (q) =>
        q.eq("productId", args.costcoProductId),
      )
      .first();

    if (!costcoProduct) {
      throw new Error(`Costco product ${args.costcoProductId} not found`);
    }

    // Get weight-specific fallback if available
    const weightInOz = extractWeightInOz(costcoProduct.metalWeight);
    const fallbackPureId = weightInOz
      ? getFallbackPureId(costcoProduct.metalType, weightInOz)
      : null;

    // Update to use fallback
    await ctx.db.patch(costcoProduct._id, {
      matchApprovedAt: Date.now(),
      matchApprovedBy: userId,
      matchStatus: "manual_matched", // Manual decision to use fallback
      pureProductId: fallbackPureId,
    });

    return {
      costcoProduct: costcoProduct.name,
      fallbackPureId,
      success: true,
    };
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
  handler: async (ctx, args): Promise<{
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
    const result = await ctx.runMutation(
      internal.costco.matchCostcoProductToPure,
      {
        costcoProductId: args.costcoProductId,
      },
    );

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
  handler: async (ctx, args) => {
    const costcoProduct = await ctx.db
      .query("costcoProducts")
      .withIndex("by_product_id", (q) =>
        q.eq("productId", args.costcoProductId),
      )
      .first();

    if (!costcoProduct) {
      throw new Error(`Costco product ${args.costcoProductId} not found`);
    }

    // Clear the match to allow re-matching
    await ctx.db.patch(costcoProduct._id, {
      matchApprovedAt: null,
      matchApprovedBy: null,
      matchStatus: null,
      pureProductId: null,
    });

    return { success: true };
  },
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
        .withIndex("by_metal_type", (q) => q.eq("metalType", args.metalType!))
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
    const userId = await getAuthenticatedUserId(ctx);
    return {
      isAdmin: isAdmin(userId),
      userId,
    };
  },
});
