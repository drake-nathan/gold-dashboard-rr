import {
  extractMetalAttributes,
  type ProcessedProduct,
  type RawProduct,
} from "../lib/metalParsing";
import {
  brightDetailToProcessed,
  isInStock,
  parseCategoryProductUrls,
  parseDigitalDataProduct,
  PRECIOUS_METALS_CATEGORY,
} from "./brightParsing";

const UNWRANGLE_API_URL = "https://data.unwrangle.com/api/getter/";

const BRIGHT_API_URL = "https://api.brightdata.com/request";

export type CostcoProvider = "bright" | "unwrangle";

interface ApiResponse {
  credits_used: number;
  no_of_pages: number;
  remaining_credits: number;
  results: RawProduct[];
  success: boolean;
  total_results: number;
}

export interface ProductApiResponse {
  credits_used: number;
  detail: {
    availability?: null | string;
    brand?: string;
    description?: string;
    images?: string[];
    in_stock: boolean | null;
    listing_price?: null | number;
    model_number?: string;
    name: string;
    price: null | number;
    product_id?: string;
    returns?: null | string;
    shipping?: string;
    sku?: string;
    specifications?: { name: string; value: string }[];
    variants?: {
      in_stock: boolean;
      max_quantity?: number;
      options?: unknown[];
      part_number?: string;
      product_url?: string;
    }[];
  };
  platform: string;
  remaining_credits: number;
  result_count?: number;
  success: boolean;
}

const getRequestHeaders = () => ({
  Accept: "application/json",
  "User-Agent": "Mozilla/5.0 (compatible; Gold-Dashboard/1.0)",
});

const validateApiResponse = (data: unknown): ApiResponse => {
  if (typeof data !== "object" || data === null) {
    throw new Error("Invalid API response: not an object");
  }

  if (!("success" in data) || typeof data.success !== "boolean") {
    throw new TypeError("Invalid API response: missing success field");
  }

  if (!Array.isArray((data as ApiResponse).results)) {
    throw new TypeError("Invalid API response: results is not an array");
  }

  return data as ApiResponse;
};

export const getUnwrangleApiKey = () => {
  const apiKey = process.env.UNWRANGLE_API_KEY;
  if (!apiKey) {
    throw new Error("UNWRANGLE_API_KEY environment variable is required");
  }
  return apiKey;
};

export const getBrightDataApiKey = () => {
  const apiKey = process.env.BRIGHT_DATA_API_KEY;
  if (!apiKey) {
    throw new Error("BRIGHT_DATA_API_KEY environment variable is required");
  }
  return apiKey;
};

/** Active Costco data provider. Defaults to "unwrangle" so prod is unaffected until flipped. */
export const getCostcoProvider = (): CostcoProvider =>
  process.env.COSTCO_PROVIDER === "bright" ? "bright" : "unwrangle";

/** API key for whichever provider is active. */
export const getCostcoApiKey = (): string =>
  getCostcoProvider() === "bright" ? getBrightDataApiKey() : getUnwrangleApiKey();

interface SearchProductsResult {
  /**
   * Bright only: every Costco item number found on the category page (the catalog
   * snapshot). Used for delisting detection — a stored product whose retailerId is
   * absent here is genuinely gone, vs a detail-fetch failure which leaves it alone.
   * Undefined for Unwrangle (no separate discovery step).
   */
  discoveredItemNumbers?: string[];
  processedProducts: ProcessedProduct[];
  remainingCredits: number;
}

const fetchUnwrangleSearchProducts = async (apiKey: string): Promise<SearchProductsResult> => {
  const params = new URLSearchParams({
    api_key: apiKey,
    page: "1",
    platform: "costco_search",
    search: "precious metals",
  });

  const response = await fetch(`${UNWRANGLE_API_URL}?${params.toString()}`, {
    headers: getRequestHeaders(),
  });

  if (!response.ok) {
    throw new Error(`API responded with status: ${response.status}`);
  }

  const data = validateApiResponse(await response.json());

  if (!data.success) {
    throw new Error(`API request failed. Credits remaining: ${data.remaining_credits}`);
  }

  const preciousMetalsProducts = data.results.filter((product) =>
    product.categories.includes("https://www.costco.com/precious-metals.html"),
  );

  const processedProducts = preciousMetalsProducts
    .map(extractMetalAttributes)
    .filter((product): product is ProcessedProduct => product !== null);

  return {
    processedProducts,
    remainingCredits: data.remaining_credits,
  };
};

/**
 * Fetch a URL through Bright Data Web Unlocker. Costco intermittently returns
 * upstream 502s (empty body) — retry until a non-empty 2xx body arrives.
 * Uses `format: "json"` (not "raw") because raw returns 0 bytes on Costco.
 */
