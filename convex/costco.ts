import { v } from "convex/values";

import { internal } from "./_generated/api";
import { internalAction, internalMutation, query } from "./_generated/server";
import {
  extractMetalAttributes,
  extractWeightInOz,
  getFallbackPureId,
  type ProcessedProduct,
  type RawProduct,
} from "./lib/metalParsing";

const UNWRANGLE_API_URL = "https://data.unwrangle.com/api/getter/";

// Product API response type
interface ProductApiResponse {
  credits_used: number;
  detail: {
    availability?: null | string;
    brand?: string;
    description?: string;
    images?: string[];
    in_stock: boolean | null; // Top-level can be null
    listing_price?: null | number;
    model_number?: string;
    name: string;
    price: null | number;
    product_id?: string;
    returns?: null | string;
    shipping?: string;
    sku?: string;
    specifications?: { name: string; value: string }[];
    // Stock info is often in variants for Costco products
    variants?: {
      in_stock: boolean;
      max_quantity?: number;
      options?: unknown[];
      part_number?: string;
      product_url?: string;
    }[];
  };
  platform: string;
  remaining_credits: number;
  result_count?: number;
  success: boolean;
}

// RawProduct and ProcessedProduct types are now imported from ./lib/metalParsing

interface ApiResponse {
  credits_used: number;
  no_of_pages: number;
  remaining_credits: number;
  results: RawProduct[];
  success: boolean;
  total_results: number;
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

// extractMetalAttributes is now imported from ./lib/metalParsing

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
        throw new Error(`API request failed. Credits remaining: ${data.remaining_credits}`);
      }

      // Filter for precious metals category
      const preciousMetalsProducts = data.results.filter((product) =>
        product.categories.includes("https://www.costco.com/precious-metals.html"),
      );

      // Process and filter valid metal products
      const processedProducts = preciousMetalsProducts
        .map(extractMetalAttributes)
        .filter((p): p is ProcessedProduct => p !== null);

      console.info(
        `Found ${processedProducts.length} metal products (${
          processedProducts.filter((p) => p.metalType === "gold").length
        } gold, ${processedProducts.filter((p) => p.metalType === "silver").length} silver)`,
      );

      // Track statistics
      let productsUpdated = 0;
      let priceChanges = 0;
      let stockChanges = 0;
      const updatedProductIds = new Set<string>();

      // Collect all product IDs seen in this fetch
      const seenProductIds = new Set(processedProducts.map((p) => p.id));

      // Process each product that was returned (these are in stock)
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

        // Auto-match to Pure products (for new products or products without matches)
        await ctx.runMutation(internal.costco.matchCostcoProductToPure, {
          costcoProductId: product.id,
        });
      }

      // Mark products not returned as out of stock
      const outOfStockResult = await ctx.runMutation(internal.costco.markUnseenProductsOutOfStock, {
        seenProductIds: Array.from(seenProductIds),
        timestamp,
      });

      stockChanges += outOfStockResult.stockChanges;
      productsUpdated += outOfStockResult.productsUpdated;
      for (const productId of outOfStockResult.updatedProductIds) {
        updatedProductIds.add(productId);
      }

      // Evaluate alerts for products that changed in this fetch cycle.
      if (updatedProductIds.size > 0) {
        await ctx.runMutation(internal.alerts.evaluateAlertsForProducts, {
          evaluatedAt: timestamp,
          productIds: [...updatedProductIds],
          source: "costco_search",
        });
      }

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

