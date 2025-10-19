import { v } from "convex/values";

import { internal } from "./_generated/api";
import {
  action,
  internalAction,
  internalMutation,
  query,
} from "./_generated/server";

// Pure API configuration
const PURE_API_BASE_URL = "https://public.api.collectpure.com";

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

// Helper to parse weight string and convert to troy ounces
const parseWeightToOz = (weight: string, weightGrams?: number): number => {
  if (weightGrams) {
    // Convert grams to troy ounces (1 troy oz = 31.1035 g)
    return weightGrams / 31.1035;
  }

  // Parse weight string
  const weightMatch =
    /(?<value>\d+(?:\.\d+)?)\s*(?<unit>troy ounce|ounce|oz|gram|g)/i.exec(
      weight,
    );
  if (weightMatch?.groups?.value && weightMatch.groups.unit) {
    const value = parseFloat(weightMatch.groups.value);
    const unit = weightMatch.groups.unit.toLowerCase();

    if (unit.includes("oz") || unit.includes("ounce")) {
      return value;
    } else if (unit === "gram" || unit === "g") {
      return value / 31.1035;
    }
  }

  // Default to 1 oz if unable to parse
  return 1;
};

// Helper to parse target weight from mapping criteria
const parseTargetWeight = (weightStr: string): null | number => {
  // Handle common formats: "1oz", "0.5oz", "100g", "25g"
  const normalized = weightStr.toLowerCase().replaceAll(/\s+/g, "");

  if (normalized.includes("oz")) {
    const match = /(\d+(?:\.\d+)?)oz/.exec(normalized);
    if (match && match[1]) return parseFloat(match[1]);
  }

  if (normalized.includes("g")) {
    const match = /(\d+(?:\.\d+)?)g/.exec(normalized);
    if (match && match[1]) return parseFloat(match[1]) / 31.1035; // Convert grams to oz
  }

  return null;
};

