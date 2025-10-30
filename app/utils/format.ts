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