// How long Product API verification takes precedence over Search API (90 minutes)
const VERIFICATION_WINDOW_MS = 90 * 60 * 1000;

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

      // Determine effective stock status
      // Product API verification takes precedence if:
      // 1. Product was verified recently (within VERIFICATION_WINDOW_MS)
      // 2. Product API said it's OUT of stock (verifiedInStock === false)
      // 3. Search API is trying to say it's IN stock
      // This prevents Search API from incorrectly marking "Delivery Out of Stock" products as available
      const verificationAge = existing.lastVerifiedAt
        ? args.timestamp - existing.lastVerifiedAt
        : Infinity;
      const isWithinVerificationWindow = verificationAge < VERIFICATION_WINDOW_MS;
      const productApiSaysOutOfStock = existing.verifiedInStock === false;
      const searchApiSaysInStock = product.in_stock;

      const shouldTrustProductApi =
        isWithinVerificationWindow && productApiSaysOutOfStock && searchApiSaysInStock;

      // Use Product API's stock status if it should be trusted, otherwise use Search API
      const effectiveInStock = shouldTrustProductApi ? false : product.in_stock;

      if (shouldTrustProductApi) {
        console.info(
          `[Search API] Ignoring in_stock=true for ${product.name} - Product API verified as OOS ${Math.round(verificationAge / 60000)} min ago`,
        );
      }

      // Check for stock changes using effective stock status
      if (existing.currentInStock !== effectiveInStock) {
        stockChanged = true;

        // Record stock history
        await ctx.db.insert("stockHistory", {
          inStock: effectiveInStock,
          productId: product.id,
          timestamp: args.timestamp,
        });
      }

      // Check if metalWeight changed (e.g., count multiplier fix)
      const weightChanged = existing.metalWeight !== (product.metalWeight ?? null);

      // Update product if anything changed
      if (priceChanged || stockChanged || weightChanged) {
        await ctx.db.patch(existing._id, {
          currentInStock: effectiveInStock,
          currentPrice: product.price,
          currentPricePerOunce: product.pricePerOunce ?? null,
          lastUpdated: args.timestamp,
          // Update metalWeight if it changed
          ...(weightChanged && { metalWeight: product.metalWeight ?? null }),
          ...(priceChanged && { lastPriceChange: args.timestamp }),
          ...(stockChanged && { lastStockChange: args.timestamp }),
          // Set lastInStockAt when product goes OUT of stock
          ...(stockChanged && !effectiveInStock && { lastInStockAt: args.timestamp }),
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
        lastInStockAt: product.in_stock ? null : args.timestamp, // If new product is OOS, set timestamp
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
    const updatedProductIds: string[] = [];

    // Get all currently in-stock products
    const inStockProducts = await ctx.db
      .query("costcoProducts")
      .withIndex("by_metal_and_stock", (q) => q.eq("metalType", "gold").eq("currentInStock", true))
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
          lastInStockAt: args.timestamp, // Set timestamp when marking OOS
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
        updatedProductIds.push(product.productId);

        console.info(`Marked product ${product.name} (${product.productId}) as out of stock`);
      }
    }

    return { productsUpdated, stockChanges, updatedProductIds };
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
      (a, b) => (a.currentPricePerOunce ?? Infinity) - (b.currentPricePerOunce ?? Infinity),
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
      .withIndex("by_product_and_time", (q) => q.eq("productId", args.productId))
      .filter((q) => q.gte(q.field("timestamp"), cutoff))
      .take(1000); // Limit history queries

    return history.sort((a, b) => a.timestamp - b.timestamp);
  },
});

// extractWeightInOz is now imported from ./lib/metalParsing

// PURE_FALLBACK_IDS is now imported from ./lib/metalParsing

// getFallbackPureId is now imported from ./lib/metalParsing

