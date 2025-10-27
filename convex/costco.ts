import { v } from "convex/values";

import { internal } from "./_generated/api";
import { internalAction, internalMutation, query } from "./_generated/server";

const UNWRANGLE_API_URL = "https://data.unwrangle.com/api/getter/";

// Types for API responses
interface RawProduct {
  attributes: { key: string; value: string }[];
  brand?: string;
  categories: string[];
  currency?: string;
  id: string;
  in_stock: boolean;
  is_member_only?: boolean;
  is_warehouse_only?: boolean;
  marketing_features?: string[];
  max_quantity?: number;
  name: string;
  price: number;
  price_reduced?: number;
  rating?: number;
  retailer_id: string;
  short_description?: string;
  thumbnail?: string;
  total_ratings?: number;
  upc?: string;
  url: string;
}

interface ApiResponse {
  credits_used: number;
  no_of_pages: number;
  remaining_credits: number;
  results: RawProduct[];
  success: boolean;
  total_results: number;
}

interface ProcessedProduct extends RawProduct {
  metalType: "gold" | "silver";
  metalWeight?: string;
  pricePerOunce?: number;
}

// Minimal validation - just ensure API response structure is valid
const validateApiResponse = (data: unknown): ApiResponse => {
  // Only validate critical API response fields
  if (typeof data !== "object" || data === null) {
    throw new Error("Invalid API response: not an object");
  }

  if (!("success" in data) || typeof data.success !== "boolean") {
    throw new TypeError("Invalid API response: missing success field");
  }

  if (!Array.isArray((data as ApiResponse).results)) {
    throw new TypeError("Invalid API response: results is not an array");
  }

  // Trust that Convex schema will validate individual products
  // when we try to insert them
  return data as ApiResponse;
};

// Helper functions
const extractMetalAttributes = (
  product: RawProduct,
): null | ProcessedProduct => {
  const name = product.name.toLowerCase();

  // Determine metal type
  let metalType: "gold" | "silver" | null = null;
  if (name.includes("gold")) {
    metalType = "gold";
  } else if (name.includes("silver")) {
    metalType = "silver";
  }

  // Skip if not a precious metal bar/coin
  if (!metalType) return null;

  // Must be a bar, coin, or specified weight product
  const isMetalProduct =
    name.includes("bar") ||
    name.includes("coin") ||
    name.includes("gram") ||
    name.includes("ounce") ||
    name.includes("oz");

  if (!isMetalProduct) return null;

  // Extract weight
  const metalWeight = product.attributes.find(
    (attr) =>
      attr.key === "Metal Weight" || attr.key.toLowerCase().includes("weight"),
  )?.value;

  // Calculate price per ounce
  let pricePerOunce: number | undefined;
  if (metalWeight && product.price) {
    const weightMatch =
      /(?<weight>\d+(?:\.\d+)?)\s*(?:troy\s+)?(?<unit>gram|g|ounce|oz)/i.exec(
        metalWeight,
      );
    if (weightMatch?.groups?.weight && weightMatch.groups.unit) {
      const weight = parseFloat(weightMatch.groups.weight);
      const unit = weightMatch.groups.unit.toLowerCase();

      if (unit === "gram" || unit === "g") {
        // Convert grams to troy ounces (1 troy oz = 31.1035 g)
        pricePerOunce = product.price / (weight / 31.1035);
      } else if (unit === "ounce" || unit === "oz") {
        pricePerOunce = product.price / weight;
      }
    }
  }

  return {
    ...product,
    metalType,
    metalWeight,
    pricePerOunce,
  };
};

