import { v } from "convex/values";

import { internal } from "./_generated/api";
import {
  action,
  internalAction,
  internalMutation,
  internalQuery,
  query,
} from "./_generated/server";
import { extractProductType, parseWeightToOz } from "./lib/pureApiParsing";

// Pure API configuration
const PURE_API_BASE_URL = "https://public.api.collectpure.com";

// Generic fallback products (not marked "Stocked by Costco" but needed for matching)
// These are SKUs from Pure API (full URL slugs from product URLs)
const GENERIC_FALLBACK_SKUS = [
  "10-oz-silver-bars-999-fine-accredited-brands000092", // 10 oz silver bars - generic
  "random-brand-1-oz-gold-bar-9999-fine-in-card000087", // 1 oz gold bar - generic
  "10-gram-gold-bar-9999-fine-accredited-brands000098", // 10 gram gold bar - generic
  "50-gram-gold-bar-9999-fine-accredited-brands000100", // 50 gram gold bar - generic
  "100-gram-gold-bar-9999-fine-accredited-brands000101", // 100 gram gold bar - generic
];

// Type definitions for Pure API responses
interface PureSpotPrice {
  ask: number;
  bid: number;
  changePercent: number;
  changePrice: number;
  marketOpen: boolean;
  updatedAt: string;
}

interface PureSpotPricesResponse {
  Bitcoin?: PureSpotPrice;
  Gold?: PureSpotPrice;
  Palladium?: PureSpotPrice;
  Platinum?: PureSpotPrice;
  Silver?: PureSpotPrice;
}

interface PureProductOffer {
  createdAt: string;
  expiresAt: string;
  id: string;
  price: number;
  quantity: number;
  spotPremium: number;
  spotPremiumDollar: number;
  updatedAt: string;
}

interface PureProductVariant {
  highestOffer?: PureProductOffer;
  images?: string[];
  lowestListing?: PureProductOffer;
  title: string;
}

interface PureProduct {
  attributes: string[];
  category?: {
    isNumismatic: boolean;
    title: string;
  };
  certificateProvider?: {
    title: string;
  };
  id: string;
  images: string[];
  isCertified: boolean;
  isIra: boolean;
  manufacturer?: {
    images: string[];
    isEsg: boolean;
    title: string;
  };
  material: string;
  purity: string;
  sku: string;
  subCategory?: {
    premiumCalculationType: string;
    title: string;
  };
  title: string;
  variants: PureProductVariant[];
  weight: string;
  weightGrams: number;
}

// parseWeightToOz and extractProductType are now imported from ./lib/pureApiParsing

