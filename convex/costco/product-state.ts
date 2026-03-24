import type { MutationCtx } from "../_generated/server";
import { extractWeightInOz, type ProcessedProduct } from "../lib/metalParsing";

const VERIFICATION_WINDOW_MS = 90 * 60 * 1000;

const upsertAlertProductOption = async (
  ctx: MutationCtx,
  product: {
    metalType: "gold" | "silver";
    name: string;
    productId: string;
  },
): Promise<void> => {
  const existing = await ctx.db
    .query("alertProductOptions")
    .withIndex("by_product_id", (q) => q.eq("productId", product.productId))
    .unique();

  if (!existing) {
    await ctx.db.insert("alertProductOptions", product);
    return;
  }

  if (existing.metalType === product.metalType && existing.name === product.name) {
    return;
  }

  await ctx.db.patch(existing._id, product);
};

export const upsertProcessedProduct = async (
  ctx: MutationCtx,
  args: {
    product: ProcessedProduct;
    timestamp: number;
  },
) => {
  const product = args.product;
  const existing = await ctx.db
    .query("costcoProducts")
    .withIndex("by_product_id", (q) => q.eq("productId", product.id))
    .first();

  let priceChanged = false;
  let stockChanged = false;
  let updated = false;

  if (existing) {
    if (existing.currentPrice !== product.price) {
      priceChanged = true;

      await ctx.db.insert("priceHistory", {
        price: product.price,
        pricePerOunce: product.pricePerOunce ?? null,
        priceReduced: product.price_reduced ?? null,
        productId: product.id,
        timestamp: args.timestamp,
      });
    }

    const verificationAge = existing.lastVerifiedAt
      ? args.timestamp - existing.lastVerifiedAt
      : Infinity;
    const shouldTrustProductApi =
      verificationAge < VERIFICATION_WINDOW_MS &&
      existing.verifiedInStock === false &&
      product.in_stock;

    const effectiveInStock = shouldTrustProductApi ? false : product.in_stock;

    if (shouldTrustProductApi) {
      console.info(
        `[Search API] Ignoring in_stock=true for ${product.name} - Product API verified as OOS ${Math.round(verificationAge / 60_000)} min ago`,
      );
    }

    if (existing.currentInStock !== effectiveInStock) {
      stockChanged = true;

      await ctx.db.insert("stockHistory", {
        inStock: effectiveInStock,
        productId: product.id,
        timestamp: args.timestamp,
      });
    }

    const weightChanged = existing.metalWeight !== (product.metalWeight ?? null);
    const nameChanged = existing.name !== product.name;

    if (priceChanged || stockChanged || weightChanged || nameChanged) {
      await ctx.db.patch(existing._id, {
        currentInStock: effectiveInStock,
        currentPrice: product.price,
        currentPricePerOunce: product.pricePerOunce ?? null,
        lastUpdated: args.timestamp,
        ...(nameChanged && { name: product.name }),
        ...(weightChanged && { metalWeight: product.metalWeight ?? null }),
        ...(priceChanged && { lastPriceChange: args.timestamp }),
        ...(stockChanged && { lastStockChange: args.timestamp }),
        ...(stockChanged && !effectiveInStock && { lastInStockAt: args.timestamp }),
      });
      updated = true;
    }

    await upsertAlertProductOption(ctx, {
      metalType: product.metalType,
      name: product.name,
      productId: product.id,
    });
  } else {
    await ctx.db.insert("costcoProducts", {
      brand: product.brand ?? null,
      categories: product.categories,
      currentInStock: product.in_stock,
      currentPrice: product.price,
      currentPricePerOunce: product.pricePerOunce ?? null,
      firstSeen: args.timestamp,
      isMemberOnly: product.is_member_only ?? null,
      isOnlineOnly: product.is_warehouse_only === false ? true : null,
      lastInStockAt: product.in_stock ? null : args.timestamp,
      lastPriceChange: null,
      lastStockChange: null,
      lastUpdated: args.timestamp,
      marketingFeatures: product.marketing_features ?? null,
      matchStatus: null,
      maxQuantity: product.max_quantity ?? null,
      metalType: product.metalType,
      metalWeight: product.metalWeight ?? null,
      name: product.name,
      productId: product.id,
      pureProductId: null,
      retailerId: product.retailer_id,
      shortDescription: product.short_description ?? null,
      thumbnail: product.thumbnail ?? null,
      upc: product.upc ?? null,
      url: product.url,
    });

    await upsertAlertProductOption(ctx, {
      metalType: product.metalType,
      name: product.name,
      productId: product.id,
    });

    await ctx.db.insert("priceHistory", {
      price: product.price,
      pricePerOunce: product.pricePerOunce ?? null,
      priceReduced: product.price_reduced ?? null,
      productId: product.id,
      timestamp: args.timestamp,
    });

    await ctx.db.insert("stockHistory", {
      inStock: product.in_stock,
      productId: product.id,
      timestamp: args.timestamp,
    });

    updated = true;
    priceChanged = true;
    stockChanged = true;
  }

  return { priceChanged, stockChanged, updated };
};

