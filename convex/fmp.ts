import { v } from "convex/values";

import { internal } from "./_generated/api";
import { internalAction, internalMutation, query } from "./_generated/server";

/**
 * FMP API response types
 */
interface QuoteResponse {
  change: number;
  changePercentage: number; // Note: field name is changePercentage, not changesPercentage
  dayHigh: number;
  dayLow: number;
  exchange: string;
  marketCap: null | number;
  name: string;
  open: number;
  previousClose: number;
  price: number;
  priceAvg50: number;
  priceAvg200: number;
  symbol: string;
  timestamp: number;
  volume: number;
  yearHigh: number;
  yearLow: number;
}

/**
 * Check if current time is within market hours (8 AM - 6 PM ET)
 * Used to throttle API calls during extended hours
 */
const isMarketHours = (): boolean => {
  const now = new Date();

  // Convert to ET (UTC-5 or UTC-4 depending on DST)
  // Simple approach: use Intl API with America/New_York timezone
  const etTimeString = now.toLocaleString("en-US", {
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    timeZone: "America/New_York",
  });

  const [hours] = etTimeString.split(":").map(Number);

  // 8 AM - 6 PM ET (inclusive)
  return hours >= 8 && hours < 18;
};

/**
 * Fetch S&P 500 data from FMP API
 * Called by cron job every 5 minutes during market hours, less frequently off-hours
 */
export const fetchSP500 = internalAction({
  args: {},
  handler: async (ctx) => {
    const apiKey = process.env.FMP_API_KEY;

    if (!apiKey) {
      console.error("FMP_API_KEY is not set in environment variables");
      return {
        error: "FMP_API_KEY not configured",
        success: false,
      };
    }

    try {
      const now = Date.now();

      // Fetch S&P 500 quote
      const url = `https://financialmodelingprep.com/stable/quote?symbol=%5EGSPC&apikey=${apiKey}`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = (await response.json()) as QuoteResponse[];

      // FMP returns an array with a single quote object
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error(`Invalid response format: ${JSON.stringify(data)}`);
      }

      const quote = data[0];

      if (!quote.price || typeof quote.price !== "number") {
        throw new Error(
          `Invalid price data received: ${JSON.stringify(quote)}`,
        );
      }

      // FMP provides changePercentage directly (previous close to current)
      // This is essentially the "today's change" percentage
      const percentChange = quote.changePercentage;

      // Update the database
      await ctx.runMutation(internal.fmp.upsertSP500Price, {
        currentPrice: quote.price,
        percentChange,
        timestamp: now,
      });

      console.info(
        `FMP S&P 500 fetch successful: $${quote.price.toFixed(2)} (${percentChange !== null ? `${percentChange > 0 ? "+" : ""}${percentChange.toFixed(2)}%` : "N/A"})`,
      );

      return {
        percentChange,
        price: quote.price,
        success: true,
      };
    } catch (error) {
      const errorMessage = `Failed to fetch S&P 500: ${error instanceof Error ? error.message : String(error)}`;
      console.error(errorMessage);

      return {
        error: errorMessage,
        success: false,
      };
    }
  },
});

/**
 * Upsert S&P 500 price entry
 * FMP provides the percentage change directly, so we don't need to calculate from history
 * But we still add to history for potential future analysis
 */
export const upsertSP500Price = internalMutation({
  args: {
    currentPrice: v.number(),
    percentChange: v.union(v.number(), v.null()),
    timestamp: v.number(),
  },
  handler: async (ctx, args) => {
    const symbol = "^GSPC";

    // Add to price history for record-keeping
    await ctx.db.insert("marketPriceHistory", {
      price: args.currentPrice,
      symbol,
      timestamp: args.timestamp,
    });

    // Check if entry exists
    const existing = await ctx.db
      .query("marketPrices")
      .withIndex("by_symbol", (q) => q.eq("symbol", symbol))
      .first();

    if (existing) {
      // Update existing entry
      await ctx.db.patch(existing._id, {
        currentPrice: args.currentPrice,
        lastUpdated: args.timestamp,
        percentChange: args.percentChange,
      });
    } else {
      // Create new entry
      await ctx.db.insert("marketPrices", {
        assetType: "sp500",
        currentPrice: args.currentPrice,
        lastUpdated: args.timestamp,
        percentChange: args.percentChange,
        symbol,
      });
    }

    // Clean up old history (keep last 30 days)
    const thirtyDaysAgo = args.timestamp - 30 * 24 * 60 * 60 * 1000;
    const oldRecords = await ctx.db
      .query("marketPriceHistory")
      .withIndex("by_symbol_and_time", (q) =>
        q.eq("symbol", symbol).lt("timestamp", thirtyDaysAgo),
      )
      .collect();

    for (const record of oldRecords) {
      await ctx.db.delete(record._id);
    }
  },
});

/**
 * Get S&P 500 price
 * Public query for frontend consumption
 */
export const getSP500Price = query({
  args: {},
  handler: async (ctx) => {
    const price = await ctx.db
      .query("marketPrices")
      .withIndex("by_symbol", (q) => q.eq("symbol", "^GSPC"))
      .first();

    return price;
  },
});

/**
 * Get S&P 500 price history
 * Debug query to verify history is being recorded
 */
export const getSP500History = query({
  args: {},
  handler: async (ctx) => {
    const history = await ctx.db
      .query("marketPriceHistory")
      .withIndex("by_symbol", (q) => q.eq("symbol", "^GSPC"))
      .order("desc")
      .take(100);

    return history;
  },
});

// Export helper for cron jobs
export { isMarketHours };
