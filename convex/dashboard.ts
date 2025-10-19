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

    // Get latest Collect Pure prices
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

    // Get latest product bids for each metal with limits
    const goldProductBids = await ctx.db
      .query("collectPureProductBids")
      .withIndex("by_metal", (q) => q.eq("metalType", "gold"))
      .order("desc")
      .take(100); // Limit product bids

    const silverProductBids = await ctx.db
      .query("collectPureProductBids")
      .withIndex("by_metal", (q) => q.eq("metalType", "silver"))
      .order("desc")
      .take(100); // Limit product bids

    // Helper function to find best matching product bid
    const findBestProductBid = (
      product: (typeof goldProducts)[0],
      bids: typeof goldProductBids,
    ) => {
      // Simple matching based on weight for now - can be improved later
      const productWeight = product.metalWeight;
      if (!productWeight) return null;

      // Extract weight from product
      const weightMatch =
        /(?<weight>\d+(?:\.\d+)?)\s*(?:troy\s+)?(?<unit>ounce|oz|gram|g)/i.exec(
          productWeight,
        );
      if (!weightMatch?.groups?.weight || !weightMatch.groups.unit) return null;

      const weight = parseFloat(weightMatch.groups.weight);
      const unit = weightMatch.groups.unit.toLowerCase();

      // Convert to oz if needed
      const weightInOz =
        unit.includes("gram") || unit.includes("g") ? weight / 31.1035 : weight;

      // Find bid with closest weight match
      return (
        bids.find((bid) => Math.abs(bid.weight - weightInOz) < 0.1) ?? null
      );
    };

    // Calculate spreads for ALL gold products (including out of stock)
    const goldWithSpreads = goldProducts
      .map((p) => {
        // Try to find product-specific bid first, fallback to general bid
        const productBid = findBestProductBid(p, goldProductBids);
        const bidPrice = productBid?.bidPrice ?? collectPureGold?.bidPrice;

        const spread =
          bidPrice && p.currentPricePerOunce ?
            p.currentPricePerOunce - bidPrice
          : null;
        const spreadPercentage =
          spread && p.currentPricePerOunce ?
            (spread / p.currentPricePerOunce) * 100
          : null;

        return {
          ...p,
          collectPureBid: productBid?.bidPrice ?? null,
          spread,
          spreadPercentage,
        };
      })
      .sort((a, b) => {
        // Sort by spread percentage, putting items without price per oz at the end
        const aSpread = a.spreadPercentage ?? 999;
        const bSpread = b.spreadPercentage ?? 999;
        return aSpread - bSpread;
      });

    // Calculate spreads for ALL silver products (including out of stock)
    const silverWithSpreads = silverProducts
      .map((p) => {
        // Try to find product-specific bid first, fallback to general bid
        const productBid = findBestProductBid(p, silverProductBids);
        const bidPrice = productBid?.bidPrice ?? collectPureSilver?.bidPrice;

        const spread =
          bidPrice && p.currentPricePerOunce ?
            p.currentPricePerOunce - bidPrice
          : null;
        const spreadPercentage =
          spread && p.currentPricePerOunce ?
            (spread / p.currentPricePerOunce) * 100
          : null;

        return {
          ...p,
          collectPureBid: productBid?.bidPrice ?? null,
          spread,
          spreadPercentage,
        };
      })
      .sort((a, b) => {
        // Sort by spread percentage, putting items without price per oz at the end
        const aSpread = a.spreadPercentage ?? 999;
        const bSpread = b.spreadPercentage ?? 999;
        return aSpread - bSpread;
      });

    return {
      collectPure: {
        gold:
          collectPureGold ?
            {
              bidPrice: collectPureGold.bidPrice,
              isMock: collectPureGold.isMock,
              spotPrice: collectPureGold.spotPrice,
              timestamp: collectPureGold.timestamp,
            }
          : null,
        silver:
          collectPureSilver ?
            {
              bidPrice: collectPureSilver.bidPrice,
              isMock: collectPureSilver.isMock,
              spotPrice: collectPureSilver.spotPrice,
              timestamp: collectPureSilver.timestamp,
            }
          : null,
      },
      goldProducts: {
        bestSpread: goldWithSpreads, // Return ALL products, not just top 3
        bestValue: goldProducts.sort(
          (a, b) =>
            (a.currentPricePerOunce ?? Infinity) -
            (b.currentPricePerOunce ?? Infinity),
        ),
        inStock: goldProducts.filter((p) => p.currentInStock).length,
        total: goldProducts.length,
      },
      lastFetch:
        lastFetch ?
          {
            priceChanges: lastFetch.priceChanges,
            productsFound: lastFetch.productsFound,
            stockChanges: lastFetch.stockChanges,
            timestamp: lastFetch.timestamp,
          }
        : null,
      silverProducts: {
        bestSpread: silverWithSpreads, // Return ALL products, not just top 3
        bestValue: silverProducts.sort(
          (a, b) =>
            (a.currentPricePerOunce ?? Infinity) -
            (b.currentPricePerOunce ?? Infinity),
        ),
        inStock: silverProducts.filter((p) => p.currentInStock).length,
        total: silverProducts.length,
      },
      totalProducts: goldProducts.length + silverProducts.length,
    };
  },
});
