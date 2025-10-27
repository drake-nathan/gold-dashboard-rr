import { v } from "convex/values";

import { internal } from "./_generated/api";
import { internalAction, internalMutation, query } from "./_generated/server";

// Asset configuration for Gold API
const ASSETS = [
  { assetType: "gold" as const, symbol: "XAU" },
  { assetType: "silver" as const, symbol: "XAG" },
  { assetType: "bitcoin" as const, symbol: "BTC" },
];

// Gold API response type
interface PriceResponse {
  name: string;
  price: number;
  symbol: string;
  updatedAt: string;
  updatedAtReadable: string;
}

/**
 * Fetch market prices from Gold API
 * Called by cron job every 5 minutes
 * No rate limits, no authentication required for real-time prices
 */
export const fetchMarketPrices = internalAction({
  args: {},
  handler: async (ctx) => {
    const results = {
      errors: [] as string[],
      failed: 0,
      success: 0,
    };

    const now = Date.now();

    // Fetch data for each asset
    for (const asset of ASSETS) {
      try {
        const url = `https://api.gold-api.com/price/${asset.symbol}`;

        const response = await fetch(url);
        const data = (await response.json()) as PriceResponse;

        // Check for API errors
        if ("error" in data) {
          const error = data as unknown as { error: string };
          throw new Error(`API Error: ${error.error}`);
        }

        if (!data.price || typeof data.price !== "number") {
          throw new Error(
            `Invalid price data received for ${asset.symbol}: ${JSON.stringify(data)}`,
          );
        }

        // Update the database with current price and history
        await ctx.runMutation(internal.twelve.upsertMarketPrice, {
          assetType: asset.assetType,
          currentPrice: data.price,
          symbol: asset.symbol,
          timestamp: now,
        });

        results.success++;
      } catch (error) {
        results.failed++;
        const errorMessage = `Failed to fetch ${asset.symbol}: ${error instanceof Error ? error.message : String(error)}`;
        results.errors.push(errorMessage);
        console.error(errorMessage);
      }
    }

    // Log summary
    console.info(
      `Gold API fetch complete: ${results.success} success, ${results.failed} failed`,
    );
    if (results.errors.length > 0) {
      console.error("Errors:", results.errors);
    }

    return results;
  },
});

/**
 * Upsert a market price entry and add to history
 * Calculates 24h percentage change from historical data
 * Internal mutation called by the fetch action
 */
export const upsertMarketPrice = internalMutation({
  args: {
    assetType: v.union(
      v.literal("gold"),
      v.literal("silver"),
      v.literal("bitcoin"),
    ),
    currentPrice: v.number(),
    symbol: v.string(),
    timestamp: v.number(),
  },
  handler: async (ctx, args) => {
    // Add to price history
    await ctx.db.insert("marketPriceHistory", {
      price: args.currentPrice,
      symbol: args.symbol,
      timestamp: args.timestamp,
    });

    // Calculate 24h percentage change
    // Look for a price from ~24 hours ago (give or take 30 minutes for flexibility)
    const twentyFourHoursAgo = args.timestamp - 24 * 60 * 60 * 1000;
    const searchWindowStart = twentyFourHoursAgo - 30 * 60 * 1000; // 24.5 hours ago
    const searchWindowEnd = twentyFourHoursAgo + 30 * 60 * 1000; // 23.5 hours ago

    const historicalPrice = await ctx.db
      .query("marketPriceHistory")
      .withIndex("by_symbol_and_time", (q) =>
        q.eq("symbol", args.symbol).gte("timestamp", searchWindowStart),
      )
      .filter((q) => q.lte(q.field("timestamp"), searchWindowEnd))
      .first();

    let percentChange: null | number = null;
    if (historicalPrice) {
      // Calculate percentage change: ((current - old) / old) * 100
      percentChange =
        ((args.currentPrice - historicalPrice.price) / historicalPrice.price) *
        100;
    }

    // Check if entry exists
    const existing = await ctx.db
      .query("marketPrices")
      .withIndex("by_symbol", (q) => q.eq("symbol", args.symbol))
      .first();

    if (existing) {
      // Update existing entry
      await ctx.db.patch(existing._id, {
        currentPrice: args.currentPrice,
        lastUpdated: args.timestamp,
        percentChange,
      });
    } else {
      // Create new entry
      await ctx.db.insert("marketPrices", {
        assetType: args.assetType,
        currentPrice: args.currentPrice,
        lastUpdated: args.timestamp,
        percentChange,
        symbol: args.symbol,
      });
    }

    // Clean up old history (keep last 30 days to be safe)
    const thirtyDaysAgo = args.timestamp - 30 * 24 * 60 * 60 * 1000;
    const oldRecords = await ctx.db
      .query("marketPriceHistory")
      .withIndex("by_symbol_and_time", (q) =>
        q.eq("symbol", args.symbol).lt("timestamp", thirtyDaysAgo),
      )
      .collect();

    for (const record of oldRecords) {
      await ctx.db.delete(record._id);
    }
  },
});

/**
 * Get all market prices
 * Public query for frontend consumption
 */
export const getMarketPrices = query({
  args: {},
  handler: async (ctx) => {
    const prices = await ctx.db.query("marketPrices").collect();
    return prices;
  },
});

/**
 * Get market price for a specific asset
 * Public query for frontend consumption
 */
export const getMarketPrice = query({
  args: {
    assetType: v.union(
      v.literal("gold"),
      v.literal("silver"),
      v.literal("bitcoin"),
    ),
  },
  handler: async (ctx, args) => {
    const asset = ASSETS.find((a) => a.assetType === args.assetType);
    if (!asset) {
      return null;
    }

    const price = await ctx.db
      .query("marketPrices")
      .withIndex("by_symbol", (q) => q.eq("symbol", asset.symbol))
      .first();

    return price;
  },
});

/**
 * Get price history for a specific symbol
 * Debug query to verify history is being recorded
 */
export const getPriceHistory = query({
  args: {
    symbol: v.string(),
  },
  handler: async (ctx, args) => {
    const history = await ctx.db
      .query("marketPriceHistory")
      .withIndex("by_symbol", (q) => q.eq("symbol", args.symbol))
      .order("desc")
      .take(100);

    return history;
  },
});
