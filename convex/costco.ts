import { v } from "convex/values";

import { internal } from "./_generated/api";
import { internalAction, internalMutation, query } from "./_generated/server";
import {
  fetchCostcoProductDetails,
  fetchCostcoSearchProducts,
  getUnwrangleApiKey,
} from "./costco/api";
import { manuallyMatchProductHelper, matchCostcoProductToPureHelper } from "./costco/matching";
import {
  getInStockProductsForVerificationHelper,
  markUnseenProductsOutOfStockHelper,
  updateProductFromVerificationHelper,
  upsertProcessedProduct,
} from "./costco/productState";

export const fetchNewData = internalAction({
  args: {},
  handler: async (ctx) => {
    const apiKey = getUnwrangleApiKey();
    const timestamp = Date.now();
    let fetchRunId: string | undefined;

    try {
      const { processedProducts, remainingCredits } = await fetchCostcoSearchProducts(apiKey);

      console.info(
        `Found ${processedProducts.length} metal products (${
          processedProducts.filter((product) => product.metalType === "gold").length
        } gold, ${processedProducts.filter((product) => product.metalType === "silver").length} silver)`,
      );

      let productsUpdated = 0;
      let priceChanges = 0;
      let stockChanges = 0;
      const updatedProductIds = new Set<string>();
      const seenProductIds = new Set(processedProducts.map((product) => product.id));

      for (const product of processedProducts) {
        const result = await ctx.runMutation(internal.costco.upsertProduct, {
          product,
          timestamp,
        });

        if (result.updated) {
          productsUpdated++;
          updatedProductIds.add(product.id);
        }
        if (result.priceChanged) priceChanges++;
        if (result.stockChanged) stockChanges++;

        await ctx.runMutation(internal.costco.matchCostcoProductToPure, {
          costcoProductId: product.id,
        });
      }

      const outOfStockResult: {
        productsUpdated: number;
        stockChanges: number;
        updatedProductIds: string[];
      } = await ctx.runMutation(internal.costco.markUnseenProductsOutOfStock, {
        seenProductIds: [...seenProductIds],
        timestamp,
      });

      stockChanges += outOfStockResult.stockChanges;
      productsUpdated += outOfStockResult.productsUpdated;
      for (const productId of outOfStockResult.updatedProductIds) {
        updatedProductIds.add(productId);
      }

      if (updatedProductIds.size > 0) {
        await ctx.runMutation(internal.alerts.evaluateAlertsForProducts, {
          evaluatedAt: timestamp,
          productIds: [...updatedProductIds],
          source: "costco_search",
        });
      }

      fetchRunId = await ctx.runMutation(internal.costco.logFetchRun, {
        creditsRemaining: remainingCredits,
        priceChanges,
        productsFound: processedProducts.length,
        productsUpdated,
        source: "costco",
        stockChanges,
        timestamp,
      });

      return {
        creditsRemaining: remainingCredits,
        priceChanges,
        productsFound: processedProducts.length,
        productsUpdated,
        stockChanges,
        success: true,
        timestamp,
      };
    } catch (error) {
      console.error("Error fetching metal prices:", error);

      if (!fetchRunId) {
        await ctx.runMutation(internal.costco.logFetchRun, {
          error: error instanceof Error ? error.message : "Unknown error",
          priceChanges: 0,
          productsFound: 0,
          productsUpdated: 0,
          source: "costco",
          stockChanges: 0,
          timestamp,
        });
      }

      throw error;
    }
  },
});

export const upsertProduct = internalMutation({
  args: {
    product: v.any(),
    timestamp: v.number(),
  },
  handler: (ctx, args) => upsertProcessedProduct(ctx, args),
});

export const markUnseenProductsOutOfStock = internalMutation({
  args: {
    seenProductIds: v.array(v.string()),
    timestamp: v.number(),
  },
  handler: (ctx, args) => markUnseenProductsOutOfStockHelper(ctx, args),
});

export const logFetchRun = internalMutation({
  args: {
    creditsRemaining: v.optional(v.number()),
    error: v.optional(v.string()),
    priceChanges: v.number(),
    productsFound: v.number(),
    productsUpdated: v.number(),
    source: v.union(v.literal("costco"), v.literal("collectpure")),
    stockChanges: v.number(),
    timestamp: v.number(),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("fetchRuns", {
      creditsRemaining: args.creditsRemaining ?? null,
      error: args.error ?? null,
      priceChanges: args.priceChanges,
      productsFound: args.productsFound,
      productsUpdated: args.productsUpdated,
      source: args.source,
      stockChanges: args.stockChanges,
      timestamp: args.timestamp,
    });
  },
});

