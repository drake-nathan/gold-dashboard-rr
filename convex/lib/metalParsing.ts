/**
 * Metal product parsing utilities
 * Pure functions extracted from costco.ts for testability
 */

// Type definitions for metal product parsing
export interface RawProduct {
  attributes: { key: string; value: string }[];
  brand?: string;
  categories: string[];
  currency?: string;
  id: string;
  in_stock: boolean;
  is_member_only?: boolean;
  is_warehouse_only?: boolean;
  marketing_features?: string[];
  max_quantity?: number;
  name: string;
  price: number;
  price_reduced?: number;
  rating?: number;
  retailer_id: string;
  short_description?: string;
  thumbnail?: string;
  total_ratings?: number;
  upc?: string;
  url: string;
}

export interface ProcessedProduct extends RawProduct {
  metalType: "gold" | "silver";
  metalWeight?: string;
  pricePerOunce?: number;
}

// Fallback Pure product IDs for standard weights (accredited items)
export const PURE_FALLBACK_IDS: Record<string, Record<string, string>> = {
  gold: {
    "1oz": "cad52d53-182a-4818-900b-832f94d01d8b",
    "5g": "0c4e939a-dd7b-4a1e-ae1e-2907ec4c40fb",
    "20g": "2a1e58e0-b739-46eb-875f-db22abde20d6",
    "100g": "92c6a07e-7708-4085-97c8-7cdc3fc85fda",
  },
  silver: {
    "10oz": "07c8e315-2932-474b-b327-627a4dc9e62c",
    "1000oz": "218972c1-da23-4a80-b394-999acb286d87",
  },
};

/**
 * Extract weight in troy ounces from a metal weight string
 *
 * Handles formats like:
 * - "1 oz", "10 oz", "100 oz"
 * - "1oz", "10oz" (no space)
 * - "1/2 oz", "1/4 oz" (fractions not currently supported by regex)
 * - "50 gram", "100 grams", "31.1g"
 * - "1 troy ounce"
 *
 * @param metalWeight - Weight string from product attributes
 * @returns Weight in troy ounces, or null if cannot parse
 */
export const extractWeightInOz = (metalWeight: null | string): null | number => {
  if (!metalWeight) return null;

  const weightMatch = /(?<weight>\d+(?:\.\d+)?)\s*(?:troy\s+)?(?<unit>gram|g|ounce|oz)/i.exec(
    metalWeight,
  );

  if (weightMatch?.groups?.weight && weightMatch.groups.unit) {
    const weight = Number.parseFloat(weightMatch.groups.weight);
    const unit = weightMatch.groups.unit.toLowerCase();

    if (unit === "gram" || unit === "g") {
      return weight / 31.1035; // Convert grams to troy ounces
    } else if (unit === "ounce" || unit === "oz") {
      return weight;
    }
  }

  return null;
};

/**
 * Get fallback Pure product ID based on weight and metal type
 *
 * Matches to standard accredited Pure products for common weights.
 * Uses tolerance thresholds to handle slight variations.
 *
 * Gold weights: 5g, 20g, 100g, 1oz
 * Silver weights: 10oz, 1000oz
 *
 * @param metalType - Metal type (gold or silver)
 * @param weightInOz - Weight in troy ounces
 * @returns Pure product ID if match found, null otherwise
 */
export const getFallbackPureId = (
  metalType: "gold" | "silver",
  weightInOz: number,
): null | string => {
  const weightInGrams = weightInOz * 31.1035;

  if (metalType === "gold") {
    // Match to closest standard gold weight
    if (Math.abs(weightInGrams - 5) < 0.5) return PURE_FALLBACK_IDS.gold["5g"];
    if (Math.abs(weightInGrams - 20) < 0.5) {
      return PURE_FALLBACK_IDS.gold["20g"];
    }
    if (Math.abs(weightInGrams - 100) < 1) {
      return PURE_FALLBACK_IDS.gold["100g"];
    }
    if (Math.abs(weightInOz - 1) < 0.05) return PURE_FALLBACK_IDS.gold["1oz"];
  } else {
    // Match to closest standard silver weight
    if (Math.abs(weightInOz - 10) < 0.5) {
      return PURE_FALLBACK_IDS.silver["10oz"];
    }
    if (Math.abs(weightInOz - 1000) < 10) {
      return PURE_FALLBACK_IDS.silver["1000oz"];
    }
  }

  return null;
};

/**
 * Extract count multiplier from product name
 *
 * Handles formats like:
 * - "20-count", "20 count"
 * - "20-pack", "20 pack"
 * - "box of 20", "set of 20"
 *
 * @param name - Product name
 * @returns Count multiplier (defaults to 1 if not found)
 */
export const extractCountMultiplier = (name: string): number => {
  const lowerName = name.toLowerCase();

  // Match patterns like "20-count", "20 count", "20-pack", "20 pack"
  const countMatch = /(?<count>\d+)[\s-]*(?<unit>count|pack|piece|pc)/i.exec(lowerName);
  if (countMatch?.groups?.count) {
    return Number.parseInt(countMatch.groups.count, 10);
  }

  // Match patterns like "box of 20", "set of 20"
  const ofMatch = /(?<container>box|set|pack)\s+of\s+(?<count>\d+)/i.exec(lowerName);
  if (ofMatch?.groups?.count) {
    return Number.parseInt(ofMatch.groups.count, 10);
  }

  return 1;
};

/**
 * Extract metal attributes from a raw product
 *
 * Filters and enriches product data to include:
 * - Metal type (gold or silver)
 * - Metal weight string (adjusted for count multipliers)
 * - Calculated price per ounce
 *
 * Returns null if product is not a valid metal product
 *
 * @param product - Raw product data from API
 * @returns Processed product with metal attributes, or null if not a metal product
 */
export const extractMetalAttributes = (product: RawProduct): null | ProcessedProduct => {
  const name = product.name.toLowerCase();

  // Determine metal type
  let metalType: "gold" | "silver" | null = null;
  if (name.includes("gold")) {
    metalType = "gold";
  } else if (name.includes("silver")) {
    metalType = "silver";
  }

  // Skip if not a precious metal bar/coin
  if (!metalType) return null;

  // Must be a bar, coin, or specified weight product
  const isMetalProduct =
    name.includes("bar") ||
    name.includes("coin") ||
    name.includes("gram") ||
    name.includes("ounce") ||
    name.includes("oz");

  if (!isMetalProduct) return null;

  // Extract weight string from attributes
  const rawMetalWeight = product.attributes.find(
    (attr) => attr.key === "Metal Weight" || attr.key.toLowerCase().includes("weight"),
  )?.value;

  // Extract count multiplier from product name (e.g., "20-count" -> 20)
  const countMultiplier = extractCountMultiplier(product.name);

  // Adjust metal weight string if there's a count multiplier
  let metalWeight = rawMetalWeight;
  if (rawMetalWeight && countMultiplier > 1) {
    const weightInOz = extractWeightInOz(rawMetalWeight);
    if (weightInOz) {
      const totalOz = weightInOz * countMultiplier;
      metalWeight = `${totalOz} Troy Ounce`;
    }
  }

  // Calculate price per ounce using helper function
  let pricePerOunce: number | undefined;
  if (metalWeight && product.price) {
    const weightInOz = extractWeightInOz(metalWeight);
    if (weightInOz) {
      pricePerOunce = product.price / weightInOz;
    }
  }

  return {
    ...product,
    metalType,
    metalWeight,
    pricePerOunce,
  };
};
