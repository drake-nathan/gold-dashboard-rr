import type { Doc } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { isAdmin } from "./access";

const toPureProductSummary = (product: Doc<"pureProducts">) => ({
  currentBidPrice: product.currentBidPrice,
  isGenericFallback: product.isGenericFallback ?? false,
  manufacturer: product.manufacturer,
  metalType: product.metalType,
  productName: product.productName,
  pureProductId: product.pureProductId,
  sku: product.sku,
  weight: product.weight,
});

export const getPureProductBySkuHelper = async (ctx: QueryCtx, sku: string) => {
  const pureProduct = await ctx.db
    .query("pureProducts")
    .withIndex("by_sku", (q) => q.eq("sku", sku))
    .first();

  if (!pureProduct) {
    return null;
  }

  return {
    currentBidPrice: pureProduct.currentBidPrice,
    currentBidPricePerOz: pureProduct.currentBidPricePerOz,
    isGenericFallback: pureProduct.isGenericFallback,
    manufacturer: pureProduct.manufacturer,
    metalType: pureProduct.metalType,
    productName: pureProduct.productName,
    productType: pureProduct.productType,
    pureProductId: pureProduct.pureProductId,
    sku: pureProduct.sku,
    weight: pureProduct.weight,
  };
};

export const searchPureProductsHelper = async (
  ctx: QueryCtx,
  args: {
    limit?: number;
    metalType?: "gold" | "silver";
    query: string;
  },
) => {
  const limit = args.limit ?? 10;
  const searchQuery = args.query.toLowerCase();

  const pureProducts = args.metalType
    ? await ctx.db
        .query("pureProducts")
        .withIndex("by_metal_type", (q) => q.eq("metalType", args.metalType ?? "gold"))
        .collect()
    : await ctx.db.query("pureProducts").collect();

  return pureProducts
    .filter((product) => {
      const name = product.productName.toLowerCase();
      const sku = product.sku?.toLowerCase() ?? "";
      const manufacturer = product.manufacturer?.toLowerCase() ?? "";

      return (
        name.includes(searchQuery) ||
        sku.includes(searchQuery) ||
        manufacturer.includes(searchQuery)
      );
    })
    .slice(0, limit)
    .map(toPureProductSummary);
};

export const getAllPureProductsHelper = async (
  ctx: QueryCtx,
  args: {
    metalType?: "gold" | "silver";
  },
) => {
  const pureProducts = args.metalType
    ? await ctx.db
        .query("pureProducts")
        .withIndex("by_metal_type", (q) => q.eq("metalType", args.metalType ?? "gold"))
        .collect()
    : await ctx.db.query("pureProducts").collect();

  return pureProducts.map(toPureProductSummary);
};

export const getAdminStatusHelper = async (ctx: QueryCtx) => {
  const tokenIdentifier = (await ctx.auth.getUserIdentity())?.tokenIdentifier ?? null;

  return {
    isAdmin: isAdmin(tokenIdentifier),
    userTokenIdentifier: tokenIdentifier,
  };
};
