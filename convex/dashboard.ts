import { query } from "./_generated/server";

export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const goldProducts = await ctx.db
      .query("costcoProducts")
      .withIndex("by_metal_type", (q) => q.eq("metalType", "gold"))
      .take(1000);

    const silverProducts = await ctx.db
      .query("costcoProducts")
      .withIndex("by_metal_type", (q) => q.eq("metalType", "silver"))
      .take(1000);

    const lastFetch = await ctx.db
      .query("fetchRuns")
      .withIndex("by_timestamp")
      .order("desc")
      .first();

    // Get latest Collect Pure spot prices (for fallback)
    const collectPureGold = await ctx.db
      .query("collectPurePrices")
      .withIndex("by_metal", (q) => q.eq("metalType", "gold"))
      .order("desc")
      .first();

    const collectPureSilver = await ctx.db
      .query("collectPurePrices")
      .withIndex("by_metal", (q) => q.eq("metalType", "silver"))
      .order("desc")
      .first();

    // Get market prices from Gold API
    const marketPrices = await ctx.db.query("marketPrices").collect();

    // Get all Pure products for JOIN
    const pureProducts = await ctx.db.query("pureProducts").collect();
    const pureProductsMap = new Map(pureProducts.map((p) => [p.pureProductId, p]));

    // Helper to calculate spread with fresh Pure bid prices
    const calculateSpread = (
      product: (typeof goldProducts)[0],
      fallbackBidPrice: null | number,
    ) => {
      // JOIN: Look up Pure product by pureProductId to get FRESH bid price
      let pureBidPrice: null | number = null;
      let pureBidPricePerOz: null | number = null;
      let pureProductName: null | string = null;
      let pureProductSku: null | string = null;
      let isUsingGenericFallback = false;

      if (product.pureProductId) {
        const pureProduct = pureProductsMap.get(product.pureProductId);
        if (pureProduct) {
          pureBidPrice = pureProduct.currentBidPrice;
          pureBidPricePerOz = pureProduct.currentBidPricePerOz;
          pureProductName = pureProduct.productName;
          pureProductSku = pureProduct.sku ?? null;
          isUsingGenericFallback = pureProduct.isGenericFallback ?? false;
        }
      }

      // Weight-based fallback: If no direct match, try to find generic fallback with exact weight
      if (!pureBidPricePerOz && product.currentPricePerOunce) {
        // Calculate total weight from price per ounce
        const totalWeight = product.currentPrice / product.currentPricePerOunce;

        // Look for generic fallback product with matching metal type and weight (±0.1 oz tolerance)
        const genericFallback = pureProducts.find(
          (p) =>
            p.isGenericFallback === true &&
            p.metalType === product.metalType &&
            p.weight &&
            Math.abs(p.weight - totalWeight) < 0.1,
        );

        if (genericFallback) {
          pureBidPrice = genericFallback.currentBidPrice;
          pureBidPricePerOz = genericFallback.currentBidPricePerOz;
          pureProductName = genericFallback.productName;
          pureProductSku = genericFallback.sku ?? null;
          isUsingGenericFallback = true;
        }
      }

      // Final fallback to generic spot price if no weight-based match
      const bidPrice = pureBidPricePerOz ?? fallbackBidPrice;

      const spread =
        bidPrice && product.currentPricePerOunce ? product.currentPricePerOunce - bidPrice : null;
      const spreadPercentage =
        spread && product.currentPricePerOunce
          ? (spread / product.currentPricePerOunce) * 100
          : null;

      return {
        ...product,
        isUsingGenericFallback,
        pureBidPrice,
        pureBidPricePerOz: bidPrice,
        pureProductName,
        pureProductSku,
        spread,
        spreadPercentage,
      };
    };

    // Calculate spreads for ALL gold products (including out of stock)
    const goldWithSpreads = goldProducts
      .map((p) => calculateSpread(p, collectPureGold?.bidPrice ?? null))
      .sort((a, b) => {
        // Sort by spread percentage, putting items without price per oz at the end
        const aSpread = a.spreadPercentage ?? 999;
        const bSpread = b.spreadPercentage ?? 999;
        return aSpread - bSpread;
      });

    // Calculate spreads for ALL silver products (including out of stock)
    const silverWithSpreads = silverProducts
      .map((p) => calculateSpread(p, collectPureSilver?.bidPrice ?? null))
      .sort((a, b) => {
        // Sort by spread percentage, putting items without price per oz at the end
        const aSpread = a.spreadPercentage ?? 999;
        const bSpread = b.spreadPercentage ?? 999;
        return aSpread - bSpread;
      });

    return {
      collectPure: {
        gold: collectPureGold
          ? {
              bidPrice: collectPureGold.bidPrice,
              isMock: collectPureGold.isMock,
              spotPrice: collectPureGold.spotPrice,
              timestamp: collectPureGold.timestamp,
            }
          : null,
        silver: collectPureSilver
          ? {
              bidPrice: collectPureSilver.bidPrice,
              isMock: collectPureSilver.isMock,
              spotPrice: collectPureSilver.spotPrice,
              timestamp: collectPureSilver.timestamp,
            }
          : null,
      },
      goldProducts: {
        bestSpread: goldWithSpreads, // Return ALL products sorted by spread
        bestValue: goldProducts.sort(
          (a, b) => (a.currentPricePerOunce ?? Infinity) - (b.currentPricePerOunce ?? Infinity),
        ),
        inStock: goldProducts.filter((p) => p.currentInStock).length,
        total: goldProducts.length,
      },
      lastFetch: lastFetch
        ? {
            priceChanges: lastFetch.priceChanges,
            productsFound: lastFetch.productsFound,
            stockChanges: lastFetch.stockChanges,
            timestamp: lastFetch.timestamp,
          }
        : null,
      marketPrices,
      silverProducts: {
        bestSpread: silverWithSpreads, // Return ALL products sorted by spread
        bestValue: silverProducts.sort(
          (a, b) => (a.currentPricePerOunce ?? Infinity) - (b.currentPricePerOunce ?? Infinity),
        ),
        inStock: silverProducts.filter((p) => p.currentInStock).length,
        total: silverProducts.length,
      },
      totalProducts: goldProducts.length + silverProducts.length,
    };
  },
});