// Fetch Collect Pure prices from API
export const fetchNewData = internalAction({
  args: {},
  handler: async (ctx) => {
    const timestamp = Date.now();
    const apiKey = process.env.PURE_API_KEY;

    if (!apiKey) {
      throw new Error("No API key configured");
    }

    // Real API implementation
    try {
      console.info("Fetching real Collect Pure data from API");

      // Fetch spot prices
      const spotResponse = await fetch(`${PURE_API_BASE_URL}/v1/spot-prices`, {
        headers: {
          Accept: "application/json",
          "x-api-key": apiKey,
        },
      });

      if (!spotResponse.ok) {
        throw new Error(
          `Spot prices API responded with status: ${spotResponse.status}`,
        );
      }

      const spotData = (await spotResponse.json()) as PureSpotPricesResponse;

      // Process and store spot prices
      const metalMap: Record<
        string,
        "gold" | "palladium" | "platinum" | "silver"
      > = {
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

      // Get active mappings to determine which Pure products to fetch
      const activeMappings = await ctx.runQuery(
        "productMappings:getActiveMappings" as any,
      );
      console.info(`Found ${activeMappings.length} active product mappings`);

      let productBidsStored = 0;
      let totalProductsChecked = 0;

      // Process each mapping to fetch specific Pure products
      for (const mapping of activeMappings) {
        const criteria = mapping.pureSearchCriteria;

        // Build search parameters based on mapping criteria
        const searchParams = new URLSearchParams({
          limit: "10", // Lower limit since we're targeting specific products
          material: criteria.material,
        });

        // Add weight-based filtering if available
        if (criteria.weight) {
          // Convert weight to a search-friendly format
          const weightQuery = criteria.weight
            .toLowerCase()
            .replace("oz", " oz")
            .replace("g", " gram")
            .replace("0.5", "1/2");
          searchParams.append("search", weightQuery);
        }

        // Add manufacturer if specified
        if (criteria.manufacturer) {
          searchParams.append("search", criteria.manufacturer);
        }

        try {
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
              `Failed to fetch products for mapping ${mapping.costcoProductId}: ${productsResponse.status}`,
            );
            continue;
          }

          const products = (await productsResponse.json()) as PureProduct[];
          totalProductsChecked += products.length;

          // Process products and find the best match
          let bestMatch: null | PureProduct = null;
          let bestScore = 0;

          for (const product of products) {
            if (
              product.variants.length === 0 ||
              !product.variants[0]?.highestOffer
            ) {
              continue; // Skip products without bids
            }

            // Calculate matching score
            let score = 0;

            // Material match (required)
            if (
              product.material.toLowerCase() === criteria.material.toLowerCase()
            ) {
              score += 10;
            } else {
              continue; // Skip if material doesn't match
            }

            // Manufacturer match
            if (criteria.manufacturer && product.manufacturer?.title) {
              if (
                product.manufacturer.title
                  .toLowerCase()
                  .includes(criteria.manufacturer.toLowerCase()) ||
                criteria.manufacturer
                  .toLowerCase()
                  .includes(product.manufacturer.title.toLowerCase())
              ) {
                score += 5;
              }
            }

            // Weight match
            if (criteria.weight) {
              const weightOz = parseWeightToOz(
                product.weight,
                product.weightGrams,
              );
              const targetWeight = parseTargetWeight(criteria.weight);

              if (targetWeight && Math.abs(weightOz - targetWeight) < 0.1) {
                score += 8;
              } else if (
                targetWeight &&
                Math.abs(weightOz - targetWeight) < 0.5
              ) {
                score += 3;
              }
            }

            // Purity match
            if (criteria.purity && product.purity) {
              if (product.purity.includes(criteria.purity.replace(".", ""))) {
                score += 3;
              }
            }

            // Product type match (bar/coin)
            if (criteria.productType) {
              if (
                product.title
                  .toLowerCase()
                  .includes(criteria.productType.toLowerCase())
              ) {
                score += 2;
              }
            }

            if (score > bestScore) {
              bestScore = score;
              bestMatch = product;
            }
          }

          // Store the best match if we found one
          if (bestMatch?.variants[0]?.highestOffer) {
            const metalType = bestMatch.material.toLowerCase() as
              | "gold"
              | "silver";
            const weightOz = parseWeightToOz(
              bestMatch.weight,
              bestMatch.weightGrams,
            );
            const bidPricePerOz =
              bestMatch.variants[0].highestOffer.price / weightOz;

            await ctx.runMutation("collectPurePrices:upsertProductBid" as any, {
              bidPrice: bestMatch.variants[0].highestOffer.price,
              bidPricePerOz,
              isMock: false,
              matchedCostcoProductId: mapping.costcoProductId, // Link to specific Costco product
              metalType,
              productName: bestMatch.title,
              purity: bestMatch.purity || ".999",
              timestamp,
              weight: weightOz,
            });
            productBidsStored++;

            console.info(
              `Matched ${mapping.costcoProductId} to Pure product: ${bestMatch.title} (score: ${bestScore})`,
            );
          } else {
            console.warn(
              `No matching Pure product found for Costco product ${mapping.costcoProductId}`,
            );
          }
        } catch (error) {
          console.warn(
            `Error fetching Pure products for mapping ${mapping.costcoProductId}:`,
            error,
          );
        }
      }

      // Log fetch run with updated stats
      await ctx.runMutation("metalPrices:logFetchRun" as any, {
        priceChanges: productBidsStored,
        productsFound: totalProductsChecked,
        productsUpdated: productBidsStored,
        source: "collectpure",
        stockChanges: 0,
        timestamp,
      });

      console.info(
        `Processed ${activeMappings.length} mappings, checked ${totalProductsChecked} Pure products, stored ${productBidsStored} bid prices`,
      );

      return {
        isMock: false,
        mappingsProcessed: activeMappings.length,
        productBids: productBidsStored,
        productsChecked: totalProductsChecked,
        spotPrices: spotPricesStored,
        success: true,
        timestamp,
      };
    } catch (error) {
      console.error("Error fetching Collect Pure prices:", error);

      // Log failed fetch run
      await ctx.runMutation("metalPrices:logFetchRun" as any, {
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

// Upsert spot price
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

    // Only insert if price has changed or it's been more than 5 minutes
    const shouldInsert =
      !existing ||
      Math.abs(existing.spotPrice - args.spotPrice) > 0.01 ||
      Math.abs(existing.bidPrice - args.bidPrice) > 0.01 ||
      args.timestamp - existing.timestamp > 5 * 60 * 1000;

    if (shouldInsert) {
      await ctx.db.insert("collectPurePrices", args);
      return { updated: true };
    }

    return { updated: false };
  },
});

// Upsert product bid
export const upsertProductBid = internalMutation({
  args: {
    bidPrice: v.number(),
    bidPricePerOz: v.number(),
    isMock: v.boolean(),
    matchedCostcoProductId: v.union(v.string(), v.null()),
    metalType: v.union(v.literal("gold"), v.literal("silver")),
    productName: v.string(),
    purity: v.union(v.string(), v.null()),
    timestamp: v.number(),
    weight: v.number(),
  },
  handler: async (ctx, args) => {
    // For now, always insert product bids (we'll dedupe in queries)
    await ctx.db.insert("collectPureProductBids", args);
    return { inserted: true };
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
      const prices = await ctx.db
        .query("collectPurePrices")
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        .withIndex("by_metal", (q) => q.eq("metalType", args.metalType!))
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

// Query to get latest product bids
export const getLatestProductBids = query({
  args: {
    limit: v.optional(v.number()),
    metalType: v.optional(v.union(v.literal("gold"), v.literal("silver"))),
  },
  handler: async (ctx, args) => {
    // Get latest bids grouped by product with limits
    const allBids =
      args.metalType ?
        await ctx.db
          .query("collectPureProductBids")
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          .withIndex("by_metal", (q) => q.eq("metalType", args.metalType!))
          .order("desc")
          .take(1000) // Limit to prevent excessive document reads
      : await ctx.db.query("collectPureProductBids").order("desc").take(1000); // Limit to prevent excessive document reads

    // Group by product name and get latest for each
    const latestByProduct = new Map();
    for (const bid of allBids) {
      if (!latestByProduct.has(bid.productName)) {
        latestByProduct.set(bid.productName, bid);
      }
    }

    const results = Array.from(latestByProduct.values());
    return args.limit ? results.slice(0, args.limit) : results;
  },
});

// Manual trigger for testing (can be called from dashboard)
export const manualFetchPrices = action({
  args: {},
  handler: async (
    ctx,
  ): Promise<{
    isMock: boolean;
    productBids: number;
    spotPrices: number;
    success: boolean;
    timestamp: number;
  }> => {
    return await ctx.runAction(
      "collectPurePrices:fetchCollectPurePrices" as any,
    );
  },
});

// Calculate spread between Costco and Collect Pure prices
export const calculateSpread = query({
  args: {
    costcoProductId: v.string(),
  },
  handler: async (ctx, args) => {
    // Get Costco product
    const costcoProduct = await ctx.db
      .query("costcoProducts")
      .withIndex("by_product_id", (q) =>
        q.eq("productId", args.costcoProductId),
      )
      .first();

    if (!costcoProduct?.currentInStock) {
      return null;
    }

    // Get latest Collect Pure spot price for this metal
    const collectPurePrice = await ctx.db
      .query("collectPurePrices")
      .withIndex("by_metal", (q) => q.eq("metalType", costcoProduct.metalType))
      .order("desc")
      .first();

    if (!collectPurePrice) {
      return null;
    }

    // Calculate spread
    const costcoPricePerOz = costcoProduct.currentPricePerOunce;
    const collectPureBidPerOz = collectPurePrice.bidPrice;

    if (!costcoPricePerOz) {
      return null;
    }

    const spread = costcoPricePerOz - collectPureBidPerOz;
    const spreadPercentage = (spread / costcoPricePerOz) * 100;

    return {
      collectPure: {
        bidPrice: collectPurePrice.bidPrice,
        isMock: collectPurePrice.isMock,
        spotPrice: collectPurePrice.spotPrice,
      },
      costcoProduct: {
        metalType: costcoProduct.metalType,
        name: costcoProduct.name,
        price: costcoProduct.currentPrice,
        pricePerOz: costcoPricePerOz,
        weight: costcoProduct.metalWeight,
      },
      spread: {
        dollarAmount: spread,
        percentage: spreadPercentage,
        profitable: spread > 0, // Positive spread means you can profit
      },
    };
  },
});
