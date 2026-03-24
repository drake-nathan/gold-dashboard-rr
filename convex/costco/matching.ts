import type { Doc } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { extractWeightInOz, getFallbackPureId } from "../lib/metalParsing";
import { normalizeProductName, scorePureProductCandidate } from "../lib/productMatching";

interface ScoredMatch {
  details: string;
  product: Doc<"pureProducts">;
  score: number;
}

const scoreMatch = (
  costcoNameLower: string,
  pureProduct: Doc<"pureProducts">,
  weightInOz: number,
): null | ScoredMatch => {
  const scored = scorePureProductCandidate(costcoNameLower, pureProduct, weightInOz);
  if (!scored) {
    return null;
  }

  return {
    details: scored.details.join(", "),
    product: pureProduct,
    score: scored.score,
  };
};

export const matchCostcoProductToPureHelper = async (
  ctx: MutationCtx,
  args: { costcoProductId: string },
) => {
  const costcoProduct = await ctx.db
    .query("costcoProducts")
    .withIndex("by_product_id", (q) => q.eq("productId", args.costcoProductId))
    .first();

  if (!costcoProduct) {
    console.warn(`Costco product ${args.costcoProductId} not found for matching`);
    return { matched: false };
  }

  if (costcoProduct.matchStatus === "manual_matched") {
    console.info(
      `⏭️  SKIPPING: ${costcoProduct.name} (${args.costcoProductId}) - manually matched`,
    );
    return { matched: true, skipped: true, status: "manual_matched" as const };
  }

  const weightInOz = extractWeightInOz(costcoProduct.metalWeight);
  if (!weightInOz) {
    console.warn(`Could not extract weight for ${costcoProduct.name} (${args.costcoProductId})`);
    await ctx.db.patch(costcoProduct._id, {
      matchStatus: "fallback",
      pureProductId: null,
    });
    return { matched: false, status: "fallback" as const };
  }

  const fallbackPureId = getFallbackPureId(costcoProduct.metalType, weightInOz);
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
    console.warn(`No Pure products found for ${costcoProduct.metalType}, using fallback`);

    if (fallbackPureProduct) {
      console.info(
        `Using fallback Pure product: ${fallbackPureProduct.productName} (${fallbackPureId})`,
      );
    }

    await ctx.db.patch(costcoProduct._id, {
      matchStatus: "fallback",
      pureProductId: fallbackPureProduct ? fallbackPureId : null,
    });

    return { matched: false, status: "fallback" as const };
  }

  const costcoNameLower = normalizeProductName(costcoProduct.name);
  const matches = pureProducts
    .map((pureProduct) => scoreMatch(costcoNameLower, pureProduct, weightInOz))
    .filter((match): match is ScoredMatch => match !== null)
    .toSorted((left, right) => right.score - left.score);

  if (matches.length === 0) {
    console.info(`❌ NO MATCH for Costco product: ${costcoProduct.name} (${args.costcoProductId})`);
    console.info(`   Weight: ${weightInOz} oz, Metal: ${costcoProduct.metalType}`);
    console.info(`   Available Pure products: ${pureProducts.length}`);

    if (fallbackPureProduct) {
      console.info(
        `   Using fallback Pure product: ${fallbackPureProduct.productName} (${fallbackPureId})`,
      );
    } else {
      console.info(`   Using generic ${costcoProduct.metalType} spot price`);
    }

    await ctx.db.patch(costcoProduct._id, {
      matchStatus: "fallback",
      pureProductId: fallbackPureProduct ? fallbackPureId : null,
    });

    return { matched: false, status: "fallback" as const };
  }

  const bestMatch = matches[0];

  if (bestMatch.score < 250 || matches.length > 1) {
    console.info(
      `⚠️  NEEDS REVIEW for Costco product: ${costcoProduct.name} (${args.costcoProductId})`,
    );
    console.info(`   Found ${matches.length} potential matches, top score: ${bestMatch.score}`);
    console.info("   Top candidates:");
    for (const [index, match] of matches.slice(0, 3).entries()) {
      console.info(
        `     ${index + 1}. ${match.product.productName} (ID: ${match.product.pureProductId})`,
      );
      console.info(`        Score: ${match.score} | Matched: ${match.details}`);
    }

    if (fallbackPureProduct) {
      console.info(`   Using fallback Pure product instead: ${fallbackPureProduct.productName}`);
    }

    await ctx.db.patch(costcoProduct._id, {
      matchStatus: "needs_review",
      pureProductId: fallbackPureProduct ? fallbackPureId : bestMatch.product.pureProductId,
    });

    return {
      candidates: matches.slice(0, 3).map((match) => ({
        details: match.details,
        productName: match.product.productName,
        pureProductId: match.product.pureProductId,
        score: match.score,
      })),
      matched: false,
      status: "needs_review" as const,
    };
  }

  console.info(`✅ AUTO MATCHED: ${costcoProduct.name} (${args.costcoProductId})`);
  console.info(`   → ${bestMatch.product.productName} (${bestMatch.product.pureProductId})`);
  console.info(`   Score: ${bestMatch.score} | Matched: ${bestMatch.details}`);

  await ctx.db.patch(costcoProduct._id, {
    matchStatus: "auto_matched",
    pureProductId: bestMatch.product.pureProductId,
  });

  return {
    matched: true,
    pureProductId: bestMatch.product.pureProductId,
    score: bestMatch.score,
    status: "auto_matched" as const,
  };
};

export const manuallyMatchProductHelper = async (
  ctx: MutationCtx,
  args: {
    costcoProductId: string;
    pureProductId: string;
  },
) => {
  const costcoProduct = await ctx.db
    .query("costcoProducts")
    .withIndex("by_product_id", (q) => q.eq("productId", args.costcoProductId))
    .first();

  if (!costcoProduct) {
    throw new Error(`Costco product ${args.costcoProductId} not found`);
  }

  const pureProduct = await ctx.db
    .query("pureProducts")
    .withIndex("by_pure_id", (q) => q.eq("pureProductId", args.pureProductId))
    .first();

  if (!pureProduct) {
    throw new Error(`Pure product ${args.pureProductId} not found`);
  }

  await ctx.db.patch(costcoProduct._id, {
    matchStatus: "manual_matched",
    pureProductId: args.pureProductId,
  });

  console.info(`🔧 MANUAL MATCH: ${costcoProduct.name} → ${pureProduct.productName}`);

  return {
    costcoProduct: costcoProduct.name,
    pureProduct: pureProduct.productName,
    success: true,
  };
};