// Main fetch action
export const fetchNewData = internalAction({
  args: {},
  handler: async (ctx) => {
    const apiKey = process.env.UNWRANGLE_API_KEY;
    if (!apiKey) {
      throw new Error("UNWRANGLE_API_KEY environment variable is required");
    }

    const params = new URLSearchParams({
      api_key: apiKey,
      page: "1",
      platform: "costco_search",
      search: "precious metals",
    });

    const url = `${UNWRANGLE_API_URL}?${params.toString()}`;
    const timestamp = Date.now();

    let fetchRunId: string | undefined;

    try {
      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
          "User-Agent": "Mozilla/5.0 (compatible; Gold-Dashboard/1.0)",
        },
      });

      if (!response.ok) {
        throw new Error(`API responded with status: ${response.status}`);
      }

      const rawData = await response.json();

      // Validate API response
      const data = validateApiResponse(rawData);

      if (!data.success) {
        throw new Error(
          `API request failed. Credits remaining: ${data.remaining_credits}`,
        );
      }

      // Filter for precious metals category
      const preciousMetalsProducts = data.results.filter((product) =>
        product.categories.includes(
          "https://www.costco.com/precious-metals.html",
        ),
      );

      // Process and filter valid metal products
      const processedProducts = preciousMetalsProducts
        .map(extractMetalAttributes)
        .filter((p): p is ProcessedProduct => p !== null);

      console.info(
        `Found ${processedProducts.length} metal products (${
          processedProducts.filter((p) => p.metalType === "gold").length
        } gold, ${
          processedProducts.filter((p) => p.metalType === "silver").length
        } silver)`,
      );

      // Track statistics
      let productsUpdated = 0;
      let priceChanges = 0;
      let stockChanges = 0;

      // Collect all product IDs seen in this fetch
      const seenProductIds = new Set(processedProducts.map((p) => p.id));

      // Process each product that was returned (these are in stock)
      for (const product of processedProducts) {
        const result = await ctx.runMutation(internal.costco.upsertProduct, {
          product,
          timestamp,
        });

        if (result.updated) productsUpdated++;
        if (result.priceChanged) priceChanges++;
        if (result.stockChanged) stockChanges++;

        // Auto-match to Pure products (for new products or products without matches)
        await ctx.runMutation(internal.costco.matchCostcoProductToPure, {
          costcoProductId: product.id,
        });
      }

      // Mark products not returned as out of stock
      const outOfStockResult = await ctx.runMutation(
        internal.costco.markUnseenProductsOutOfStock,
        {
          seenProductIds: Array.from(seenProductIds),
          timestamp,
        },
      );

      stockChanges += outOfStockResult.stockChanges;
      productsUpdated += outOfStockResult.productsUpdated;

      // Log fetch run
      fetchRunId = await ctx.runMutation(internal.costco.logFetchRun, {
        creditsRemaining: data.remaining_credits,
        priceChanges,
        productsFound: processedProducts.length,
        productsUpdated,
        source: "costco",
        stockChanges,
        timestamp,
      });

      return {
        creditsRemaining: data.remaining_credits,
        priceChanges,
        productsFound: processedProducts.length,
        productsUpdated,
        stockChanges,
        success: true,
        timestamp,
      };
    } catch (error) {
      console.error("Error fetching metal prices:", error);

      // Log failed fetch run
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

// Upsert product with history tracking
export const upsertProduct = internalMutation({
  args: {
    product: v.any(), // ProcessedProduct type
    timestamp: v.number(),
  },
  handler: async (ctx, args) => {
    const product = args.product as ProcessedProduct;

    // Check if product exists
    const existing = await ctx.db
      .query("costcoProducts")
      .withIndex("by_product_id", (q) => q.eq("productId", product.id))
      .first();

    let priceChanged = false;
    let stockChanged = false;
    let updated = false;

    if (existing) {
      // Check for price changes
      if (existing.currentPrice !== product.price) {
        priceChanged = true;

        // Record price history
        await ctx.db.insert("priceHistory", {
          price: product.price,
          pricePerOunce: product.pricePerOunce ?? null,
          priceReduced: product.price_reduced ?? null,
          productId: product.id,
          timestamp: args.timestamp,
        });
      }

      // Check for stock changes
      if (existing.currentInStock !== product.in_stock) {
        stockChanged = true;

        // Record stock history
        await ctx.db.insert("stockHistory", {
          inStock: product.in_stock,
          productId: product.id,
          timestamp: args.timestamp,
        });
      }

      // Update product if anything changed
      if (priceChanged || stockChanged) {
        await ctx.db.patch(existing._id, {
          currentInStock: product.in_stock,
          currentPrice: product.price,
          currentPricePerOunce: product.pricePerOunce,
          lastUpdated: args.timestamp,
          ...(priceChanged && { lastPriceChange: args.timestamp }),
          ...(stockChanged && { lastStockChange: args.timestamp }),
        });
        updated = true;
      }
    } else {
      // New product - insert it with Pure matching fields
      await ctx.db.insert("costcoProducts", {
        brand: product.brand ?? null,
        categories: product.categories,
        currentInStock: product.in_stock,
        currentPrice: product.price,
        currentPricePerOunce: product.pricePerOunce ?? null,
        firstSeen: args.timestamp,
        isMemberOnly: product.is_member_only ?? null,
        isOnlineOnly: product.is_warehouse_only === false ? true : null,
        lastPriceChange: null,
        lastStockChange: null,
        lastUpdated: args.timestamp,
        marketingFeatures: product.marketing_features ?? null,
        matchStatus: null,
        maxQuantity: product.max_quantity ?? null,
        metalType: product.metalType,
        metalWeight: product.metalWeight ?? null,
        name: product.name,
        productId: product.id,
        pureBidPrice: null,
        pureBidPricePerOz: null,
        pureBidUpdated: null,
        pureProductId: null,
        retailerId: product.retailer_id,
        shortDescription: product.short_description ?? null,
        thumbnail: product.thumbnail ?? null,
        upc: product.upc ?? null,
        url: product.url,
      });

      // Record initial price and stock
      await ctx.db.insert("priceHistory", {
        price: product.price,
        pricePerOunce: product.pricePerOunce ?? null,
        priceReduced: product.price_reduced ?? null,
        productId: product.id,
        timestamp: args.timestamp,
      });

      await ctx.db.insert("stockHistory", {
        inStock: product.in_stock,
        productId: product.id,
        timestamp: args.timestamp,
      });

      updated = true;
      priceChanged = true;
      stockChanged = true;
    }

    return { priceChanged, stockChanged, updated };
  },
});

// Mark products not seen in the latest fetch as out of stock
export const markUnseenProductsOutOfStock = internalMutation({
  args: {
    seenProductIds: v.array(v.string()),
    timestamp: v.number(),
  },
  handler: async (ctx, args) => {
    let stockChanges = 0;
    let productsUpdated = 0;

    // Get all currently in-stock products
    const inStockProducts = await ctx.db
      .query("costcoProducts")
      .withIndex("by_metal_and_stock", (q) =>
        q.eq("metalType", "gold").eq("currentInStock", true),
      )
      .collect();

    const silverInStock = await ctx.db
      .query("costcoProducts")
      .withIndex("by_metal_and_stock", (q) =>
        q.eq("metalType", "silver").eq("currentInStock", true),
      )
      .collect();

    const allInStockProducts = [...inStockProducts, ...silverInStock];

    // Find products that are currently in stock but weren't in the latest fetch
    const seenIds = new Set(args.seenProductIds);

    for (const product of allInStockProducts) {
      if (!seenIds.has(product.productId)) {
        // This product wasn't returned, so it's now out of stock
        await ctx.db.patch(product._id, {
          currentInStock: false,
          lastStockChange: args.timestamp,
          lastUpdated: args.timestamp,
        });

        // Record stock history
        await ctx.db.insert("stockHistory", {
          inStock: false,
          productId: product.productId,
          timestamp: args.timestamp,
        });

        stockChanges++;
        productsUpdated++;

        console.info(
          `Marked product ${product.name} (${product.productId}) as out of stock`,
        );
      }
    }

    return { productsUpdated, stockChanges };
  },
});

// Log fetch run for monitoring
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
    return await ctx.db.insert("fetchRuns", {
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

// Runtime guard to validate metal type values
const isMetalType = (value: unknown): value is "gold" | "silver" =>
  value === "gold" || value === "silver";

// Query functions
export const getCurrentPrices = query({
  args: {
    inStockOnly: v.optional(v.boolean()),
    limit: v.optional(v.number()),
    metalType: v.optional(v.union(v.literal("gold"), v.literal("silver"))),
  },
  handler: async (ctx, args) => {
    let q = ctx.db.query("costcoProducts");

    const metal = args.metalType;

    // FIXME: a problem for future me: remove the `any`
    if (isMetalType(metal) && args.inStockOnly) {
      q = q.withIndex(
        "by_metal_and_stock",
        (q) => q.eq("metalType", metal).eq("currentInStock", true),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ) as any;
    } else if (isMetalType(metal)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      q = q.withIndex("by_metal_type", (q) => q.eq("metalType", metal)) as any;
    }

    const results = await q.take(5000); // Limit results to prevent excessive document reads

    // Sort by price per ounce for value comparison
    const sorted = results.sort(
      (a, b) =>
        (a.currentPricePerOunce ?? Infinity) -
        (b.currentPricePerOunce ?? Infinity),
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
      .withIndex("by_product_and_time", (q) =>
        q.eq("productId", args.productId),
      )
      .filter((q) => q.gte(q.field("timestamp"), cutoff))
      .take(1000); // Limit history queries

    return history.sort((a, b) => a.timestamp - b.timestamp);
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
      .withIndex("by_product_and_time", (q) =>
        q.eq("productId", args.productId),
      )
      .filter((q) => q.gte(q.field("timestamp"), cutoff))
      .take(1000); // Limit history queries

    return history.sort((a, b) => a.timestamp - b.timestamp);
  },
});

// Helper to extract weight in oz from Costco product
const extractWeightInOz = (metalWeight: null | string): null | number => {
  if (!metalWeight) return null;

  const weightMatch =
    /(?<weight>\d+(?:\.\d+)?)\s*(?:troy\s+)?(?<unit>gram|g|ounce|oz)/i.exec(
      metalWeight,
    );
  if (weightMatch?.groups?.weight && weightMatch.groups.unit) {
    const weight = parseFloat(weightMatch.groups.weight);
    const unit = weightMatch.groups.unit.toLowerCase();

    if (unit === "gram" || unit === "g") {
      return weight / 31.1035; // Convert grams to troy ounces
    } else if (unit === "ounce" || unit === "oz") {
      return weight;
    }
  }

  return null;
};

// Fallback Pure product IDs for standard weights (accredited items)
const PURE_FALLBACK_IDS: Record<string, Record<string, string>> = {
  gold: {
    "5g": "0c4e939a-dd7b-4a1e-ae1e-2907ec4c40fb",
    "20g": "2a1e58e0-b739-46eb-875f-db22abde20d6",
    "100g": "92c6a07e-7708-4085-97c8-7cdc3fc85fda",
    "1oz": "cad52d53-182a-4818-900b-832f94d01d8b",
  },
  silver: {
    "10oz": "07c8e315-2932-474b-b327-627a4dc9e62c",
    "1000oz": "218972c1-da23-4a80-b394-999acb286d87",
  },
};

// Helper to get fallback Pure product ID based on weight and metal type
const getFallbackPureId = (
  metalType: "gold" | "silver",
  weightInOz: number,
): null | string => {
  const weightInGrams = weightInOz * 31.1035;

  if (metalType === "gold") {
    // Match to closest standard gold weight
    if (Math.abs(weightInGrams - 5) < 0.5) return PURE_FALLBACK_IDS.gold["5g"];
    if (Math.abs(weightInGrams - 20) < 0.5) return PURE_FALLBACK_IDS.gold["20g"];
    if (Math.abs(weightInGrams - 100) < 1) return PURE_FALLBACK_IDS.gold["100g"];
    if (Math.abs(weightInOz - 1) < 0.05) return PURE_FALLBACK_IDS.gold["1oz"];
  } else if (metalType === "silver") {
    // Match to closest standard silver weight
    if (Math.abs(weightInOz - 10) < 0.5) return PURE_FALLBACK_IDS.silver["10oz"];
    if (Math.abs(weightInOz - 1000) < 10) return PURE_FALLBACK_IDS.silver["1000oz"];
  }

  return null;
};

// Auto-match Costco products to Pure products
export const matchCostcoProductToPure = internalMutation({
  args: {
    costcoProductId: v.string(),
  },
  handler: async (ctx, args) => {
    const timestamp = Date.now();

    // Get the Costco product
    const costcoProduct = await ctx.db
      .query("costcoProducts")
      .withIndex("by_product_id", (q) =>
        q.eq("productId", args.costcoProductId),
      )
      .first();

    if (!costcoProduct) {
      console.warn(
        `Costco product ${args.costcoProductId} not found for matching`,
      );
      return { matched: false };
    }

    // NEVER override manual matches
    if (costcoProduct.matchStatus === "manual_matched") {
      console.info(
        `⏭️  SKIPPING: ${costcoProduct.name} (${args.costcoProductId}) - manually matched`,
      );
      return { matched: true, status: "manual_matched", skipped: true };
    }

    const weightInOz = extractWeightInOz(costcoProduct.metalWeight);

    if (!weightInOz) {
      console.warn(
        `Could not extract weight for ${costcoProduct.name} (${args.costcoProductId})`,
      );

      // Get fallback generic spot price (last resort)
      const fallbackSpotPrice = await ctx.db
        .query("collectPurePrices")
        .withIndex("by_metal", (q) =>
          q.eq("metalType", costcoProduct.metalType),
        )
        .order("desc")
        .first();

      await ctx.db.patch(costcoProduct._id, {
        matchStatus: "fallback",
        pureBidPrice: fallbackSpotPrice?.bidPrice ?? null,
        pureBidPricePerOz: fallbackSpotPrice?.bidPrice ?? null,
        pureBidUpdated: timestamp,
        pureProductId: null,
      });
      return { matched: false, status: "fallback" };
    }

    // Try to get a weight-specific fallback Pure product
    const fallbackPureId = getFallbackPureId(costcoProduct.metalType, weightInOz);
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
      console.warn(
        `No Pure products found for ${costcoProduct.metalType}, using fallback`,
      );

      if (fallbackPureProduct) {
        console.info(
          `Using fallback Pure product: ${fallbackPureProduct.productName} (${fallbackPureId})`,
        );
        await ctx.db.patch(costcoProduct._id, {
          matchStatus: "fallback",
          pureBidPrice: fallbackPureProduct.currentBidPrice,
          pureBidPricePerOz: fallbackPureProduct.currentBidPricePerOz,
          pureBidUpdated: timestamp,
          pureProductId: fallbackPureId,
        });
      } else {
        // Last resort: use generic spot price
        const fallbackSpotPrice = await ctx.db
          .query("collectPurePrices")
          .withIndex("by_metal", (q) =>
            q.eq("metalType", costcoProduct.metalType),
          )
          .order("desc")
          .first();

        await ctx.db.patch(costcoProduct._id, {
          matchStatus: "fallback",
          pureBidPrice: fallbackSpotPrice?.bidPrice ?? null,
          pureBidPricePerOz: fallbackSpotPrice?.bidPrice ?? null,
          pureBidUpdated: timestamp,
          pureProductId: null,
        });
      }

      return { matched: false, status: "fallback" };
    }

    // Matching logic: conservative approach - only match if very confident
    interface ScoredMatch {
      product: (typeof pureProducts)[0];
      details: string;
      score: number;
    }

    const matches: ScoredMatch[] = [];

    // Normalize names for comparison
    const costcoNameLower = costcoProduct.name
      .toLowerCase()
      .replace(/[^\w\s]/g, " ") // Remove punctuation
      .replace(/\s+/g, " ") // Normalize spaces
      .trim();

    for (const pureProduct of pureProducts) {
      const pureNameLower = pureProduct.productName
        .toLowerCase()
        .replace(/[^\w\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      let score = 0;
      const matchDetails: string[] = [];

      // 1. WEIGHT MATCH (REQUIRED - must be exact)
      const weightDiff = Math.abs(pureProduct.weight - weightInOz);
      if (weightDiff > 0.05) {
        continue; // Skip if weight doesn't match closely
      }
      score += 100;
      matchDetails.push("weight");

      // 2. MANUFACTURER MATCH (high confidence indicator)
      if (pureProduct.manufacturer) {
        const manufacturer = pureProduct.manufacturer.toLowerCase();
        // Check for common manufacturer variations
        const manufacturerVariants = [
          manufacturer,
          manufacturer.replace(/\s+/g, ""), // "pamp suisse" -> "pampsuisse"
        ];

        const hasManufacturer = manufacturerVariants.some((variant) =>
          costcoNameLower.includes(variant),
        );

        if (hasManufacturer) {
          score += 100; // High confidence when manufacturer matches
          matchDetails.push(`brand:${manufacturer}`);
        } else if (manufacturer.length > 3) {
          // If Pure has a manufacturer but Costco doesn't mention it, be cautious
          score -= 50;
        }
      }

      // 3. PRODUCT TYPE MATCH (bar vs coin)
      if (pureProduct.productType) {
        const productType = pureProduct.productType.toLowerCase();
        if (costcoNameLower.includes(productType)) {
          score += 50;
          matchDetails.push(`type:${productType}`);
        }
      }

      // 4. SPECIFIC PRODUCT LINE MATCH (e.g., "Lady Fortuna", "Britannia", "Maple Leaf")
      // Extract significant multi-word phrases (2-3 words)
      const pureWords = pureNameLower.split(/\s+/);
      const costcoWords = costcoNameLower.split(/\s+/);

      // Look for 2-3 word phrases that appear in both
      for (let i = 0; i < pureWords.length - 1; i++) {
        const twoWord = `${pureWords[i]} ${pureWords[i + 1]}`;
        const threeWord =
          i < pureWords.length - 2
            ? `${pureWords[i]} ${pureWords[i + 1]} ${pureWords[i + 2]}`
            : null;

        // Skip common/generic phrases
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

        if (
          threeWord &&
          !genericPhrases.includes(threeWord) &&
          costcoNameLower.includes(threeWord)
        ) {
          score += 75; // Strong match for 3-word phrase
          matchDetails.push(`phrase:"${threeWord}"`);
        } else if (
          !genericPhrases.includes(twoWord) &&
          costcoNameLower.includes(twoWord)
        ) {
          score += 40; // Good match for 2-word phrase
          matchDetails.push(`phrase:"${twoWord}"`);
        }
      }

      // Only consider this a viable match if score is meaningful
      if (score >= 150) {
        // Require high confidence
        matches.push({
          details: matchDetails.join(", "),
          product: pureProduct,
          score,
        });
      }
    }

    // Sort by score
    matches.sort((a, b) => b.score - a.score);

    // TODO: Add logging service for match notifications
    if (matches.length === 0) {
      console.info(
        `❌ NO MATCH for Costco product: ${costcoProduct.name} (${args.costcoProductId})`,
      );
      console.info(`   Weight: ${weightInOz} oz, Metal: ${costcoProduct.metalType}`);
      console.info(`   Available Pure products: ${pureProducts.length}`);

      if (fallbackPureProduct) {
        console.info(
          `   Using fallback Pure product: ${fallbackPureProduct.productName} (${fallbackPureId})`,
        );
        await ctx.db.patch(costcoProduct._id, {
          matchStatus: "fallback",
          pureBidPrice: fallbackPureProduct.currentBidPrice,
          pureBidPricePerOz: fallbackPureProduct.currentBidPricePerOz,
          pureBidUpdated: timestamp,
          pureProductId: fallbackPureId,
        });
      } else {
        console.info(`   Using generic ${costcoProduct.metalType} spot price`);
        // Last resort: use generic spot price
        const fallbackSpotPrice = await ctx.db
          .query("collectPurePrices")
          .withIndex("by_metal", (q) =>
            q.eq("metalType", costcoProduct.metalType),
          )
          .order("desc")
          .first();

        await ctx.db.patch(costcoProduct._id, {
          matchStatus: "fallback",
          pureBidPrice: fallbackSpotPrice?.bidPrice ?? null,
          pureBidPricePerOz: fallbackSpotPrice?.bidPrice ?? null,
          pureBidUpdated: timestamp,
          pureProductId: null,
        });
      }

      return { matched: false, status: "fallback" };
    }

    const bestMatch = matches[0];

    // Conservative threshold: require very high confidence
    if (bestMatch.score < 250 || matches.length > 1) {
      // Low confidence or multiple matches - needs review or use fallback
      console.info(
        `⚠️  NEEDS REVIEW for Costco product: ${costcoProduct.name} (${args.costcoProductId})`,
      );
      console.info(
        `   Found ${matches.length} potential matches, top score: ${bestMatch.score}`,
      );
      console.info(`   Top candidates:`);
      matches.slice(0, 3).forEach((m, i) => {
        console.info(
          `     ${i + 1}. ${m.product.productName} (ID: ${m.product.pureProductId})`,
        );
        console.info(`        Score: ${m.score} | Matched: ${m.details}`);
      });

      // Use fallback instead of guessing
      if (fallbackPureProduct) {
        console.info(
          `   Using fallback Pure product instead: ${fallbackPureProduct.productName}`,
        );
        await ctx.db.patch(costcoProduct._id, {
          matchStatus: "needs_review",
          pureBidPrice: fallbackPureProduct.currentBidPrice,
          pureBidPricePerOz: fallbackPureProduct.currentBidPricePerOz,
          pureBidUpdated: timestamp,
          pureProductId: fallbackPureId,
        });
      } else {
        // Use best guess but mark as needs review
        await ctx.db.patch(costcoProduct._id, {
          matchStatus: "needs_review",
          pureBidPrice: bestMatch.product.currentBidPrice,
          pureBidPricePerOz: bestMatch.product.currentBidPricePerOz,
          pureBidUpdated: timestamp,
          pureProductId: bestMatch.product.pureProductId,
        });
      }

      return {
        candidates: matches.slice(0, 3).map((m) => ({
          details: m.details,
          pureProductId: m.product.pureProductId,
          productName: m.product.productName,
          score: m.score,
        })),
        matched: false,
        status: "needs_review",
      };
    }

    // High confidence match (score >= 250 and only one match)
    console.info(
      `✅ AUTO MATCHED: ${costcoProduct.name} (${args.costcoProductId})`,
    );
    console.info(
      `   → ${bestMatch.product.productName} (${bestMatch.product.pureProductId})`,
    );
    console.info(`   Score: ${bestMatch.score} | Matched: ${bestMatch.details}`);

    await ctx.db.patch(costcoProduct._id, {
      matchStatus: "auto_matched",
      pureBidPrice: bestMatch.product.currentBidPrice,
      pureBidPricePerOz: bestMatch.product.currentBidPricePerOz,
      pureBidUpdated: timestamp,
      pureProductId: bestMatch.product.pureProductId,
    });

    return {
      matched: true,
      pureProductId: bestMatch.product.pureProductId,
      score: bestMatch.score,
      status: "auto_matched",
    };
  },
});

// Manually set a Pure product match (will never be overridden by auto-matching)
export const manuallyMatchProduct = internalMutation({
  args: {
    costcoProductId: v.string(),
    pureProductId: v.string(),
  },
  handler: async (ctx, args) => {
    const timestamp = Date.now();

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

    // Get the Pure product to fetch current bid price
    const pureProduct = await ctx.db
      .query("pureProducts")
      .withIndex("by_pure_id", (q) =>
        q.eq("pureProductId", args.pureProductId),
      )
      .first();

    if (!pureProduct) {
      throw new Error(`Pure product ${args.pureProductId} not found`);
    }

    // Set the manual match
    await ctx.db.patch(costcoProduct._id, {
      matchStatus: "manual_matched",
      pureBidPrice: pureProduct.currentBidPrice,
      pureBidPricePerOz: pureProduct.currentBidPricePerOz,
      pureBidUpdated: timestamp,
      pureProductId: args.pureProductId,
    });

    console.info(
      `🔧 MANUAL MATCH: ${costcoProduct.name} → ${pureProduct.productName}`,
    );

    return {
      costcoProduct: costcoProduct.name,
      pureProduct: pureProduct.productName,
      success: true,
    };
  },
});

// Internal query to get all products for batch matching
export const getAllProductsForMatching = internalMutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("costcoProducts").collect();
  },
});

// Batch match all Costco products (can be called after Pure products are fetched)
export const matchAllCostcoProducts = internalAction({
  args: {},
  handler: async (ctx): Promise<{ fallback: number; manualMatches: number; matched: number; needsReview: number; total: number }> => {
    const costcoProducts = await ctx.runMutation(
      internal.costco.getAllProductsForMatching,
      {},
    );

    let matched = 0;
    let needsReview = 0;
    let fallback = 0;
    let manualMatches = 0;

    for (const product of costcoProducts) {
      const result = await ctx.runMutation(
        internal.costco.matchCostcoProductToPure,
        {
          costcoProductId: product.productId,
        },
      );

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