// Fetch all Pure products and update cache
export const fetchNewData = internalAction({
  args: {},
  handler: async (ctx) => {
    const timestamp = Date.now();
    const apiKey = process.env.PURE_API_KEY;

    if (!apiKey) {
      throw new Error("PURE_API_KEY environment variable is required");
    }

    try {
      console.info("Fetching Collect Pure data from API");

      // Step 1: Fetch spot prices for fallback
      const spotResponse = await fetch(`${PURE_API_BASE_URL}/v1/spot-prices`, {
        headers: {
          Accept: "application/json",
          "x-api-key": apiKey,
        },
      });

      if (!spotResponse.ok) {
        throw new Error(`Spot prices API responded with status: ${spotResponse.status}`);
      }

      const spotData = (await spotResponse.json()) as PureSpotPricesResponse;

      // Store spot prices
      const metalMap: Record<string, "gold" | "palladium" | "platinum" | "silver"> = {
        Gold: "gold",
        Palladium: "palladium",
        Platinum: "platinum",
        Silver: "silver",
      };

      let spotPricesStored = 0;
      for (const [metalName, prices] of Object.entries(spotData)) {
        if (metalName === "Bitcoin") continue; // Skip Bitcoin

        const metalType = metalMap[metalName];
        if (prices) {
          await ctx.runMutation(internal.pure.upsertSpotPrice, {
            askPrice: prices.ask,
            bidPrice: prices.bid,
            isMock: false,
            metalType,
            spotPrice: prices.bid, // Using bid as the spot price
            timestamp,
          });
          spotPricesStored++;
        }
      }

      // Step 2: Get existing product IDs from our database
      // This allows us to update manually added products even if they don't have "Stocked by Costco"
      const existingProductIds = await ctx.runQuery(internal.pure.getExistingPureProductIds);
      const existingIdsSet = new Set(existingProductIds);

      // Step 3: Fetch all Pure products (gold and silver only for MVP)
      const metals = ["Gold", "Silver"];
      let totalProductsFetched = 0;
      let totalProductsStored = 0;

      for (const material of metals) {
        let offset = 0;
        let hasMore = true;

        try {
          while (hasMore) {
            const searchParams = new URLSearchParams({
              limit: "100", // Fetch in batches of 100
              material,
              offset: offset.toString(),
            });

            const productsResponse = await fetch(
              `${PURE_API_BASE_URL}/v1/products?${searchParams.toString()}`,
              {
                headers: {
                  Accept: "application/json",
                  "x-api-key": apiKey,
                },
              },
            );

            if (!productsResponse.ok) {
              console.warn(
                `Failed to fetch ${material} products at offset ${offset}: ${productsResponse.status}`,
              );
              break;
            }

            const products = (await productsResponse.json()) as PureProduct[];
            totalProductsFetched += products.length;

            console.info(`Fetched ${products.length} ${material} products at offset ${offset}`);

            // Process products into batch data:
            // - "Stocked by Costco" attribute
            // - Generic fallback SKUs
            // - Products already in our database (manually added)
            const productBatch = products
              .filter((product) => {
                // Include products with "Stocked by Costco" attribute
                const isStockedByCostco = product.attributes.some((attr: string) =>
                  attr.toLowerCase().includes("stocked by costco"),
                );

                // Also include generic fallback products (matched by SKU)
                const isGenericFallback = GENERIC_FALLBACK_SKUS.includes(product.sku);

                // Also include products already in our database (e.g., manually added)
                const existsInDb = existingIdsSet.has(product.id);

                return isStockedByCostco || isGenericFallback || existsInDb;
              })
              .map((product) => {
                const isGenericFallback = GENERIC_FALLBACK_SKUS.includes(product.sku);
                const metalType = product.material.toLowerCase() as "gold" | "silver";
                const weightOz = parseWeightToOz(product.weight, product.weightGrams);
                const productType = extractProductType(product);

                // Get bid price if available, otherwise null
                const bidPrice = product.variants[0]?.highestOffer?.price ?? null;
                const bidPricePerOz = bidPrice ? bidPrice / weightOz : null;

                return {
                  currentBidPrice: bidPrice,
                  currentBidPricePerOz: bidPricePerOz,
                  isGenericFallback,
                  lastUpdated: timestamp,
                  manufacturer: product.manufacturer?.title ?? null,
                  metalType,
                  productName: product.title,
                  productType,
                  pureProductId: product.id,
                  sku: product.sku || null,
                  weight: weightOz,
                  weightGrams: product.weightGrams || null,
                };
              });

            // Batch upsert products (reduces transaction contention)
            if (productBatch.length > 0) {
              const stored = await ctx.runMutation(internal.pure.batchUpsertPureProducts, {
                products: productBatch,
              });

              totalProductsStored += stored;
              console.info(
                `Stored ${stored} Costco products from this batch (${productBatch.length} filtered)`,
              );
            }

            // Check if there are more pages
            if (products.length < 100) {
              hasMore = false;
            } else {
              offset += 100;
            }
          }
        } catch (error) {
          console.warn(`Error fetching ${material} products:`, error);
        }
      }

      // Log fetch run
      await ctx.runMutation(internal.costco.logFetchRun, {
        priceChanges: 0,
        productsFound: totalProductsFetched,
        productsUpdated: totalProductsStored,
        source: "collectpure",
        stockChanges: 0,
        timestamp,
      });

      console.info(
        `Stored ${totalProductsStored} Pure products (${totalProductsFetched} fetched, ${spotPricesStored} spot prices)`,
      );

      return {
        productsStored: totalProductsStored,
        spotPrices: spotPricesStored,
        success: true,
        timestamp,
      };
    } catch (error) {
      console.error("Error fetching Collect Pure prices:", error);

      // Log failed fetch run
      await ctx.runMutation(internal.costco.logFetchRun, {
        error: error instanceof Error ? error.message : "Unknown error",
        priceChanges: 0,
        productsFound: 0,
        productsUpdated: 0,
        source: "collectpure",
        stockChanges: 0,
        timestamp,
      });

      throw error;
    }
  },
});

