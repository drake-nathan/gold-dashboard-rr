/**
 * Generate a Collect Pure product URL from the SKU
 *
 * The Pure API provides SKUs in the format: "slug" + "id"
 * For example: "1-oz-pamp-fortuna-gold-bar-9999-fine-in-assay000023"
 *
 * Example:
 * Input: "1-oz-pamp-fortuna-gold-bar-9999-fine-in-assay000023"
 * Output: "https://www.collectpure.com/marketplace/product/1-oz-pamp-fortuna-gold-bar-9999-fine-in-assay000023"
 */
export const generatePureProductUrl = (sku: string): string =>
  `https://www.collectpure.com/marketplace/product/${sku}`;
