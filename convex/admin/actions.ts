import { internal } from "../_generated/api";
import type { ActionCtx } from "../_generated/server";
import { fetchPureProductBySku, toPureProductInsertData } from "./pure";

export const rematchProductHelper = async (
  ctx: ActionCtx,
  args: { costcoProductId: string; force?: boolean },
): Promise<{
  candidates?: {
    details: string;
    productName: string;
    pureProductId: string;
    score: number;
  }[];
  matched: boolean;
  pureProductId?: string;
  score?: number;
  skipped?: boolean;
  status?: string;
}> => {
  await ctx.runMutation(internal.admin.checkAdminAccess, {});

  if (args.force) {
    await ctx.runMutation(internal.admin.clearManualMatch, {
      costcoProductId: args.costcoProductId,
    });
  }

  return ctx.runMutation(internal.costco.matchCostcoProductToPure, {
    costcoProductId: args.costcoProductId,
  });
};

export const fetchAndAddPureProductHelper = async (
  ctx: ActionCtx,
  args: { sku: string },
): Promise<{
  error?: string;
  product?: {
    currentBidPrice: null | number;
    manufacturer: null | string;
    metalType: "gold" | "silver";
    productName: string;
    pureProductId: string;
    sku: string;
    weight: number;
  };
  success: boolean;
}> => {
  await ctx.runMutation(internal.admin.checkAdminAccess, {});

  try {
    const result = await fetchPureProductBySku(args.sku);
    if (!result.success || !result.product) {
      return { error: result.error ?? "Product not found in Pure API", success: false };
    }

    const productData = toPureProductInsertData(result.product);

    await ctx.runMutation(internal.admin.insertPureProduct, productData);

    return {
      product: {
        currentBidPrice: productData.currentBidPrice,
        manufacturer: productData.manufacturer,
        metalType: productData.metalType,
        productName: productData.productName,
        pureProductId: productData.pureProductId,
        sku: productData.sku,
        weight: productData.weight,
      },
      success: true,
    };
  } catch (error) {
    console.error("Error fetching Pure product:", error);
    return {
      error: error instanceof Error ? error.message : "Unknown error",
      success: false,
    };
  }
};
