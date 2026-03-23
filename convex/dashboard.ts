import { query } from "./_generated/server";

const maxDashboardProductsPerMetal = 1000;
const maxDashboardMarketPrices = 10;
const maxDashboardPureProductsPerMetal = 1000;

const toDashboardMarketPrice = (price: {
  assetType: "bitcoin" | "gold" | "silver" | "sp500";
  currentPrice: number;
  percentChange: null | number;
  symbol: string;
}) => ({
  assetType: price.assetType,
  currentPrice: price.currentPrice,
  percentChange: price.percentChange,
  symbol: price.symbol,
});

const toDashboardProduct = (
  product: {
    currentInStock: boolean;
    currentPrice: number;
    currentPricePerOunce: null | number;
    lastInStockAt?: null | number;
    metalType: "gold" | "silver";
    metalWeight: null | string;
    name: string;
    productId: string;
    thumbnail: null | string;
    url: string;
  },
  spreadData: {
    isUsingGenericFallback: boolean;
    pureBidPrice: null | number;
    pureBidPricePerOz: null | number;
    pureProductName: null | string;
    pureProductSku: null | string;
    spread: null | number;
    spreadPercentage: null | number;
  },
) => ({
  currentInStock: product.currentInStock,
  currentPrice: product.currentPrice,
  currentPricePerOunce: product.currentPricePerOunce,
  isUsingGenericFallback: spreadData.isUsingGenericFallback,
  lastInStockAt: product.lastInStockAt ?? null,
  metalType: product.metalType,
  metalWeight: product.metalWeight,
  name: product.name,
  productId: product.productId,
  pureBidPrice: spreadData.pureBidPrice,
  pureBidPricePerOz: spreadData.pureBidPricePerOz,
  pureProductName: spreadData.pureProductName,
  pureProductSku: spreadData.pureProductSku,
  spread: spreadData.spread,
  spreadPercentage: spreadData.spreadPercentage,
  thumbnail: product.thumbnail,
  url: product.url,
});

const takeBounded = async <T>(
  load: () => Promise<T[]>,
  limit: number,
  label: string,
): Promise<T[]> => {
  const results = await load();
  if (results.length > limit) {
    throw new Error(`${label} exceeded safe query limit of ${limit}`);
  }
  return results;
};

export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const [goldProducts, silverProducts] = await Promise.all([
      takeBounded(
        () =>
          ctx.db
            .query("costcoProducts")
            .withIndex("by_metal_type", (q) => q.eq("metalType", "gold"))
            .take(maxDashboardProductsPerMetal + 1),
        maxDashboardProductsPerMetal,
        "dashboard gold products",
      ),
      takeBounded(
        () =>
          ctx.db
            .query("costcoProducts")
            .withIndex("by_metal_type", (q) => q.eq("metalType", "silver"))
            .take(maxDashboardProductsPerMetal + 1),
        maxDashboardProductsPerMetal,
        "dashboard silver products",
      ),
    ]);

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

    const marketPrices = await takeBounded(
      () => ctx.db.query("marketPrices").take(maxDashboardMarketPrices + 1),
      maxDashboardMarketPrices,
      "dashboard market prices",
    );

    const pureProductsByMetal = await Promise.all([
      takeBounded(
        () =>
          ctx.db
            .query("pureProducts")
            .withIndex("by_metal_type", (q) => q.eq("metalType", "gold"))
            .take(maxDashboardPureProductsPerMetal + 1),
        maxDashboardPureProductsPerMetal,
        "dashboard gold pure products",
      ),
      takeBounded(
        () =>
          ctx.db
            .query("pureProducts")
            .withIndex("by_metal_type", (q) => q.eq("metalType", "silver"))
            .take(maxDashboardPureProductsPerMetal + 1),
        maxDashboardPureProductsPerMetal,
        "dashboard silver pure products",
      ),
    ]);
    const pureProducts = pureProductsByMetal.flat();
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

    // Calculate spreads for all products and project to the smaller UI shape.
    const goldWithSpreads = goldProducts
      .map((product) =>
        toDashboardProduct(product, calculateSpread(product, collectPureGold?.bidPrice ?? null)),
      )
      .toSorted((a, b) => {
        // Sort by spread percentage, putting items without price per oz at the end
        const aSpread = a.spreadPercentage ?? 999;
        const bSpread = b.spreadPercentage ?? 999;
        return aSpread - bSpread;
      });

    const silverWithSpreads = silverProducts
      .map((product) =>
        toDashboardProduct(product, calculateSpread(product, collectPureSilver?.bidPrice ?? null)),
      )
      .toSorted((a, b) => {
        // Sort by spread percentage, putting items without price per oz at the end
        const aSpread = a.spreadPercentage ?? 999;
        const bSpread = b.spreadPercentage ?? 999;
        return aSpread - bSpread;
      });

    return {
      goldProducts: {
        bestSpread: goldWithSpreads,
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
      marketPrices: marketPrices.map(toDashboardMarketPrice),
      silverProducts: {
        bestSpread: silverWithSpreads,
        inStock: silverProducts.filter((p) => p.currentInStock).length,
        total: silverProducts.length,
      },
      totalProducts: goldProducts.length + silverProducts.length,
    };
  },
});
