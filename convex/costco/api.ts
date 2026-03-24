import {
  extractMetalAttributes,
  type ProcessedProduct,
  type RawProduct,
} from "../lib/metalParsing";

const UNWRANGLE_API_URL = "https://data.unwrangle.com/api/getter/";

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

export const fetchCostcoSearchProducts = async (
  apiKey: string,
): Promise<{
  processedProducts: ProcessedProduct[];
  remainingCredits: number;
}> => {
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

export const fetchCostcoProductDetails = async (args: {
  apiKey: string;
  productId: string;
  productUrl: string;
}): Promise<{
  brand: null | string;
  creditsRemaining: number;
  creditsUsed: number;
  inStock: boolean;
  name: string;
  price: null | number;
  productId: string;
  success: boolean;
}> => {
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
