import type { Doc } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { normalizeProductName, scorePureProductCandidate } from "../lib/productMatching";
import { extractWeightInOz, getFallbackPureId } from "../lib/metalParsing";
import { takeWithLimit } from "../lib/queries";
import type { ReviewStatus } from "./access";

const maxAdminReviewProducts = 2000;

const assertAdminReviewLimit = <T>(products: T[], label: string): T[] => {
  if (products.length > maxAdminReviewProducts) {
    throw new Error(`${label} exceeded safe query limit of ${maxAdminReviewProducts}`);
  }
  return products;
};

const listLegacyUndefinedMatchStatusProducts = async (
  ctx: QueryCtx,
): Promise<Doc<"costcoProducts">[]> => {
  const legacyProducts: Doc<"costcoProducts">[] = [];

  for await (const product of ctx.db.query("costcoProducts")) {
    if (product.matchStatus !== undefined) {
      continue;
    }

    legacyProducts.push(product);
    if (legacyProducts.length > maxAdminReviewProducts) {
      throw new Error(
        `admin legacy unmatched products exceeded safe query limit of ${maxAdminReviewProducts}`,
      );
    }
  }

  return legacyProducts;
};

const getPureProductsMap = async (
  ctx: QueryCtx,
  products: Doc<"costcoProducts">[],
): Promise<Map<string, Doc<"pureProducts">>> => {
  const pureProductIds = [...new Set(products.flatMap((product) => product.pureProductId ?? []))];
  const pureProducts = (
    await Promise.all(
      pureProductIds.map((pureProductId) =>
        ctx.db
          .query("pureProducts")
          .withIndex("by_pure_id", (q) => q.eq("pureProductId", pureProductId))
          .unique(),
      ),
    )
  ).filter((product) => product !== null);

  return new Map(pureProducts.map((product) => [product.pureProductId, product]));
};

export const enrichReviewProducts = async (ctx: QueryCtx, products: Doc<"costcoProducts">[]) => {
  const pureProductsMap = await getPureProductsMap(ctx, products);

  return products.map((product) => {
    const pureProduct = product.pureProductId ? pureProductsMap.get(product.pureProductId) : null;

    return {
      _id: product._id,
      currentInStock: product.currentInStock,
      currentPrice: product.currentPrice,
      firstSeen: product.firstSeen,
      matchApprovedAt: product.matchApprovedAt,
      matchApprovedBy: product.matchApprovedBy,
      matchStatus: product.matchStatus,
      metalType: product.metalType,
      metalWeight: product.metalWeight,
      name: product.name,
      productId: product.productId,
      pureProduct: pureProduct
        ? {
            currentBidPrice: pureProduct.currentBidPrice,
            isGenericFallback: pureProduct.isGenericFallback,
            manufacturer: pureProduct.manufacturer,
            productName: pureProduct.productName,
            pureProductId: pureProduct.pureProductId,
            sku: pureProduct.sku,
            weight: pureProduct.weight,
          }
        : null,
      pureProductId: product.pureProductId,
      thumbnail: product.thumbnail,
      url: product.url,
    };
  });
};

export const listProductsForReviewStatus = async (
  ctx: QueryCtx,
  status: ReviewStatus,
): Promise<Doc<"costcoProducts">[]> => {
  if (status === "action_needed") {
    const [needsReview, pendingApproval] = await Promise.all([
      takeWithLimit(
        () =>
          ctx.db
            .query("costcoProducts")
            .withIndex("by_match_status", (q) => q.eq("matchStatus", "needs_review"))
            .take(maxAdminReviewProducts + 1),
        maxAdminReviewProducts,
        "admin needs review products",
      ),
      takeWithLimit(
        () =>
          ctx.db
            .query("costcoProducts")
            .withIndex("by_match_status", (q) => q.eq("matchStatus", "pending_approval"))
            .take(maxAdminReviewProducts + 1),
        maxAdminReviewProducts,
        "admin pending approval products",
      ),
    ]);

    return assertAdminReviewLimit(
      [...pendingApproval, ...needsReview],
      "admin action needed products",
    );
  }

  if (status === "unmatched") {
    const [nullStatusProducts, legacyUndefinedProducts] = await Promise.all([
      takeWithLimit(
        () =>
          ctx.db
            .query("costcoProducts")
            .withIndex("by_match_status", (q) => q.eq("matchStatus", null))
            .take(maxAdminReviewProducts + 1),
        maxAdminReviewProducts,
        "admin unmatched products",
      ),
      listLegacyUndefinedMatchStatusProducts(ctx),
    ]);

    return assertAdminReviewLimit(
      [...nullStatusProducts, ...legacyUndefinedProducts],
      "admin unmatched products",
    );
  }

  return takeWithLimit(
    () =>
      ctx.db
        .query("costcoProducts")
        .withIndex("by_match_status", (q) => q.eq("matchStatus", status))
        .take(maxAdminReviewProducts + 1),
    maxAdminReviewProducts,
    `admin ${status} products`,
  );
};

