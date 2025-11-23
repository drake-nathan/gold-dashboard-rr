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
export const parseWeightToOz = (
  weight: string,
  weightGrams?: number,
): number => {
  if (weightGrams) {
    // Convert grams to troy ounces (1 troy oz = 31.1035 g)
    return weightGrams / 31.1035;
  }

  // Parse weight string
  const weightMatch =
    /(?<value>\d+(?:\.\d+)?)\s*(?<unit>troy ounce|ounce|oz|gram|g)/i.exec(
      weight,
    );

  if (weightMatch?.groups?.value && weightMatch.groups.unit) {
    const value = parseFloat(weightMatch.groups.value);
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
