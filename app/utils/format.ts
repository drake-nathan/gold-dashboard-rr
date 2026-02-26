/**
 * Format a number as USD currency with 2 decimal places
 */
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: "currency",
  }).format(value);
};

/**
 * Format a number as a percentage with specified decimal places
 */
export const formatPercentage = (value: number, decimals = 2): string => {
  return `${value.toFixed(decimals)}%`;
};

/**
 * Format metal weight strings to shorter display format
 * Examples:
 * - "1 Troy Ounce" -> "1oz"
 * - "10 Troy Ounce" -> "10oz"
 * - "100 Gram Weight" -> "100g"
 */
export const formatWeight = (weight: string): string => {
  // Handle Troy Ounce variations
  const troyOunceMatch = /^(?<weight>\d+(?:\.\d+)?)\s*troy\s*ounces?$/i.exec(weight);
  if (troyOunceMatch?.groups) {
    return `${troyOunceMatch.groups.weight}oz`;
  }

  // Handle Gram variations
  const gramMatch = /^(?<weight>\d+(?:\.\d+)?)\s*grams?\s*(?:weight)?$/i.exec(weight);
  if (gramMatch?.groups) {
    return `${gramMatch.groups.weight}g`;
  }

  // Handle generic ounce (oz) variations
  const ounceMatch = /^(?<weight>\d+(?:\.\d+)?)\s*oz$/i.exec(weight);
  if (ounceMatch?.groups) {
    return `${ounceMatch.groups.weight}oz`;
  }

  // If no pattern matches, return original
  return weight;
};
