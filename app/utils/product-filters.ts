import type { api } from "convex/_generated/api";
import type { FunctionReturnType } from "convex/server";

import type {
  MetalFilter,
  SortOption,
} from "@/components/dashboard/filter-types";

type GetStats = FunctionReturnType<typeof api.dashboard.getStats>;
export type ProductCardData = GetStats["goldProducts"]["bestSpread"][number];

export interface FilterOptions {
  metalFilter: MetalFilter;
  showOutOfStock: boolean;
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
  let filtered: ProductCardData[] = [];

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
): ProductCardData[] => {
  // Separate products with and without Pure bids
  const withBids = products.filter((p) => p.pureBidPrice !== null);
  const withoutBids = products.filter((p) => p.pureBidPrice === null);

  // Sort products with bids according to the selected option
  let sorted: ProductCardData[] = [];

  switch (sortOption) {
    case "last-in-stock": {
      sorted = withBids.sort((a, b) => {
        // Sort by lastInStockAt descending (most recent first)
        // Products without lastInStockAt (still in stock or never OOS) go to end
        const aTime = a.lastInStockAt ?? -Infinity;
        const bTime = b.lastInStockAt ?? -Infinity;
        return bTime - aTime;
      });
      break;
    }
    case "price-asc": {
      sorted = withBids.sort((a, b) => a.currentPrice - b.currentPrice);
      break;
    }
    case "price-desc": {
      sorted = withBids.sort((a, b) => b.currentPrice - a.currentPrice);
      break;
    }
    case "profit-asc": {
      sorted = withBids.sort((a, b) => {
        const aSpread = a.spreadPercentage ?? -999;
        const bSpread = b.spreadPercentage ?? -999;
        return bSpread - aSpread;
      });
      break;
    }
    case "profit-desc": {
      sorted = withBids.sort((a, b) => {
        const aSpread = a.spreadPercentage ?? 999;
        const bSpread = b.spreadPercentage ?? 999;
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
export const shouldAutoFlipToOutOfStock = (
  goldInStock: number,
  silverInStock: number,
): boolean => goldInStock === 0 && silverInStock === 0;