const brightFetch = async (apiKey: string, url: string, maxAttempts = 5): Promise<string> => {
  const zone = process.env.BRIGHT_DATA_ZONE ?? "gold_dashboard";
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const response = await fetch(BRIGHT_API_URL, {
      body: JSON.stringify({ country: "us", format: "json", url, zone }),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    if (response.ok) {
      const data = (await response.json()) as { body?: string; status_code?: number };
      const body = data.body ?? "";
      const upstream = data.status_code ?? 0;
      if (upstream >= 200 && upstream < 300 && body.length > 0) {
        return body;
      }
      console.info(
        `[Bright] attempt ${attempt}/${maxAttempts} for ${url}: upstream ${upstream}, len ${body.length}`,
      );
    } else {
      console.info(
        `[Bright] attempt ${attempt}/${maxAttempts} for ${url}: bright HTTP ${response.status}`,
      );
    }
  }
  throw new Error(`Bright Data failed to fetch ${url} after ${maxAttempts} attempts`);
};

/**
 * Bright path: discover SKUs from the precious-metals category page, then read
 * price + stock + name from each product detail page (Costco does not SSR prices
 * on the category page). Detail fetches run in parallel; individual failures are
 * skipped rather than failing the whole run.
 */
const fetchBrightSearchProducts = async (apiKey: string): Promise<SearchProductsResult> => {
  // If the category fetch fails, brightFetch throws and the whole run errors —
  // intentional: without a catalog snapshot we must NOT run the delisting sweep.
  const categoryHtml = await brightFetch(apiKey, PRECIOUS_METALS_CATEGORY);
  const productUrls = parseCategoryProductUrls(categoryHtml);
  const discoveredItemNumbers = productUrls.map(({ itemNumber }) => itemNumber);

  const results = await Promise.all(
    productUrls.map(async ({ url }) => {
      try {
        const html = await brightFetch(apiKey, url);
        const detail = parseDigitalDataProduct(html);
        return detail ? brightDetailToProcessed(detail, url) : null;
      } catch (error) {
        // A failed detail fetch leaves the product's last-known state untouched
        // (it stays in discoveredItemNumbers, so the sweep won't mark it OOS).
        console.error(`[Bright] detail fetch failed for ${url}:`, error);
        return null;
      }
    }),
  );

  const processedProducts = results.filter(
    (product): product is ProcessedProduct => product !== null,
  );

  // Bright bills per request; the /request response carries no credit balance.
  return { discoveredItemNumbers, processedProducts, remainingCredits: -1 };
};

export const fetchCostcoSearchProducts = (apiKey: string): Promise<SearchProductsResult> =>
  getCostcoProvider() === "bright"
    ? fetchBrightSearchProducts(apiKey)
    : fetchUnwrangleSearchProducts(apiKey);

interface ProductDetailsArgs {
  apiKey: string;
  productId: string;
  productUrl: string;
}

interface ProductDetailsResult {
  brand: null | string;
  creditsRemaining: number;
  creditsUsed: number;
  inStock: boolean;
  name: string;
  price: null | number;
  productId: string;
  success: boolean;
}

const fetchBrightProductDetails = async (
  args: ProductDetailsArgs,
): Promise<ProductDetailsResult> => {
  const html = await brightFetch(args.apiKey, args.productUrl);
  const detail = parseDigitalDataProduct(html);
  if (!detail) {
    throw new Error(`Bright Data: could not parse product detail for ${args.productUrl}`);
  }
  const price = Number.parseFloat(detail.priceMin || detail.priceMax);
  return {
    brand: null,
    creditsRemaining: -1,
    creditsUsed: 1,
    inStock: isInStock(detail.inventoryStatus),
    name: detail.name,
    price: Number.isFinite(price) ? price : null,
    productId: args.productId,
    success: true,
  };
};

const fetchUnwrangleProductDetails = async (
  args: ProductDetailsArgs,
): Promise<ProductDetailsResult> => {
  const params = new URLSearchParams({
    api_key: args.apiKey,
    platform: "costco_detail",
    url: args.productUrl,
  });

  const response = await fetch(`${UNWRANGLE_API_URL}?${params.toString()}`, {
    headers: getRequestHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Product API responded with status: ${response.status}`);
  }

  const data = (await response.json()) as ProductApiResponse;

  if (!data.success) {
    throw new Error(`Product API request failed. Credits remaining: ${data.remaining_credits}`);
  }

  const topLevelInStock = data.detail.in_stock;
  const availability = data.detail.availability;
  const isDeliveryOutOfStock = topLevelInStock === null && availability === null;
  const variantInStock = data.detail.variants?.[0]?.in_stock;
  const inStock = isDeliveryOutOfStock ? false : (topLevelInStock ?? variantInStock ?? false);

  if (isDeliveryOutOfStock) {
    console.info(
      `[Product API] Detected "Delivery Out of Stock" for ${data.detail.name}: in_stock=${topLevelInStock}, availability=${availability}`,
    );
  }

  return {
    brand: data.detail.brand ?? null,
    creditsRemaining: data.remaining_credits,
    creditsUsed: data.credits_used,
    inStock,
    name: data.detail.name,
    price: data.detail.price,
    productId: args.productId,
    success: true,
  };
};

export const fetchCostcoProductDetails = (
  args: ProductDetailsArgs,
): Promise<ProductDetailsResult> =>
  getCostcoProvider() === "bright"
    ? fetchBrightProductDetails(args)
    : fetchUnwrangleProductDetails(args);
