import type { Doc } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { getUserAlertEntitlements } from "../subscriptionEntitlements";
import {
  type AlertBatchDoc,
  type TriggeredAlertProduct,
  findPendingBatchForUserKey,
  formatUsd,
  getEstimatedWeightOz,
  getNextBatchScheduleTime,
  getStoredIdentity,
  getStoredUserKey,
  isAlertInCooldown,
  matchesCategoryFilters,
  mergeAlertProducts,
  recentPriceDropWindowMs,
} from "./core";

const getProductsByIds = async (ctx: MutationCtx, productIds: string[]) => {
  return (
    await Promise.all(
      productIds.map((productId) =>
        ctx.db
          .query("costcoProducts")
          .withIndex("by_product_id", (q) => q.eq("productId", productId))
          .first(),
      ),
    )
  ).filter((product): product is Doc<"costcoProducts"> => product !== null);
};

const getPureProductsForCostcoProducts = async (
  ctx: MutationCtx,
  products: Doc<"costcoProducts">[],
) => {
  const pureProductIds = [
    ...new Set(
      products
        .map((product) => product.pureProductId)
        .filter(
          (pureProductId): pureProductId is string =>
            typeof pureProductId === "string" && pureProductId.length > 0,
        ),
    ),
  ];

  return (
    await Promise.all(
      pureProductIds.map((pureProductId) =>
        ctx.db
          .query("pureProducts")
          .withIndex("by_pure_id", (q) => q.eq("pureProductId", pureProductId))
          .first(),
      ),
    )
  ).filter((product): product is Doc<"pureProducts"> => product !== null);
};