export const getProductReviewCounts = async (ctx: QueryCtx) => {
  const [actionNeeded, autoMatched, fallback, manualMatched, unmatched] = await Promise.all([
    listProductsForReviewStatus(ctx, "action_needed"),
    listProductsForReviewStatus(ctx, "auto_matched"),
    listProductsForReviewStatus(ctx, "fallback"),
    listProductsForReviewStatus(ctx, "manual_matched"),
    listProductsForReviewStatus(ctx, "unmatched"),
  ]);

  const pendingApproval = actionNeeded.filter(
    (product) => product.matchStatus === "pending_approval",
  );
  const needsReview = actionNeeded.filter((product) => product.matchStatus === "needs_review");

  return {
    auto_matched: autoMatched.length,
    fallback: fallback.length,
    manual_matched: manualMatched.length,
    needs_review: needsReview.length,
    pending_approval: pendingApproval.length,
    total:
      actionNeeded.length +
      autoMatched.length +
      fallback.length +
      manualMatched.length +
      unmatched.length,
    unmatched: unmatched.length,
  };
};

export const getTopMatchesForProduct = async (
  ctx: QueryCtx,
  args: {
    costcoProductId: string;
    limit: number;
  },
) => {
  const costcoProduct = await ctx.db
    .query("costcoProducts")
    .withIndex("by_product_id", (q) => q.eq("productId", args.costcoProductId))
    .first();

  if (!costcoProduct) {
    throw new Error(`Costco product ${args.costcoProductId} not found`);
  }

  const weightInOz = extractWeightInOz(costcoProduct.metalWeight);
  const fallbackPureId = weightInOz
    ? getFallbackPureId(costcoProduct.metalType, weightInOz)
    : null;

  const fallbackPureProduct = fallbackPureId
    ? await ctx.db
        .query("pureProducts")
        .withIndex("by_pure_id", (q) => q.eq("pureProductId", fallbackPureId))
        .first()
    : null;

  const pureProducts = await ctx.db
    .query("pureProducts")
    .withIndex("by_metal_type", (q) => q.eq("metalType", costcoProduct.metalType))
    .collect();

  if (pureProducts.length === 0) {
    return {
      costcoProduct: {
        metalType: costcoProduct.metalType,
        metalWeight: costcoProduct.metalWeight,
        name: costcoProduct.name,
        productId: costcoProduct.productId,
        weightInOz,
      },
      fallback: fallbackPureProduct
        ? {
            currentBidPrice: fallbackPureProduct.currentBidPrice,
            isGenericFallback: fallbackPureProduct.isGenericFallback,
            manufacturer: fallbackPureProduct.manufacturer,
            productName: fallbackPureProduct.productName,
            pureProductId: fallbackPureProduct.pureProductId,
            sku: fallbackPureProduct.sku,
            weight: fallbackPureProduct.weight,
          }
        : null,
      matches: [],
    };
  }

  const costcoNameLower = normalizeProductName(costcoProduct.name);
  const matches = pureProducts
    .map((pureProduct) => {
      if (!weightInOz) {
        return null;
      }

      const scored = scorePureProductCandidate(costcoNameLower, pureProduct, weightInOz);
      if (!scored) {
        return null;
      }

      return {
        details: scored.details,
        product: pureProduct,
        score: scored.score,
        weightMatch: scored.weightMatch,
      };
    })
    .filter((match) => match !== null)
    .toSorted((left, right) => right.score - left.score);

  return {
    costcoProduct: {
      metalType: costcoProduct.metalType,
      metalWeight: costcoProduct.metalWeight,
      name: costcoProduct.name,
      productId: costcoProduct.productId,
      weightInOz,
    },
    fallback: fallbackPureProduct
      ? {
          currentBidPrice: fallbackPureProduct.currentBidPrice,
          isGenericFallback: fallbackPureProduct.isGenericFallback,
          manufacturer: fallbackPureProduct.manufacturer,
          productName: fallbackPureProduct.productName,
          pureProductId: fallbackPureProduct.pureProductId,
          sku: fallbackPureProduct.sku,
          weight: fallbackPureProduct.weight,
        }
      : null,
    matches: matches.slice(0, args.limit).map((match) => ({
      currentBidPrice: match.product.currentBidPrice,
      details: match.details,
      isGenericFallback: match.product.isGenericFallback,
      manufacturer: match.product.manufacturer,
      productName: match.product.productName,
      pureProductId: match.product.pureProductId,
      score: match.score,
      sku: match.product.sku,
      weight: match.product.weight,
      weightMatch: match.weightMatch,
    })),
  };
};
