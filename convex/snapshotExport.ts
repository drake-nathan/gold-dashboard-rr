/**
 * Snapshot Export Functions
 *
 * Export specific tables for dev environment seeding.
 * Called by scripts/snapshot.ts
 */

import { query } from "./_generated/server";

// Export all documents from costcoProducts
export const exportCostcoProducts = query({
  args: {},
  handler: async (ctx) => {
    return ctx.db.query("costcoProducts").collect();
  },
});

// Export all documents from pureProducts
export const exportPureProducts = query({
  args: {},
  handler: async (ctx) => {
    return ctx.db.query("pureProducts").collect();
  },
});

// Export all documents from marketPrices
export const exportMarketPrices = query({
  args: {},
  handler: async (ctx) => {
    return ctx.db.query("marketPrices").collect();
  },
});

// Export latest collectPurePrices (just the most recent for each metal type)
// Full history not needed for dev - just need current spot prices
export const exportCollectPurePrices = query({
  args: {},
  handler: async (ctx) => {
    const metals = ["gold", "silver", "platinum", "palladium"] as const;
    const latestPrices = [];

    for (const metal of metals) {
      const latest = await ctx.db
        .query("collectPurePrices")
        .withIndex("by_metal", (q) => q.eq("metalType", metal))
        .order("desc")
        .first();

      if (latest) {
        latestPrices.push(latest);
      }
    }

    return latestPrices;
  },
});