const isMetalType = (value: unknown): value is "gold" | "silver" =>
  value === "gold" || value === "silver";

export const getCurrentPrices = query({
  args: {
    inStockOnly: v.optional(v.boolean()),
    limit: v.optional(v.number()),
    metalType: v.optional(v.union(v.literal("gold"), v.literal("silver"))),
  },
  handler: async (ctx, args) => {
    const metal = args.metalType;
    let results;

    if (isMetalType(metal) && args.inStockOnly) {
      results = await ctx.db
        .query("costcoProducts")
        .withIndex("by_metal_and_stock", (index) =>
          index.eq("metalType", metal).eq("currentInStock", true),
        )
        .take(5000);
    } else if (isMetalType(metal)) {
      results = await ctx.db
        .query("costcoProducts")
        .withIndex("by_metal_type", (index) => index.eq("metalType", metal))
        .take(5000);
    } else if (args.inStockOnly) {
      const [goldInStock, silverInStock] = await Promise.all([
        ctx.db
          .query("costcoProducts")
          .withIndex("by_metal_and_stock", (index) =>
            index.eq("metalType", "gold").eq("currentInStock", true),
          )
          .take(5000),
        ctx.db
          .query("costcoProducts")
          .withIndex("by_metal_and_stock", (index) =>
            index.eq("metalType", "silver").eq("currentInStock", true),
          )
          .take(5000),
      ]);
      results = [...goldInStock, ...silverInStock];
    } else {
      results = await ctx.db.query("costcoProducts").take(5000);
    }
    const sorted = results.toSorted(
      (left, right) =>
        (left.currentPricePerOunce ?? Number.POSITIVE_INFINITY) -
        (right.currentPricePerOunce ?? Number.POSITIVE_INFINITY),
    );

    return args.limit ? sorted.slice(0, args.limit) : sorted;
  },
});

export const getPriceHistory = query({
  args: {
    days: v.optional(v.number()),
    productId: v.string(),
  },
  handler: async (ctx, args) => {
    const cutoff = args.days ? Date.now() - args.days * 24 * 60 * 60 * 1000 : 0;

    const history = await ctx.db
      .query("priceHistory")
      .withIndex("by_product_and_time", (q) => q.eq("productId", args.productId))
      .filter((q) => q.gte(q.field("timestamp"), cutoff))
      .take(1000);

    return history.toSorted((left, right) => left.timestamp - right.timestamp);
  },
});

export const getStockHistory = query({
  args: {
    days: v.optional(v.number()),
    productId: v.string(),
  },
  handler: async (ctx, args) => {
    const cutoff = args.days ? Date.now() - args.days * 24 * 60 * 60 * 1000 : 0;

    const history = await ctx.db
      .query("stockHistory")
      .withIndex("by_product_and_time", (q) => q.eq("productId", args.productId))
      .filter((q) => q.gte(q.field("timestamp"), cutoff))
      .take(1000);

    return history.toSorted((left, right) => left.timestamp - right.timestamp);
  },
});

export const matchCostcoProductToPure = internalMutation({
  args: {
    costcoProductId: v.string(),
  },
  handler: (ctx, args) => matchCostcoProductToPureHelper(ctx, args),
});

export const manuallyMatchProduct = internalMutation({
  args: {
    costcoProductId: v.string(),
    pureProductId: v.string(),
  },
  handler: (ctx, args) => manuallyMatchProductHelper(ctx, args),
});

export const getAllProductsForMatching = internalMutation({
  args: {},
  handler: async (ctx) => ctx.db.query("costcoProducts").collect(),
});