// Batch upsert Pure products (reduces transaction contention)
export const batchUpsertPureProducts = internalMutation({
  args: {
    products: v.array(
      v.object({
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
      }),
    ),
  },
  handler: async (ctx, args) => {
    let stored = 0;

    // Process all products in a single transaction
    for (const product of args.products) {
      // Check if product already exists
      const existing = await ctx.db
        .query("pureProducts")
        .withIndex("by_pure_id", (q) => q.eq("pureProductId", product.pureProductId))
        .first();

      if (existing) {
        // Update existing product
        await ctx.db.patch(existing._id, {
          currentBidPrice: product.currentBidPrice,
          currentBidPricePerOz: product.currentBidPricePerOz,
          isGenericFallback: product.isGenericFallback,
          lastUpdated: product.lastUpdated,
          manufacturer: product.manufacturer,
          productName: product.productName,
          productType: product.productType,
          sku: product.sku,
          weight: product.weight,
          weightGrams: product.weightGrams,
        });
      } else {
        // Insert new product
        await ctx.db.insert("pureProducts", product);
      }

      stored++;
    }

    return stored;
  },
});

// Upsert Pure product into cache (kept for backward compatibility)
export const upsertPureProduct = internalMutation({
  args: {
    currentBidPrice: v.union(v.number(), v.null()),
    currentBidPricePerOz: v.union(v.number(), v.null()),
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
      return { updated: true };
    }

    // Insert new product
    await ctx.db.insert("pureProducts", args);
    return { updated: false };
  },
});

// Upsert spot price (keep existing logic)
export const upsertSpotPrice = internalMutation({
  args: {
    askPrice: v.union(v.number(), v.null()),
    bidPrice: v.number(),
    isMock: v.boolean(),
    metalType: v.union(
      v.literal("gold"),
      v.literal("silver"),
      v.literal("platinum"),
      v.literal("palladium"),
    ),
    spotPrice: v.number(),
    timestamp: v.number(),
  },
  handler: async (ctx, args) => {
    // Check for existing price for this metal
    const existing = await ctx.db
      .query("collectPurePrices")
      .withIndex("by_metal", (q) => q.eq("metalType", args.metalType))
      .order("desc")
      .first();

    // Only insert if price has changed significantly or it's been more than 1 hour
    const shouldInsert =
      !existing ||
      Math.abs(existing.spotPrice - args.spotPrice) > 1.0 ||
      Math.abs(existing.bidPrice - args.bidPrice) > 1.0 ||
      args.timestamp - existing.timestamp > 60 * 60 * 1000;

    if (shouldInsert) {
      await ctx.db.insert("collectPurePrices", args);
      return { updated: true };
    }

    return { updated: false };
  },
});

// Query to get latest Collect Pure prices
export const getLatestPrices = query({
  args: {
    metalType: v.optional(
      v.union(
        v.literal("gold"),
        v.literal("silver"),
        v.literal("platinum"),
        v.literal("palladium"),
      ),
    ),
  },
  handler: async (ctx, args) => {
    if (args.metalType) {
      const metalType = args.metalType; // Narrow the type for TypeScript
      const prices = await ctx.db
        .query("collectPurePrices")
        .withIndex("by_metal", (q) => q.eq("metalType", metalType))
        .order("desc")
        .first();

      return prices ? [prices] : [];
    }

    // Get latest price for each metal
    const metals = ["gold", "silver", "platinum", "palladium"] as const;
    const latestPrices = await Promise.all(
      metals.map(async (metal) => {
        return await ctx.db
          .query("collectPurePrices")
          .withIndex("by_metal", (q) => q.eq("metalType", metal))
          .order("desc")
          .first();
      }),
    );

    return latestPrices.filter((p) => p !== null);
  },
});

// Query all Pure products (for debugging/manual matching)
export const getAllPureProducts = query({
  args: {
    metalType: v.optional(v.union(v.literal("gold"), v.literal("silver"))),
  },
  handler: async (ctx, args) => {
    if (args.metalType) {
      const metalType = args.metalType; // Narrow the type for TypeScript
      return await ctx.db
        .query("pureProducts")
        .withIndex("by_metal_type", (q) => q.eq("metalType", metalType))
        .collect();
    }

    return await ctx.db.query("pureProducts").collect();
  },
});

// Internal query to get all existing Pure product IDs (for cron update filtering)
export const getExistingPureProductIds = internalQuery({
  args: {},
  handler: async (ctx) => {
    const products = await ctx.db.query("pureProducts").collect();
    return products.map((p) => p.pureProductId);
  },
});

// Manual trigger for testing
export const manualFetchPrices = action({
  args: {},
  handler: async (
    ctx,
  ): Promise<{
    productsStored: number;
    spotPrices: number;
    success: boolean;
    timestamp: number;
  }> => {
    return await ctx.runAction(internal.pure.fetchNewData);
  },
});
