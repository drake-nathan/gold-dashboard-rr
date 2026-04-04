import { type QueryCtx, query } from "./_generated/server";
import { takeWithLimit } from "./lib/queries";

const maxDashboardProductsPerMetal = 1000;
const maxDashboardMarketPrices = 10;
const maxDashboardPureProductsPerMetal = 1000;

interface DashboardProduct {
  currentInStock: boolean;
  currentPrice: number;
  currentPricePerOunce: null | number;
  lastInStockAt?: null | number;
  metalType: "gold" | "silver";
  metalWeight: null | string;
  name: string;
  productId: string;
  pureProductId?: null | string;
  thumbnail: null | string;
  url: string;
}

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
  product: DashboardProduct,
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

const sortProductsBySpreadPercentage = <
  T extends {
    spreadPercentage: null | number;
  },
>(
  products: T[],
): T[] =>
  products.toSorted((a, b) => {
    const aSpread = a.spreadPercentage ?? 999;
    const bSpread = b.spreadPercentage ?? 999;
    return aSpread - bSpread;
  });

const listDashboardProductsByMetal = async (ctx: QueryCtx) => {
  const [goldProducts, silverProducts] = await Promise.all([
    takeWithLimit(
      () =>
        ctx.db
          .query("costcoProducts")
          .withIndex("by_metal_type", (q) => q.eq("metalType", "gold"))
          .take(maxDashboardProductsPerMetal + 1),
      maxDashboardProductsPerMetal,
      "dashboard gold products",
    ),
    takeWithLimit(
      () =>
        ctx.db
          .query("costcoProducts")
          .withIndex("by_metal_type", (q) => q.eq("metalType", "silver"))
          .take(maxDashboardProductsPerMetal + 1),
      maxDashboardProductsPerMetal,
      "dashboard silver products",
    ),
  ]);

  return { goldProducts, silverProducts };
};

const listDashboardPureProducts = async (ctx: QueryCtx) => {
  const pureProductsByMetal = await Promise.all([
    takeWithLimit(
      () =>
        ctx.db
          .query("pureProducts")
          .withIndex("by_metal_type", (q) => q.eq("metalType", "gold"))
          .take(maxDashboardPureProductsPerMetal + 1),
      maxDashboardPureProductsPerMetal,
      "dashboard gold pure products",
    ),
    takeWithLimit(
      () =>
        ctx.db
          .query("pureProducts")
          .withIndex("by_metal_type", (q) => q.eq("metalType", "silver"))
          .take(maxDashboardPureProductsPerMetal + 1),
      maxDashboardPureProductsPerMetal,
      "dashboard silver pure products",
    ),
  ]);

  return pureProductsByMetal.flat();
};

const listDashboardFallbackBidPrices = async (ctx: QueryCtx) => {
  const [collectPureGold, collectPureSilver] = await Promise.all([
    ctx.db
      .query("collectPurePrices")
      .withIndex("by_metal", (q) => q.eq("metalType", "gold"))
      .order("desc")
      .first(),
    ctx.db
      .query("collectPurePrices")
      .withIndex("by_metal", (q) => q.eq("metalType", "silver"))
      .order("desc")
      .first(),
  ]);

  return {
    gold: collectPureGold?.bidPrice ?? null,
    silver: collectPureSilver?.bidPrice ?? null,
  };
};

const buildDashboardProductsResponse = async (ctx: QueryCtx) => {
  const [{ goldProducts, silverProducts }, pureProducts, fallbackBidPrices] = await Promise.all([
    listDashboardProductsByMetal(ctx),
    listDashboardPureProducts(ctx),
    listDashboardFallbackBidPrices(ctx),
  ]);

  const pureProductsMap = new Map(pureProducts.map((product) => [product.pureProductId, product]));

  const calculateSpread = (product: DashboardProduct, fallbackBidPrice: null | number) => {
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

    if (!pureBidPricePerOz && product.currentPricePerOunce) {
      const totalWeight = product.currentPrice / product.currentPricePerOunce;
      const genericFallback = pureProducts.find(
        (pureProduct) =>
          pureProduct.isGenericFallback === true &&
          pureProduct.metalType === product.metalType &&
          pureProduct.weight &&
          Math.abs(pureProduct.weight - totalWeight) < 0.1,
      );

      if (genericFallback) {
        pureBidPrice = genericFallback.currentBidPrice;
        pureBidPricePerOz = genericFallback.currentBidPricePerOz;
        pureProductName = genericFallback.productName;
        pureProductSku = genericFallback.sku ?? null;
        isUsingGenericFallback = true;
      }
    }

    const bidPrice = pureBidPricePerOz ?? fallbackBidPrice;
    const spread =
      bidPrice && product.currentPricePerOunce ? product.currentPricePerOunce - bidPrice : null;
    const spreadPercentage =
      spread && product.currentPricePerOunce ? (spread / product.currentPricePerOunce) * 100 : null;

    return {
      isUsingGenericFallback,
      pureBidPrice,
      pureBidPricePerOz: bidPrice,
      pureProductName,
      pureProductSku,
      spread,
      spreadPercentage,
    };
  };

  return {
    goldProducts: sortProductsBySpreadPercentage(
      goldProducts.map((product) =>
        toDashboardProduct(product, calculateSpread(product, fallbackBidPrices.gold)),
      ),
    ),
    silverProducts: sortProductsBySpreadPercentage(
      silverProducts.map((product) =>
        toDashboardProduct(product, calculateSpread(product, fallbackBidPrices.silver)),
      ),
    ),
  };
};

const buildDashboardSummaryResponse = async (ctx: QueryCtx) => {
  const [{ goldProducts, silverProducts }, lastFetch, marketPrices] = await Promise.all([
    listDashboardProductsByMetal(ctx),
    ctx.db.query("fetchRuns").withIndex("by_timestamp").order("desc").first(),
    takeWithLimit(
      () => ctx.db.query("marketPrices").take(maxDashboardMarketPrices + 1),
      maxDashboardMarketPrices,
      "dashboard market prices",
    ),
  ]);

  return {
    goldProducts: {
      inStock: goldProducts.filter((product) => product.currentInStock).length,
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
      inStock: silverProducts.filter((product) => product.currentInStock).length,
      total: silverProducts.length,
    },
    totalProducts: goldProducts.length + silverProducts.length,
  };
};

export const getDashboardSummary = query({
  args: {},
  handler: async (ctx) => buildDashboardSummaryResponse(ctx),
});

export const getDashboardProducts = query({
  args: {},
  handler: async (ctx) => buildDashboardProductsResponse(ctx),
});

export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const [summary, products] = await Promise.all([
      buildDashboardSummaryResponse(ctx),
      buildDashboardProductsResponse(ctx),
    ]);

    return {
      ...summary,
      goldProducts: {
        ...summary.goldProducts,
        bestSpread: products.goldProducts,
      },
      silverProducts: {
        ...summary.silverProducts,
        bestSpread: products.silverProducts,
      },
    };
  },
});