export const matchAllCostcoProducts = internalAction({
  args: {},
  handler: async (
    ctx,
  ): Promise<{
    fallback: number;
    manualMatches: number;
    matched: number;
    needsReview: number;
    total: number;
  }> => {
    const costcoProducts: { productId: string }[] = await ctx.runMutation(
      internal.costco.getAllProductsForMatching,
      {},
    );

    let matched = 0;
    let needsReview = 0;
    let fallback = 0;
    let manualMatches = 0;

    for (const product of costcoProducts) {
      const result = await ctx.runMutation(internal.costco.matchCostcoProductToPure, {
        costcoProductId: product.productId,
      });

      if (result.status === "auto_matched") matched++;
      else if (result.status === "needs_review") needsReview++;
      else if (result.status === "fallback") fallback++;
      else if (result.status === "manual_matched") manualMatches++;
    }

    console.info(
      `Matching complete: ${matched} auto-matched, ${needsReview} need review, ${fallback} using fallback, ${manualMatches} manual matches (skipped)`,
    );

    return {
      fallback,
      manualMatches,
      matched,
      needsReview,
      total: costcoProducts.length,
    };
  },
});

export const fetchProductDetails = internalAction({
  args: {
    productId: v.string(),
    productUrl: v.string(),
  },
  handler: (_ctx, args) => fetchCostcoProductDetails({ ...args, apiKey: getUnwrangleApiKey() }),
});

export const getInStockProductsForVerification = internalMutation({
  args: {},
  handler: (ctx) => getInStockProductsForVerificationHelper(ctx),
});

export const updateProductFromVerification = internalMutation({
  args: {
    inStock: v.boolean(),
    price: v.union(v.number(), v.null()),
    productId: v.string(),
    timestamp: v.number(),
  },
  handler: (ctx, args) => updateProductFromVerificationHelper(ctx, args),
});

export const verifyInStockProducts = internalAction({
  args: {},
  handler: async (ctx) => {
    const timestamp = Date.now();
    let fetchRunId: string | undefined;

    try {
      const inStockProducts: {
        _id: string;
        currentPrice: number;
        name: string;
        productId: string;
        url: string;
      }[] = await ctx.runMutation(internal.costco.getInStockProductsForVerification, {});

      if (inStockProducts.length === 0) {
        console.info("[Product API] No in-stock products to verify");
        return {
          priceChanges: 0,
          productsVerified: 0,
          stockChanges: 0,
          success: true,
        };
      }

      console.info(`[Product API] Verifying ${inStockProducts.length} in-stock products`);

      let priceChanges = 0;
      let stockChanges = 0;
      let creditsRemaining = 0;
      const updatedProductIds = new Set<string>();

      for (const product of inStockProducts) {
        try {
          const details = await ctx.runAction(internal.costco.fetchProductDetails, {
            productId: product.productId,
            productUrl: product.url,
          });

          creditsRemaining = details.creditsRemaining;

          const result = await ctx.runMutation(internal.costco.updateProductFromVerification, {
            inStock: details.inStock,
            price: details.price,
            productId: product.productId,
            timestamp,
          });

          if (result.priceChanged) priceChanges++;
          if (result.stockChanged) stockChanges++;
          if (result.updated) {
            updatedProductIds.add(product.productId);
          }
        } catch (error) {
          console.error(
            `[Product API] Error verifying ${product.name}: ${error instanceof Error ? error.message : "Unknown error"}`,
          );
        }
      }

      fetchRunId = await ctx.runMutation(internal.costco.logFetchRun, {
        creditsRemaining,
        priceChanges,
        productsFound: inStockProducts.length,
        productsUpdated: updatedProductIds.size,
        source: "costco",
        stockChanges,
        timestamp,
      });

      if (updatedProductIds.size > 0) {
        await ctx.runMutation(internal.alerts.evaluateAlertsForProducts, {
          evaluatedAt: timestamp,
          productIds: [...updatedProductIds],
          source: "costco_verify",
        });
      }

      console.info(
        `[Product API] Verification complete: ${inStockProducts.length} verified, ${priceChanges} price changes, ${stockChanges} stock changes. Credits remaining: ${creditsRemaining}`,
      );

      return {
        creditsRemaining,
        priceChanges,
        productsVerified: inStockProducts.length,
        stockChanges,
        success: true,
      };
    } catch (error) {
      console.error("[Product API] Verification failed:", error);

      if (!fetchRunId) {
        await ctx.runMutation(internal.costco.logFetchRun, {
          error: error instanceof Error ? error.message : "Unknown error",
          priceChanges: 0,
          productsFound: 0,
          productsUpdated: 0,
          source: "costco",
          stockChanges: 0,
          timestamp,
        });
      }

      throw error;
    }
  },
});