// Auto-match Costco products to Pure products
export const matchCostcoProductToPure = internalMutation({
  args: {
    costcoProductId: v.string(),
  },
  handler: async (ctx, args) => {
    // Get the Costco product
    const costcoProduct = await ctx.db
      .query("costcoProducts")
      .withIndex("by_product_id", (q) => q.eq("productId", args.costcoProductId))
      .first();

    if (!costcoProduct) {
      console.warn(`Costco product ${args.costcoProductId} not found for matching`);
      return { matched: false };
    }

    // NEVER override manual matches
    if (costcoProduct.matchStatus === "manual_matched") {
      console.info(
        `⏭️  SKIPPING: ${costcoProduct.name} (${args.costcoProductId}) - manually matched`,
      );
      return { matched: true, skipped: true, status: "manual_matched" };
    }

    const weightInOz = extractWeightInOz(costcoProduct.metalWeight);

    if (!weightInOz) {
      console.warn(`Could not extract weight for ${costcoProduct.name} (${args.costcoProductId})`);

      // No weight available - can't match to Pure product
      await ctx.db.patch(costcoProduct._id, {
        matchStatus: "fallback",
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
      .withIndex("by_metal_type", (q) => q.eq("metalType", costcoProduct.metalType))
      .collect();

    if (pureProducts.length === 0) {
      console.warn(`No Pure products found for ${costcoProduct.metalType}, using fallback`);

      if (fallbackPureProduct) {
        console.info(
          `Using fallback Pure product: ${fallbackPureProduct.productName} (${fallbackPureId})`,
        );
        await ctx.db.patch(costcoProduct._id, {
          matchStatus: "fallback",
          pureProductId: fallbackPureId,
        });
      } else {
        // Last resort: use generic spot price (no Pure product match)
        await ctx.db.patch(costcoProduct._id, {
          matchStatus: "fallback",
          pureProductId: null,
        });
      }

      return { matched: false, status: "fallback" };
    }

    // Matching logic: conservative approach - only match if very confident
    interface ScoredMatch {
      details: string;
      product: (typeof pureProducts)[0];
      score: number;
    }

    const matches: ScoredMatch[] = [];

    // Normalize names for comparison
    const costcoNameLower = costcoProduct.name
      .toLowerCase()
      .replaceAll(/[^\s\w]/g, " ") // Remove punctuation
      .replaceAll(/\s+/g, " ") // Normalize spaces
      .trim();

    for (const pureProduct of pureProducts) {
      const pureNameLower = pureProduct.productName
        .toLowerCase()
        .replaceAll(/[^\s\w]/g, " ")
        .replaceAll(/\s+/g, " ")
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
          manufacturer.replaceAll(/\s+/g, ""), // "pamp suisse" -> "pampsuisse"
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
        } else if (!genericPhrases.includes(twoWord) && costcoNameLower.includes(twoWord)) {
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
          pureProductId: fallbackPureId,
        });
      } else {
        console.info(`   Using generic ${costcoProduct.metalType} spot price`);
        // No Pure product match - will use generic spot price from dashboard query
        await ctx.db.patch(costcoProduct._id, {
          matchStatus: "fallback",
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
      console.info(`   Found ${matches.length} potential matches, top score: ${bestMatch.score}`);
      console.info(`   Top candidates:`);
      matches.slice(0, 3).forEach((m, i) => {
        console.info(`     ${i + 1}. ${m.product.productName} (ID: ${m.product.pureProductId})`);
        console.info(`        Score: ${m.score} | Matched: ${m.details}`);
      });

      // Use fallback instead of guessing
      if (fallbackPureProduct) {
        console.info(`   Using fallback Pure product instead: ${fallbackPureProduct.productName}`);
        await ctx.db.patch(costcoProduct._id, {
          matchStatus: "needs_review",
          pureProductId: fallbackPureId,
        });
      } else {
        // Use best guess but mark as needs review
        await ctx.db.patch(costcoProduct._id, {
          matchStatus: "needs_review",
          pureProductId: bestMatch.product.pureProductId,
        });
      }

      return {
        candidates: matches.slice(0, 3).map((m) => ({
          details: m.details,
          productName: m.product.productName,
          pureProductId: m.product.pureProductId,
          score: m.score,
        })),
        matched: false,
        status: "needs_review",
      };
    }

    // High confidence match (score >= 250 and only one match)
    console.info(`✅ AUTO MATCHED: ${costcoProduct.name} (${args.costcoProductId})`);
    console.info(`   → ${bestMatch.product.productName} (${bestMatch.product.pureProductId})`);
    console.info(`   Score: ${bestMatch.score} | Matched: ${bestMatch.details}`);

    await ctx.db.patch(costcoProduct._id, {
      matchStatus: "auto_matched",
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
    // Get the Costco product
    const costcoProduct = await ctx.db
      .query("costcoProducts")
      .withIndex("by_product_id", (q) => q.eq("productId", args.costcoProductId))
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

    // Set the manual match (only store the pureProductId mapping)
    await ctx.db.patch(costcoProduct._id, {
      matchStatus: "manual_matched",
      pureProductId: args.pureProductId,
    });

    console.info(`🔧 MANUAL MATCH: ${costcoProduct.name} → ${pureProduct.productName}`);

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
  handler: async (
    ctx,
  ): Promise<{
    fallback: number;
    manualMatches: number;
    matched: number;
    needsReview: number;
    total: number;
  }> => {
    const costcoProducts = await ctx.runMutation(internal.costco.getAllProductsForMatching, {});

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

// Fetch single product details using Product API (10 credits per call)
export const fetchProductDetails = internalAction({
  args: {
    productId: v.string(),
    productUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.UNWRANGLE_API_KEY;
    if (!apiKey) {
      throw new Error("UNWRANGLE_API_KEY environment variable is required");
    }

    const params = new URLSearchParams({
      api_key: apiKey,
      platform: "costco_detail",
      url: args.productUrl,
    });

    const url = `${UNWRANGLE_API_URL}?${params.toString()}`;

    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0 (compatible; Gold-Dashboard/1.0)",
      },
    });

    if (!response.ok) {
      throw new Error(`Product API responded with status: ${response.status}`);
    }

    const data = (await response.json()) as ProductApiResponse;

    if (!data.success) {
      throw new Error(`Product API request failed. Credits remaining: ${data.remaining_credits}`);
    }

    // Stock status: Check top-level in_stock and availability first
    // When both are null, the product shows "Delivery Out of Stock" on Costco's website
    // even if variants[0].in_stock is true (which can be misleading)
    const topLevelInStock = data.detail.in_stock;
    const availability = data.detail.availability;

    // If top-level in_stock is explicitly null AND availability is null, treat as out of stock
    // This catches the "Delivery Out of Stock" case that variants don't reflect
    const isDeliveryOutOfStock = topLevelInStock === null && availability === null;

    // Only fall back to variant stock if top-level fields are populated
    const variantInStock = data.detail.variants?.[0]?.in_stock;
    const inStock = isDeliveryOutOfStock ? false : (topLevelInStock ?? variantInStock ?? false);

    // Log stock detection for debugging
    if (isDeliveryOutOfStock) {
      console.info(
        `[Product API] Detected "Delivery Out of Stock" for ${data.detail.name}: in_stock=${topLevelInStock}, availability=${availability}`,
      );
    }

    return {
      brand: data.detail.brand ?? null,
      creditsRemaining: data.remaining_credits,
      creditsUsed: data.credits_used,
      inStock,
      name: data.detail.name,
      price: data.detail.price,
      productId: args.productId,
      success: true,
    };
  },
});

// Get in-stock products for verification
export const getInStockProductsForVerification = internalMutation({
  args: {},
  handler: async (ctx) => {
    const goldInStock = await ctx.db
      .query("costcoProducts")
      .withIndex("by_metal_and_stock", (q) => q.eq("metalType", "gold").eq("currentInStock", true))
      .collect();

    const silverInStock = await ctx.db
      .query("costcoProducts")
      .withIndex("by_metal_and_stock", (q) =>
        q.eq("metalType", "silver").eq("currentInStock", true),
      )
      .collect();

    return [...goldInStock, ...silverInStock].map((p) => ({
      _id: p._id,
      currentPrice: p.currentPrice,
      name: p.name,
      productId: p.productId,
      url: p.url,
    }));
  },
});

// Update product from Product API verification
export const updateProductFromVerification = internalMutation({
  args: {
    inStock: v.boolean(),
    price: v.union(v.number(), v.null()),
    productId: v.string(),
    timestamp: v.number(),
  },
  handler: async (ctx, args) => {
    const product = await ctx.db
      .query("costcoProducts")
      .withIndex("by_product_id", (q) => q.eq("productId", args.productId))
      .first();

    if (!product) {
      console.warn(`Product ${args.productId} not found for verification`);
      return { priceChanged: false, stockChanged: false, updated: false };
    }

    let priceChanged = false;
    let stockChanged = false;
    let updated = false;

    // Check for price changes (only if we got a valid price)
    if (args.price !== null && product.currentPrice !== args.price) {
      priceChanged = true;

      // Calculate new price per ounce
      const weightInOz = extractWeightInOz(product.metalWeight);
      const newPricePerOunce = weightInOz ? args.price / weightInOz : null;

      await ctx.db.insert("priceHistory", {
        price: args.price,
        pricePerOunce: newPricePerOunce,
        priceReduced: null,
        productId: args.productId,
        timestamp: args.timestamp,
      });

      console.info(
        `[Product API] Price changed for ${product.name}: $${product.currentPrice} → $${args.price}`,
      );
    }

    // Check for stock changes
    if (product.currentInStock !== args.inStock) {
      stockChanged = true;

      await ctx.db.insert("stockHistory", {
        inStock: args.inStock,
        productId: args.productId,
        timestamp: args.timestamp,
      });

      console.info(
        `[Product API] Stock changed for ${product.name}: ${product.currentInStock} → ${args.inStock}`,
      );
    }

    // Always update verification fields, plus any changes
    const weightInOz = extractWeightInOz(product.metalWeight);
    const newPricePerOunce = args.price !== null && weightInOz ? args.price / weightInOz : null;

    await ctx.db.patch(product._id, {
      // Always set verification fields - Product API is authoritative for stock status
      lastVerifiedAt: args.timestamp,
      verifiedInStock: args.inStock,
      // Update stock and other fields
      ...(args.price !== null && { currentPrice: args.price }),
      ...(newPricePerOunce !== null && {
        currentPricePerOunce: newPricePerOunce,
      }),
      currentInStock: args.inStock,
      lastUpdated: args.timestamp,
      ...(priceChanged && { lastPriceChange: args.timestamp }),
      ...(stockChanged && { lastStockChange: args.timestamp }),
      // Set lastInStockAt when product goes OUT of stock
      ...(stockChanged && !args.inStock && { lastInStockAt: args.timestamp }),
    });

    if (priceChanged || stockChanged) {
      updated = true;
    }

    return { priceChanged, stockChanged, updated };
  },
});

// Verify in-stock products using Product API (called by cron)
export const verifyInStockProducts = internalAction({
  args: {},
  handler: async (
    ctx,
  ): Promise<{
    creditsRemaining?: number;
    priceChanges: number;
    productsVerified: number;
    stockChanges: number;
    success: boolean;
  }> => {
    const timestamp = Date.now();
    let fetchRunId: string | undefined;

    try {
      // Get all products currently marked as in-stock
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

      // Fetch each product's details
      for (const product of inStockProducts) {
        try {
          const details = await ctx.runAction(internal.costco.fetchProductDetails, {
            productId: product.productId,
            productUrl: product.url,
          });

          creditsRemaining = details.creditsRemaining;

          // Update product with verified data
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
          // Continue with other products even if one fails
        }
      }

      // Log fetch run
      fetchRunId = await ctx.runMutation(internal.costco.logFetchRun, {
        creditsRemaining,
        priceChanges,
        productsFound: inStockProducts.length,
        productsUpdated: priceChanges + stockChanges,
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
