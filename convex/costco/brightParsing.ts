/**
 * Bright Data (Costco) parsing utilities — pure functions, testable.
 *
 * Costco's category page does NOT server-render prices; product detail pages do,
 * inside the Adobe `window.digitalData.product` analytics block. So the Bright
 * provider discovers SKUs from the category page, then reads price + stock + name
 * from each detail page. See `.tasks/replace-unwrangle.md` for the validation.
 */

import {
  extractMetalAttributes,
  type ProcessedProduct,
  type RawProduct,
} from "../lib/metalParsing";

export const PRECIOUS_METALS_CATEGORY = "https://www.costco.com/precious-metals.html";

export interface BrightDetail {
  inventoryStatus: string;
  name: string;
  pid: string;
  priceMax: string;
  priceMin: string;
  sku?: string;
}

/**
 * Extract product detail URLs (and Costco item numbers) from a category page.
 * Dedupes by item number (the same product link appears multiple times per tile).
 */
export const parseCategoryProductUrls = (html: string): { itemNumber: string; url: string }[] => {
  const re = /href="(?<url>https:\/\/www\.costco\.com\/[^"]*\.product\.(?<item>\d+)\.html)"/gu;
  const byItem = new Map<string, string>();
  let m: null | RegExpExecArray;
  while ((m = re.exec(html)) !== null) {
    const { item, url } = m.groups as { item: string; url: string };
    if (!byItem.has(item)) byItem.set(item, url);
  }
  return [...byItem].map(([itemNumber, url]) => ({ itemNumber, url }));
};

/**
 * Parse the `window.digitalData.product` block from a detail page. Returns null
 * if the block (or its required fields) are absent — caller should treat the
 * fetch as failed and retry.
 */
export const parseDigitalDataProduct = (html: string): BrightDetail | null => {
  const ddIdx = html.indexOf("window.digitalData");
  if (ddIdx === -1) return null;
  // Scope to the digitalData object so generic keys can't collide elsewhere.
  const scope = html.slice(ddIdx, ddIdx + 4000);
  const field = (key: string): string | undefined => {
    const r = new RegExp(`\\b${key}\\s*:\\s*'(?<v>(?:[^'\\\\]|\\\\.)*)'`, "u");
    return r.exec(scope)?.groups?.v;
  };
  const pid = field("pid");
  const name = field("name");
  if (!pid || !name) return null;
  return {
    inventoryStatus: field("inventoryStatus") ?? "",
    name,
    pid,
    priceMax: field("priceMax") ?? "",
    priceMin: field("priceMin") ?? "",
    sku: field("sku"),
  };
};

/** Derive a weight token ("10 oz", "1 oz") from a product name for pricePerOunce. */
export const deriveMetalWeight = (name: string): string | undefined => {
  const m = /(?<n>\d+(?:\.\d+)?)\s*(?:troy\s+)?(?<u>gram|g|ounce|oz)\b/iu.exec(name);
  return m?.groups ? `${m.groups.n} ${m.groups.u}` : undefined;
};

/** True if the inventory status string indicates the item is purchasable. */
export const isInStock = (inventoryStatus: string): boolean =>
  /in stock/iu.test(inventoryStatus) && !/out of stock/iu.test(inventoryStatus);

/**
 * Convert a parsed Bright detail + its URL into the shared ProcessedProduct
 * shape (via extractMetalAttributes). Returns null for non-metal products or
 * unparseable prices.
 */
export const brightDetailToProcessed = (
  detail: BrightDetail,
  url: string,
): null | ProcessedProduct => {
  const price = Number.parseFloat(detail.priceMin || detail.priceMax);
  if (!Number.isFinite(price)) return null;
  const weight = deriveMetalWeight(detail.name);
  const raw: RawProduct = {
    attributes: weight ? [{ key: "Metal Weight", value: weight }] : [],
    categories: [PRECIOUS_METALS_CATEGORY],
    // Match Unwrangle's keying: productId = Costco SKU, retailerId = Costco item number (pid).
    // `digitalData` exposes both; keeping them aligned prevents duplicate records and
    // preserves existing pureProductId matches when switching providers.
    id: detail.sku ?? detail.pid,
    in_stock: isInStock(detail.inventoryStatus),
    name: detail.name,
    price,
    retailer_id: detail.pid,
    url,
  };
  return extractMetalAttributes(raw);
};
