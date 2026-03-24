import type { MutationCtx } from "../_generated/server";
import { extractWeightInOz, getFallbackPureId } from "../lib/metalParsing";

const getCostcoProduct = async (ctx: MutationCtx, costcoProductId: string) => {
  const costcoProduct = await ctx.db
    .query("costcoProducts")
    .withIndex("by_product_id", (q) => q.eq("productId", costcoProductId))
    .first();

  if (!costcoProduct) {
    throw new Error(`Costco product ${costcoProductId} not found`);
  }

  return costcoProduct;
};

const getPureProduct = async (ctx: MutationCtx, pureProductId: string) => {
  const pureProduct = await ctx.db
    .query("pureProducts")
    .withIndex("by_pure_id", (q) => q.eq("pureProductId", pureProductId))
    .first();

  if (!pureProduct) {
    throw new Error(`Pure product ${pureProductId} not found`);
  }

  return pureProduct;
};

export const selectMatchHelper = async (
  ctx: MutationCtx,
  args: {
    costcoProductId: string;
    pureProductId: string;
  },
) => {
  const costcoProduct = await getCostcoProduct(ctx, args.costcoProductId);
  const pureProduct = await getPureProduct(ctx, args.pureProductId);

  await ctx.db.patch(costcoProduct._id, {
    matchStatus: "pending_approval",
    pureProductId: args.pureProductId,
  });

  return {
    costcoProduct: costcoProduct.name,
    pureProduct: pureProduct.productName,
    success: true,
  };
};

export const confirmMatchHelper = async (
  ctx: MutationCtx,
  args: {
    costcoProductId: string;
    userId: string;
  },
) => {
  const costcoProduct = await getCostcoProduct(ctx, args.costcoProductId);

  if (!costcoProduct.pureProductId) {
    throw new Error("No match selected to confirm");
  }

  await ctx.db.patch(costcoProduct._id, {
    matchApprovedAt: Date.now(),
    matchApprovedBy: args.userId,
    matchStatus: "manual_matched",
  });

  return {
    costcoProduct: costcoProduct.name,
    success: true,
  };
};

export const approveMatchHelper = async (
  ctx: MutationCtx,
  args: {
    costcoProductId: string;
    pureProductId: string;
    userId: string;
  },
) => {
  const costcoProduct = await getCostcoProduct(ctx, args.costcoProductId);
  const pureProduct = await getPureProduct(ctx, args.pureProductId);

  await ctx.db.patch(costcoProduct._id, {
    matchApprovedAt: Date.now(),
    matchApprovedBy: args.userId,
    matchStatus: "manual_matched",
    pureProductId: args.pureProductId,
  });

  return {
    costcoProduct: costcoProduct.name,
    pureProduct: pureProduct.productName,
    success: true,
  };
};

export const applyFallbackHelper = async (
  ctx: MutationCtx,
  args: {
    costcoProductId: string;
    userId: string;
  },
) => {
  const costcoProduct = await getCostcoProduct(ctx, args.costcoProductId);
  const weightInOz = extractWeightInOz(costcoProduct.metalWeight);
  const fallbackPureId = weightInOz
    ? getFallbackPureId(costcoProduct.metalType, weightInOz)
    : null;

  await ctx.db.patch(costcoProduct._id, {
    matchApprovedAt: Date.now(),
    matchApprovedBy: args.userId,
    matchStatus: "manual_matched",
    pureProductId: fallbackPureId,
  });

  return {
    costcoProduct: costcoProduct.name,
    fallbackPureId,
    success: true,
  };
};

export const clearManualMatchHelper = async (
  ctx: MutationCtx,
  args: {
    costcoProductId: string;
  },
) => {
  const costcoProduct = await getCostcoProduct(ctx, args.costcoProductId);

  await ctx.db.patch(costcoProduct._id, {
    matchApprovedAt: null,
    matchApprovedBy: null,
    matchStatus: null,
    pureProductId: null,
  });

  return { success: true };
};
