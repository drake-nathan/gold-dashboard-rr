import {
  extractProductType,
  getHighestOfferPrice,
  hasMorePages,
  parseWeightToOz,
} from "../lib/pureApiParsing";

export const PURE_API_BASE_URL = "https://api.collectpure.com";

export interface PureApiProduct {
  attributes: string[];
  id: string;
  manufacturer?: {
    title: string;
  };
  material: string;
  sku: string;
  subCategory?: {
    title: string;
  };
  title: string;
  variants: {
    highestOffer?: null | {
      price: number;
    };
  }[];
  weight: string;
  weightGrams: number;
}

export const fetchPureProductBySku = async (
  sku: string,
): Promise<{ error?: string; product?: PureApiProduct; success: boolean }> => {
  const apiKey = process.env.PURE_API_KEY;
  if (!apiKey) {
    return { error: "PURE_API_KEY not configured", success: false };
  }

  const searchParams = new URLSearchParams({
    limit: "100",
    offset: "0",
  });

  const metals = ["Gold", "Silver"];
  let foundProduct: null | PureApiProduct = null;

  for (const material of metals) {
    if (foundProduct) break;

    let offset = 0;
    let hasMore = true;

    while (hasMore && !foundProduct) {
      searchParams.set("material", material);
      searchParams.set("offset", offset.toString());

      const response = await fetch(
        `${PURE_API_BASE_URL}/products/get-products/v2?${searchParams.toString()}`,
        {
          headers: {
            Accept: "application/json",
            "x-api-key": apiKey,
          },
        },
      );

      if (!response.ok) {
        console.warn(`Failed to fetch ${material} products: ${response.status}`);
        break;
      }

      const responseBody = (await response.json()) as {
        data: PureApiProduct[];
        total: number;
      };
      const products = responseBody.data;
      foundProduct = products.find((product) => product.sku === sku) ?? null;

      const pageSize = products.length;
      if (pageSize > 0 && hasMorePages(offset, pageSize, responseBody.total)) {
        offset += pageSize;
      } else {
        hasMore = false;
      }
    }
  }

  if (!foundProduct) {
    return { error: "Product not found in Pure API", success: false };
  }

  return { product: foundProduct, success: true };
};

export const toPureProductInsertData = (product: PureApiProduct) => {
  const metalType = product.material.toLowerCase() as "gold" | "silver";
  const weightOz = parseWeightToOz(product.weight, product.weightGrams);
  const productType = extractProductType(product);
  const bidPrice = getHighestOfferPrice(product.variants);
  const bidPricePerOz = bidPrice ? bidPrice / weightOz : null;

  return {
    currentBidPrice: bidPrice,
    currentBidPricePerOz: bidPricePerOz,
    isGenericFallback: false,
    lastUpdated: Date.now(),
    manufacturer: product.manufacturer?.title ?? null,
    metalType,
    productName: product.title,
    productType,
    pureProductId: product.id,
    sku: product.sku,
    weight: weightOz,
    weightGrams: product.weightGrams || null,
  };
};