const getAllInStockProducts = async (ctx: MutationCtx) => {
  const goldInStock = await ctx.db
    .query("costcoProducts")
    .withIndex("by_metal_and_stock", (q) => q.eq("metalType", "gold").eq("currentInStock", true))
    .collect();

  const silverInStock = await ctx.db
    .query("costcoProducts")
    .withIndex("by_metal_and_stock", (q) => q.eq("metalType", "silver").eq("currentInStock", true))
    .collect();

  return [...goldInStock, ...silverInStock];
};

export const markUnseenProductsOutOfStockHelper = async (
  ctx: MutationCtx,
  args: {
    seenProductIds: string[];
    timestamp: number;
  },
) => {
  let stockChanges = 0;
  let productsUpdated = 0;
  const updatedProductIds: string[] = [];
  const seenIds = new Set(args.seenProductIds);

  for (const product of await getAllInStockProducts(ctx)) {
    if (seenIds.has(product.productId)) {
      continue;
    }

    await ctx.db.patch(product._id, {
      currentInStock: false,
      lastInStockAt: args.timestamp,
      lastStockChange: args.timestamp,
      lastUpdated: args.timestamp,
    });

    await ctx.db.insert("stockHistory", {
      inStock: false,
      productId: product.productId,
      timestamp: args.timestamp,
    });

    stockChanges++;
    productsUpdated++;
    updatedProductIds.push(product.productId);

    console.info(`Marked product ${product.name} (${product.productId}) as out of stock`);
  }

  return { productsUpdated, stockChanges, updatedProductIds };
};

export const getInStockProductsForVerificationHelper = async (ctx: MutationCtx) => {
  return (await getAllInStockProducts(ctx)).map((product) => ({
    _id: product._id,
    currentPrice: product.currentPrice,
    name: product.name,
    productId: product.productId,
    url: product.url,
  }));
};

export const updateProductFromVerificationHelper = async (
  ctx: MutationCtx,
  args: {
    inStock: boolean;
    price: null | number;
    productId: string;
    timestamp: number;
  },
) => {
  const product = await ctx.db
    .query("costcoProducts")
    .withIndex("by_product_id", (q) => q.eq("productId", args.productId))
    .first();

  if (!product) {
    console.warn(`Product ${args.productId} not found for verification`);
    return { priceChanged: false, stockChanged: false, updated: false };
  }

  let priceChanged = false;
  let stockChanged = false;

  if (args.price !== null && product.currentPrice !== args.price) {
    priceChanged = true;

    const weightInOz = extractWeightInOz(product.metalWeight);
    const newPricePerOunce = weightInOz ? args.price / weightInOz : null;

    await ctx.db.insert("priceHistory", {
      price: args.price,
      pricePerOunce: newPricePerOunce,
      priceReduced: null,
      productId: args.productId,
      timestamp: args.timestamp,
    });

    console.info(
      `[Product API] Price changed for ${product.name}: $${product.currentPrice} -> $${args.price}`,
    );
  }

  if (product.currentInStock !== args.inStock) {
    stockChanged = true;

    await ctx.db.insert("stockHistory", {
      inStock: args.inStock,
      productId: args.productId,
      timestamp: args.timestamp,
    });

    console.info(
      `[Product API] Stock changed for ${product.name}: ${product.currentInStock} -> ${args.inStock}`,
    );
  }

  const weightInOz = extractWeightInOz(product.metalWeight);
  const newPricePerOunce = args.price !== null && weightInOz ? args.price / weightInOz : null;

  await ctx.db.patch(product._id, {
    currentInStock: args.inStock,
    ...(args.price !== null && { currentPrice: args.price }),
    ...(newPricePerOunce !== null && { currentPricePerOunce: newPricePerOunce }),
    lastUpdated: args.timestamp,
    lastVerifiedAt: args.timestamp,
    verifiedInStock: args.inStock,
    ...(priceChanged && { lastPriceChange: args.timestamp }),
    ...(stockChanged && { lastStockChange: args.timestamp }),
    ...(stockChanged && !args.inStock && { lastInStockAt: args.timestamp }),
  });

  return { priceChanged, stockChanged, updated: priceChanged || stockChanged };
};