export const evaluateAlertsForProductsHelper = async (
  ctx: MutationCtx,
  args: {
    evaluatedAt?: number;
    productIds: string[];
    source?: string;
  },
) => {
  const timestamp = args.evaluatedAt ?? Date.now();
  const scheduleTime = getNextBatchScheduleTime(timestamp);
  const uniqueProductIds = [...new Set(args.productIds)];

  if (uniqueProductIds.length === 0) {
    return {
      evaluatedAlerts: 0,
      evaluatedProducts: 0,
      queueInserts: 0,
      skippedByEntitlement: 0,
      triggeredAlerts: 0,
    };
  }

  const products = await getProductsByIds(ctx, uniqueProductIds);
  if (products.length === 0) {
    return {
      evaluatedAlerts: 0,
      evaluatedProducts: 0,
      queueInserts: 0,
      skippedByEntitlement: 0,
      triggeredAlerts: 0,
    };
  }

  const productById = new Map(products.map((product) => [product.productId, product]));
  const enabledAlerts = await ctx.db
    .query("alerts")
    .withIndex("by_enabled", (q) => q.eq("enabled", true))
    .collect();

  if (enabledAlerts.length === 0) {
    return {
      evaluatedAlerts: 0,
      evaluatedProducts: products.length,
      queueInserts: 0,
      skippedByEntitlement: 0,
      triggeredAlerts: 0,
    };
  }

  const latestGoldSpot = await ctx.db
    .query("collectPurePrices")
    .withIndex("by_metal_and_time", (q) => q.eq("metalType", "gold"))
    .order("desc")
    .first();
  const latestSilverSpot = await ctx.db
    .query("collectPurePrices")
    .withIndex("by_metal_and_time", (q) => q.eq("metalType", "silver"))
    .order("desc")
    .first();

  const fallbackBidByMetal = new Map<"gold" | "silver", null | number>([
    ["gold", latestGoldSpot?.bidPrice ?? null],
    ["silver", latestSilverSpot?.bidPrice ?? null],
  ]);

  const pureProducts = await getPureProductsForCostcoProducts(ctx, products);
  const pureBidByProductId = new Map(
    pureProducts.map((product) => [product.pureProductId, product.currentBidPricePerOz]),
  );

  const sendEntitlementByUser = new Map<string, boolean>();
  const pendingBatchByUser = new Map<string, AlertBatchDoc | null>();
  let skippedByEntitlement = 0;
  let triggeredAlerts = 0;
  let queueInserts = 0;

  for (const alert of enabledAlerts) {
    if (isAlertInCooldown(alert, timestamp)) {
      continue;
    }

    const userKey = getStoredUserKey(alert);
    let canSendAlerts = sendEntitlementByUser.get(userKey);
    if (canSendAlerts === undefined) {
      const { alertEntitlements } = await getUserAlertEntitlements(ctx, getStoredIdentity(alert));
      canSendAlerts = alertEntitlements.canSendAlerts;
      sendEntitlementByUser.set(userKey, canSendAlerts);
    }

    if (!canSendAlerts) {
      skippedByEntitlement++;
      continue;
    }

    let candidateProducts = products;
    if (alert.type === "sku") {
      const matchedProduct = alert.productId ? productById.get(alert.productId) : undefined;
      candidateProducts = matchedProduct ? [matchedProduct] : [];
    } else if (alert.type === "category") {
      candidateProducts = products.filter((product) => matchesCategoryFilters(alert, product));
    } else if (alert.metalType) {
      candidateProducts = products.filter((product) => product.metalType === alert.metalType);
    }

    const triggeredProducts: TriggeredAlertProduct[] = [];
    for (const product of candidateProducts) {
      if (alert.triggerOn === "in_stock") {
        if (product.currentInStock) {
          triggeredProducts.push({
            productId: product.productId,
            productName: product.name,
            reason: "Back in stock",
          });
        }
        continue;
      }

      if (alert.triggerOn === "price_drop") {
        if (
          product.lastPriceChange &&
          timestamp - product.lastPriceChange <= recentPriceDropWindowMs
        ) {
          triggeredProducts.push({
            productId: product.productId,
            productName: product.name,
            reason: "Price updated",
          });
        }
        continue;
      }

      if (!product.currentInStock || !product.currentPricePerOunce) {
        continue;
      }

      const fallbackBid = fallbackBidByMetal.get(product.metalType) ?? null;
      const matchedPureBid = product.pureProductId
        ? (pureBidByProductId.get(product.pureProductId) ?? null)
        : null;
      const bidPerOunce = matchedPureBid ?? fallbackBid;
      if (!bidPerOunce || bidPerOunce <= 0) {
        continue;
      }

      const aboveSpotPercentage =
        ((product.currentPricePerOunce - bidPerOunce) / bidPerOunce) * 100;
      const estimatedWeight = getEstimatedWeightOz(product);
      const estimatedProfit = estimatedWeight
        ? bidPerOunce * estimatedWeight - product.currentPrice
        : undefined;

      const aboveSpotMet =
        alert.aboveSpotThreshold !== undefined && aboveSpotPercentage <= alert.aboveSpotThreshold;
      const profitMet =
        alert.profitThreshold !== undefined &&
        estimatedProfit !== undefined &&
        estimatedProfit >= alert.profitThreshold;

      if (aboveSpotMet) {
        triggeredProducts.push({
          productId: product.productId,
          productName: product.name,
          reason: `${aboveSpotPercentage.toFixed(2)}% above spot (<= ${alert.aboveSpotThreshold?.toFixed(2)}%)`,
        });
        continue;
      }

      if (profitMet && alert.profitThreshold !== undefined) {
        triggeredProducts.push({
          productId: product.productId,
          productName: product.name,
          reason: `Estimated spread ${formatUsd(estimatedProfit)} (>= ${formatUsd(alert.profitThreshold)})`,
        });
      }
    }

    if (triggeredProducts.length === 0) {
      continue;
    }

    triggeredAlerts++;
    await ctx.db.insert("alertHistory", {
      alertId: alert._id,
      notificationSent: false,
      products: triggeredProducts,
      triggeredAt: timestamp,
      userId: alert.userId,
      userTokenIdentifier: alert.userTokenIdentifier,
    });

    await ctx.db.patch(alert._id, {
      lastTriggered: timestamp,
      updatedAt: timestamp,
    });

    let pendingBatch = pendingBatchByUser.get(userKey);
    if (pendingBatch === undefined) {
      pendingBatch = await findPendingBatchForUserKey(ctx, userKey, scheduleTime);
      pendingBatchByUser.set(userKey, pendingBatch ?? null);
    }

    const alertPayload = {
      alertId: alert._id,
      alertName: alert.name,
      products: triggeredProducts,
    };

    if (pendingBatch) {
      const existingEntry = pendingBatch.alerts.find((entry) => entry.alertId === alert._id);

      const nextAlerts = existingEntry
        ? pendingBatch.alerts.map((entry) =>
            entry.alertId === alert._id
              ? {
                  ...entry,
                  products: mergeAlertProducts(entry.products, triggeredProducts),
                }
              : entry,
          )
        : [...pendingBatch.alerts, alertPayload];

      await ctx.db.patch(pendingBatch._id, { alerts: nextAlerts });
      pendingBatchByUser.set(userKey, {
        ...pendingBatch,
        alerts: nextAlerts,
      });
    } else {
      const batchId = await ctx.db.insert("alertBatches", {
        alerts: [alertPayload],
        createdAt: timestamp,
        scheduledFor: scheduleTime,
        sendAttempts: 0,
        sent: false,
        userId: alert.userId,
        userTokenIdentifier: alert.userTokenIdentifier,
      });

      queueInserts++;
      pendingBatchByUser.set(userKey, await ctx.db.get(batchId));
    }
  }

  return {
    evaluatedAlerts: enabledAlerts.length,
    evaluatedProducts: products.length,
    queueInserts,
    skippedByEntitlement,
    source: args.source,
    triggeredAlerts,
  };
};
