import { calculateProductMetrics } from "../calculator/product-calculations";
import type { CalculatorSettings } from "../calculator/types";
import type { DashboardMarketPrice, ProductCardData } from "../types";
import type { MetalFilter, SortOption } from "./filter-types";

export interface FilterOptions {
  metalFilter: MetalFilter;
  showOutOfStock: boolean;
}

interface SortContext {
  calculatorSettings: {
    costcoMembershipEnabled: CalculatorSettings["costcoMembershipEnabled"];
    creditCard: CalculatorSettings["creditCard"] | null;
    pureFeeTier: CalculatorSettings["pureFeeTier"] | null;
    quantity: CalculatorSettings["quantity"];
  };
  marketPrices: DashboardMarketPrice[];
  netProfitByProduct?: Map<ProductCardData, number>;
}

/**
 * Filters products by metal type and stock status
 */
export const filterProducts = (
  goldProducts: ProductCardData[],
  silverProducts: ProductCardData[],
  options: FilterOptions,
): ProductCardData[] => {
  // Combine products based on metal filter
  let filtered: ProductCardData[];
  if (options.metalFilter === "all") {
    filtered = [...goldProducts, ...silverProducts];
  } else if (options.metalFilter === "gold") {
    filtered = goldProducts;
  } else {
    filtered = silverProducts;
  }

  // Filter by stock status
  if (!options.showOutOfStock) {
    filtered = filtered.filter((p) => p.currentInStock);
  }

  return filtered;
};

/**
 * Sorts products by the selected sort option
 * Products without Pure bids are always placed at the bottom
 */
export const sortProducts = (
  products: ProductCardData[],
  sortOption: SortOption,
  context?: SortContext,
): ProductCardData[] => {
  // Separate products with and without Pure bids
  const withBids = products.filter((p) => p.pureBidPrice !== null);
  const withoutBids = products.filter((p) => p.pureBidPrice === null);
  const completeSortContext =
    context &&
    context.calculatorSettings.creditCard !== null &&
    context.calculatorSettings.pureFeeTier !== null
      ? {
          calculatorSettings: {
            ...context.calculatorSettings,
            creditCard: context.calculatorSettings.creditCard,
            pureFeeTier: context.calculatorSettings.pureFeeTier,
          },
          marketPrices: context.marketPrices,
        }
      : null;
  const netProfitByProduct =
    context?.netProfitByProduct && (sortOption === "profit-asc" || sortOption === "profit-desc")
      ? context.netProfitByProduct
      : completeSortContext && (sortOption === "profit-asc" || sortOption === "profit-desc")
        ? new Map(
            withBids.map((product) => [
              product,
              calculateProductMetrics(
                product,
                completeSortContext.marketPrices,
                completeSortContext.calculatorSettings,
              ).netProfit ?? -Infinity,
            ]),
          )
        : null;

  // Sort products with bids according to the selected option
  let sorted: ProductCardData[];
  switch (sortOption) {
    case "last-in-stock": {
      sorted = withBids.toSorted((a, b) => {
        // Sort by lastInStockAt descending (most recent first)
        // Products without lastInStockAt (still in stock or never OOS) go to end
        const aTime = a.lastInStockAt ?? -Infinity;
        const bTime = b.lastInStockAt ?? -Infinity;
        return bTime - aTime;
      });
      break;
    }
    case "price-asc": {
      sorted = withBids.toSorted((a, b) => a.currentPrice - b.currentPrice);
      break;
    }
    case "price-desc": {
      sorted = withBids.toSorted((a, b) => b.currentPrice - a.currentPrice);
      break;
    }
    case "profit-asc": {
      sorted = withBids.toSorted((a, b) => {
        if (netProfitByProduct) {
          const aProfit = netProfitByProduct.get(a) ?? -Infinity;
          const bProfit = netProfitByProduct.get(b) ?? -Infinity;
          return aProfit - bProfit;
        }

        const aSpread = a.pureSpreadPercentage ?? -999;
        const bSpread = b.pureSpreadPercentage ?? -999;
        return bSpread - aSpread;
      });
      break;
    }
    case "profit-desc": {
      sorted = withBids.toSorted((a, b) => {
        if (netProfitByProduct) {
          const aProfit = netProfitByProduct.get(a) ?? -Infinity;
          const bProfit = netProfitByProduct.get(b) ?? -Infinity;
          return bProfit - aProfit;
        }

        const aSpread = a.pureSpreadPercentage ?? 999;
        const bSpread = b.pureSpreadPercentage ?? 999;
        return aSpread - bSpread;
      });
      break;
    }
    default: {
      sorted = [...withBids];
      break;
    }
  }

  // Always append products without bids at the end
  return [...sorted, ...withoutBids];
};

/**
 * Checks if auto-flip to out-of-stock should be triggered
 * Returns true if there are no in-stock products
 */
export const shouldAutoFlipToOutOfStock = (goldInStock: number, silverInStock: number): boolean =>
  goldInStock === 0 && silverInStock === 0;
