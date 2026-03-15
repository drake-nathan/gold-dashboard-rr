/**
 * Pure API parsing utilities
 * Pure functions extracted from pure.ts for testability
 */

// Minimal type for product type extraction
export interface PureProduct {
  subCategory?: {
    title: string;
  };
  title: string;
}

// v2 API spot price item shape
export interface PureSpotPriceV2 {
  ask: number;
  bid: number;
  changePositive: boolean;
  changePrice: number;
  material: string;
}

// Transformed spot price for our mutations
export interface SpotPriceEntry {
  askPrice: number;
  bidPrice: number;
  metalType: "gold" | "palladium" | "platinum" | "silver";
  spotPrice: number;
}

export interface PureProductVariantWithOffer {
  highestOffer?: null | {
    price: number;
  };
}

type PreciousMetal = "gold" | "palladium" | "platinum" | "silver";

const METAL_MAP: Partial<Record<string, PreciousMetal>> = {
  gold: "gold",
  palladium: "palladium",
  platinum: "platinum",
  silver: "silver",
};

/**
 * Transform v2 spot prices array into entries ready for upsertSpotPrice.
 * Filters out Bitcoin and unknown materials.
 */
export const transformSpotPricesV2 = (data: PureSpotPriceV2[]): SpotPriceEntry[] => {
  const entries: SpotPriceEntry[] = [];
  for (const item of data) {
    const metalType = METAL_MAP[item.material.toLowerCase()];
    if (metalType) {
      entries.push({
        askPrice: item.ask,
        bidPrice: item.bid,
        metalType,
        spotPrice: item.bid,
      });
    }
  }
  return entries;
};

/**
 * Check if there are more pages to fetch based on offset and total count.
 */
export const hasMorePages = (offset: number, batchSize: number, total: number): boolean => {
  return offset + batchSize < total;
};

/**
 * Get the highest available offer price across all product variants.
 */
export const getHighestOfferPrice = (variants: PureProductVariantWithOffer[]): null | number => {
  let highest: null | number = null;

  for (const variant of variants) {
    const price = variant.highestOffer?.price;
    if (typeof price !== "number") continue;

    if (highest === null || price > highest) {
      highest = price;
    }
  }

  return highest;
};

/**
 * Parse weight string or grams to troy ounces
 *
 * Handles Pure API weight formats:
 * - weightGrams parameter (preferred if provided)
 * - Weight strings: "1 oz", "10 troy ounce", "31.1 gram"
 * - Defaults to 1 oz if unable to parse
 *
 * @param weight - Weight string from Pure API
 * @param weightGrams - Optional weight in grams (takes precedence)
 * @returns Weight in troy ounces
 */
export const parseWeightToOz = (weight: string, weightGrams?: number): number => {
  if (weightGrams) {
    // Convert grams to troy ounces (1 troy oz = 31.1035 g)
    return weightGrams / 31.1035;
  }

  // Parse weight string
  const weightMatch = /(?<value>\d+(?:\.\d+)?)\s*(?<unit>troy ounce|ounce|oz|gram|g)/i.exec(weight);

  if (weightMatch?.groups?.value && weightMatch.groups.unit) {
    const value = Number.parseFloat(weightMatch.groups.value);
    const unit = weightMatch.groups.unit.toLowerCase();

    if (unit.includes("oz") || unit.includes("ounce")) {
      return value;
    } else if (unit === "gram" || unit === "g") {
      return value / 31.1035;
    }
  }

  // Default to 1 oz if unable to parse
  return 1;
};

/**
 * Extract product type from Pure product data
 *
 * Checks title for "bar" or "coin" keywords,
 * falls back to subcategory title if available.
 *
 * @param product - Pure product data
 * @returns Product type string (e.g., "bar", "coin") or null
 */
export const extractProductType = (product: PureProduct): null | string => {
  const title = product.title.toLowerCase();
  if (title.includes("bar")) return "bar";
  if (title.includes("coin")) return "coin";
  if (product.subCategory?.title) {
    return product.subCategory.title.toLowerCase();
  }
  return null;
};
