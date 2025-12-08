/**
 * Migrations History
 *
 * This file tracks completed migrations for the gold-dashboard project.
 */

import { mutation } from "./_generated/server";
import {
  extractCountMultiplier,
  extractWeightInOz,
} from "./lib/metalParsing";

/**
 * COMPLETED: 2025-01-XX - Remove Pure bid prices from Costco products
 *
 * Migration successfully removed the deprecated pureBidPrice, pureBidPricePerOz,
 * and pureBidUpdated fields from all 22 Costco products.
 *
 * These fields are no longer used - we now JOIN with the pureProducts table
 * to get fresh bid prices instead of storing stale copies.
 *
 * Results:
 * - Total products processed: 22
 * - Products updated: 22
 * - Duration: <1s
 */

/**
 * COMPLETED: 2025-12-08 - Fix multi-count product weights
 *
 * Products like "1 oz PAMP Lady of Liberty Silver Bar, 20-count" were showing
 * as 1oz instead of 20oz. This migration recalculates weights for products
 * with count multipliers in their names.
 *
 * Results:
 * - Total products processed: 41
 * - Products updated: 1 (Lady of Liberty, American Eagle was already correct)
 *
 * The extractMetalAttributes function was also updated to handle count
 * multipliers going forward, and upsertProduct now updates metalWeight.
 */
export const fixMultiCountWeights = mutation({
  args: {},
  handler: async (ctx) => {
    const products = await ctx.db.query("costcoProducts").collect();
    let updated = 0;

    for (const product of products) {
      const countMultiplier = extractCountMultiplier(product.name);

      if (countMultiplier > 1 && product.metalWeight) {
        const baseWeightOz = extractWeightInOz(product.metalWeight);
        if (baseWeightOz && baseWeightOz < countMultiplier) {
          // Weight needs to be multiplied
          const totalOz = baseWeightOz * countMultiplier;
          const newWeight = `${totalOz} Troy Ounce`;
          const newPricePerOz = product.currentPrice / totalOz;

          await ctx.db.patch(product._id, {
            currentPricePerOunce: newPricePerOz,
            metalWeight: newWeight,
          });

          console.log(
            `Updated ${product.name}: ${product.metalWeight} -> ${newWeight}`,
          );
          updated++;
        }
      }
    }

    return { total: products.length, updated };
  },
});
