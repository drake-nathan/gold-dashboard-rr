import { v } from "convex/values";

import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import {
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import {
  type AlertBatchDoc,
  type AlertConfiguration,
  type AlertHistoryDoc,
  type TriggeredAlertProduct,
  alertBatchMaxSendAttempts,
  alertBatchMissingConfigDeferMinutes,
  alertTypeValidator,
  assertValidAlertConfiguration,
  buildUnsubscribeUrl,
  defaultPendingBatchProcessLimit,
  findPendingBatchForUserKey,
  formatAlertDigest,
  formatUsd,
  getAlertBatchRetryDelayMs,
  getAlertDeliveryConfig,
  getEnabledAlertsForUserKey,
  getEstimatedWeightOz,
  getNextBatchScheduleTime,
  getPendingAlertHistoryForBatch,
  getStoredIdentity,
  getStoredUserKey,
  isAlertInCooldown,
  isAlertOwnedByIdentity,
  listAlertsForIdentity,
  matchesCategoryFilters,
  mergeAlertProducts,
  metalTypeValidator,
  pauseEnabledAlertsForIdentity,
  pauseEnabledAlertsForUser,
  recentPriceDropWindowMs,
  resolveAlertRecipientEmail,
  sendAlertEmail,
  takeAlertProductOptions,
  triggerOnValidator,
} from "./lib/alerts";
import { requireAuthIdentity } from "./lib/authIdentity";
import { getPauseReasonFromSubscriptionStatus } from "./stripeUtils";
import { getUserAlertEntitlements } from "./subscriptionEntitlements";

export const getAlerts = query({
  args: {},
  handler: async (ctx) => {
    const identity = await requireAuthIdentity(ctx);
    const alerts = await listAlertsForIdentity(ctx, identity);

    return alerts.toSorted((a, b) => b.updatedAt - a.updatedAt);
  },
});

export const getProductOptions = query({
  args: {},
  handler: async (ctx) => {
    return takeAlertProductOptions(ctx);
  },
});

export const createAlert = mutation({
  args: {
    aboveSpotThreshold: v.optional(v.number()),
    brand: v.optional(v.string()),
    cooldownMinutes: v.optional(v.number()),
    enabled: v.optional(v.boolean()),
    metalType: v.optional(metalTypeValidator),
    name: v.string(),
    productId: v.optional(v.string()),
    profitThreshold: v.optional(v.number()),
    triggerOn: triggerOnValidator,
    type: alertTypeValidator,
    weight: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await requireAuthIdentity(ctx);
    const { alertEntitlements } = await getUserAlertEntitlements(ctx, identity);

    if (!alertEntitlements.canCreateAlerts) {
      throw new Error("Pro subscription required to create alerts");
    }

    const cooldownMinutes = args.cooldownMinutes ?? 60;
    if (cooldownMinutes <= 0) {
      throw new Error("cooldownMinutes must be greater than 0");
    }

    assertValidAlertConfiguration(args);

    const enabled = args.enabled ?? true;
    if (enabled && !alertEntitlements.canEnableAlerts) {
      throw new Error("Active subscription required to enable alerts");
    }

    const now = Date.now();
    const alertId = await ctx.db.insert("alerts", {
      cooldownMinutes,
      createdAt: now,
      enabled,
      name: args.name,
      triggerOn: args.triggerOn,
      type: args.type,
      updatedAt: now,
      userId: identity.subject,
      userTokenIdentifier: identity.tokenIdentifier,
      ...(args.aboveSpotThreshold !== undefined && {
        aboveSpotThreshold: args.aboveSpotThreshold,
      }),
      ...(args.brand !== undefined && { brand: args.brand }),
      ...(args.metalType !== undefined && { metalType: args.metalType }),
      ...(args.productId !== undefined && { productId: args.productId }),
      ...(args.profitThreshold !== undefined && {
        profitThreshold: args.profitThreshold,
      }),
      ...(args.weight !== undefined && { weight: args.weight }),
    });

    return { alertId, success: true };
  },
});

export const updateAlert = mutation({
  args: {
    aboveSpotThreshold: v.optional(v.number()),
    alertId: v.id("alerts"),
    brand: v.optional(v.string()),
    cooldownMinutes: v.optional(v.number()),
    enabled: v.optional(v.boolean()),
    metalType: v.optional(metalTypeValidator),
    name: v.optional(v.string()),
    productId: v.optional(v.string()),
    profitThreshold: v.optional(v.number()),
    triggerOn: v.optional(triggerOnValidator),
    type: v.optional(alertTypeValidator),
    weight: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await requireAuthIdentity(ctx);

    const alert = await ctx.db.get(args.alertId);
    if (!alert || !isAlertOwnedByIdentity(alert, identity)) {
      throw new Error("Alert not found");
    }

    const { alertEntitlements } = await getUserAlertEntitlements(ctx, identity);
    if (!alertEntitlements.canManageAlerts) {
      throw new Error("Subscription required to manage alerts");
    }

    if (args.cooldownMinutes !== undefined && args.cooldownMinutes <= 0) {
      throw new Error("cooldownMinutes must be greater than 0");
    }

    const nextConfiguration: AlertConfiguration = {
      aboveSpotThreshold: args.aboveSpotThreshold ?? alert.aboveSpotThreshold,
      brand: args.brand ?? alert.brand,
      metalType: args.metalType ?? alert.metalType,
      productId: args.productId ?? alert.productId,
      profitThreshold: args.profitThreshold ?? alert.profitThreshold,
      triggerOn: args.triggerOn ?? alert.triggerOn,
      type: args.type ?? alert.type,
      weight: args.weight ?? alert.weight,
    };
    assertValidAlertConfiguration(nextConfiguration);

    if (args.enabled === true && !alertEntitlements.canEnableAlerts) {
      throw new Error("Active subscription required to enable alerts");
    }

    const updatedAt = Date.now();
    const updates: Record<string, boolean | number | string | undefined> = {
      updatedAt,
      userId: identity.subject,
      userTokenIdentifier: identity.tokenIdentifier,
    };

    if (args.aboveSpotThreshold !== undefined) {
      updates.aboveSpotThreshold = args.aboveSpotThreshold;
    }
    if (args.brand !== undefined) updates.brand = args.brand;
    if (args.cooldownMinutes !== undefined) {
      updates.cooldownMinutes = args.cooldownMinutes;
    }
    if (args.enabled !== undefined) updates.enabled = args.enabled;
    if (args.metalType !== undefined) updates.metalType = args.metalType;
    if (args.name !== undefined) updates.name = args.name;
    if (args.productId !== undefined) updates.productId = args.productId;
    if (args.profitThreshold !== undefined) {
      updates.profitThreshold = args.profitThreshold;
    }
    if (args.triggerOn !== undefined) updates.triggerOn = args.triggerOn;
    if (args.type !== undefined) updates.type = args.type;
    if (args.weight !== undefined) updates.weight = args.weight;

    if (args.enabled === true || args.enabled === false) {
      updates.pauseReason = undefined;
      updates.pausedAt = undefined;
    }

    await ctx.db.patch(alert._id, updates);
    return { success: true };
  },
});

export const deleteAlert = mutation({
  args: {
    alertId: v.id("alerts"),
  },
  handler: async (ctx, args) => {
    const identity = await requireAuthIdentity(ctx);

    const alert = await ctx.db.get(args.alertId);
    if (!alert || !isAlertOwnedByIdentity(alert, identity)) {
      throw new Error("Alert not found");
    }

    // Intentionally allow deletes regardless of subscription status.
    // Users should always be able to clean up old alerts.
    await ctx.db.delete(alert._id);
    return { success: true };
  },
});

/**
 * Sync current user's alerts with subscription/billing state.
 * Call this after subscription status changes to enforce pause policy.
 */
export const syncAlertPauseState = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await requireAuthIdentity(ctx);
    const { alertEntitlements } = await getUserAlertEntitlements(ctx, identity);

    if (!alertEntitlements.shouldPauseEnabledAlerts || !alertEntitlements.pauseReason) {
      return { pausedCount: 0, success: true };
    }

    const pausedCount = await pauseEnabledAlertsForIdentity(
      ctx,
      identity,
      alertEntitlements.pauseReason,
    );

    return {
      pausedCount,
      pauseReason: alertEntitlements.pauseReason,
      success: true,
    };
  },
});

/**
 * Internal helper for future alert dispatch: verify send permissions by user.
 */
export const getUserSendAlertPermissions = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const { alertEntitlements, subscriptionStatus } = await getUserAlertEntitlements(
      ctx,
      args.userId,
    );

    return {
      alertEntitlements,
      isPro: subscriptionStatus.isPro,
      status: subscriptionStatus.status,
      userId: args.userId,
    };
  },
});

/**
 * Disable all enabled alerts for a user. Used by one-click unsubscribe endpoint.
 */
export const disableAllAlertsForUser = internalMutation({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const enabledAlerts = await getEnabledAlertsForUserKey(ctx, args.userId);

    const now = Date.now();
    for (const alert of enabledAlerts) {
      await ctx.db.patch(alert._id, {
        enabled: false,
        updatedAt: now,
      });
    }

    return { disabledCount: enabledAlerts.length, success: true };
  },
});

/**
 * Internal helper for webhook/event pipelines to force-pause enabled alerts.
 */
export const pauseAlertsForUser = internalMutation({
  args: {
    pauseReason: v.union(v.literal("billing_hold"), v.literal("inactive_subscription")),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const pausedCount = await pauseEnabledAlertsForUser(ctx, args.userId, args.pauseReason);

    return { pausedCount, success: true };
  },
});

/**
 * Internal helper for applying subscription status transitions to user alerts.
 * Used by webhook/event pipelines.
 */
export const applySubscriptionStatusToAlerts = internalMutation({
  args: {
    status: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const pauseReason = getPauseReasonFromSubscriptionStatus(args.status);
    if (!pauseReason) {
      return { pausedCount: 0, success: true };
    }

    const pausedCount = await pauseEnabledAlertsForUser(ctx, args.userId, pauseReason);

    return { pausedCount, pauseReason, success: true };
  },
});

/**
 * Evaluate enabled alerts against recently updated products, then queue
 * batched notifications for users with send entitlements.
 */
export const evaluateAlertsForProducts = internalMutation({
  args: {
    evaluatedAt: v.optional(v.number()),
    productIds: v.array(v.string()),
    source: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
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

    const products: Doc<"costcoProducts">[] = (
      await Promise.all(
        uniqueProductIds.map((productId) =>
          ctx.db
            .query("costcoProducts")
            .withIndex("by_product_id", (q) => q.eq("productId", productId))
            .first(),
        ),
      )
    ).filter((product): product is Doc<"costcoProducts"> => product !== null);

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
      .withIndex("by_metal", (q) => q.eq("metalType", "gold"))
      .order("desc")
      .first();

    const latestSilverSpot = await ctx.db
      .query("collectPurePrices")
      .withIndex("by_metal", (q) => q.eq("metalType", "silver"))
      .order("desc")
      .first();

    const fallbackBidByMetal = new Map<"gold" | "silver", null | number>([
      ["gold", latestGoldSpot?.bidPrice ?? null],
      ["silver", latestSilverSpot?.bidPrice ?? null],
    ]);

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
    const pureProducts: Doc<"pureProducts">[] = (
      await Promise.all(
        pureProductIds.map((pureProductId) =>
          ctx.db
            .query("pureProducts")
            .withIndex("by_pure_id", (q) => q.eq("pureProductId", pureProductId))
            .first(),
        ),
      )
    ).filter((product): product is Doc<"pureProducts"> => product !== null);

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
        if (!bidPerOunce) {
          continue;
        }

        if (bidPerOunce <= 0) {
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
      const mergedTriggeredProducts = triggeredProducts;

      await ctx.db.insert("alertHistory", {
        alertId: alert._id,
        notificationSent: false,
        products: mergedTriggeredProducts,
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
        products: mergedTriggeredProducts,
      };

      if (pendingBatch) {
        const existingEntry = pendingBatch.alerts.find((entry) => entry.alertId === alert._id);

        let nextAlerts = pendingBatch.alerts;
        if (existingEntry) {
          nextAlerts = pendingBatch.alerts.map((entry) =>
            entry.alertId === alert._id
              ? {
                  ...entry,
                  products: mergeAlertProducts(entry.products, mergedTriggeredProducts),
                }
              : entry,
          );
        } else {
          nextAlerts = [...pendingBatch.alerts, alertPayload];
        }

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
        const insertedBatch = await ctx.db.get(batchId);
        pendingBatchByUser.set(userKey, insertedBatch);
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
  },
});

/**
 * Internal query used by alert batch processing to fetch due, unsent batches.
 */
export const listPendingAlertBatches = internalQuery({
  args: {
    limit: v.optional(v.number()),
    now: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = args.now ?? Date.now();
    const limit = args.limit ?? defaultPendingBatchProcessLimit;
    if (limit <= 0) {
      throw new Error("limit must be greater than 0");
    }

    return ctx.db
      .query("alertBatches")
      .withIndex("by_pending", (q) => q.eq("sent", false).lte("scheduledFor", now))
      .order("asc")
      .take(limit);
  },
});

/**
 * Marks a batch as processed and updates related alert history records.
 */
export const markAlertBatchProcessed = internalMutation({
  args: {
    batchId: v.id("alertBatches"),
    errorMessage: v.optional(v.string()),
    processedAt: v.number(),
    status: v.union(v.literal("sent"), v.literal("skipped")),
  },
  handler: async (ctx, args) => {
    const batch = await ctx.db.get(args.batchId);
    if (!batch) {
      return {
        alreadyProcessed: false,
        historyUpdated: 0,
        success: false,
      };
    }

    if (batch.sent) {
      return {
        alreadyProcessed: true,
        historyUpdated: 0,
        success: true,
      };
    }

    const matchedHistory = await getPendingAlertHistoryForBatch(ctx, batch);
    const shouldMarkSent = args.status === "sent";

    await Promise.all(
      matchedHistory.map((history: AlertHistoryDoc) =>
        ctx.db.patch(history._id, {
          notificationError: shouldMarkSent
            ? undefined
            : (args.errorMessage ?? "Alert delivery skipped"),
          notificationSent: shouldMarkSent,
        }),
      ),
    );

    await ctx.db.patch(batch._id, {
      lastAttemptedAt: args.processedAt,
      lastAttemptError: shouldMarkSent
        ? undefined
        : (args.errorMessage ?? "Alert delivery skipped"),
      sent: true,
      sentAt: args.processedAt,
      terminalFailureAt: shouldMarkSent ? undefined : args.processedAt,
    });

    return {
      alreadyProcessed: false,
      historyUpdated: matchedHistory.length,
      success: true,
    };
  },
});

/**
 * Defers a pending batch when delivery is temporarily unavailable (e.g. missing config).
 */
export const deferAlertBatchForMissingConfig = internalMutation({
  args: {
    batchId: v.id("alertBatches"),
    deferredAt: v.number(),
  },
  handler: async (ctx, args) => {
    const batch = await ctx.db.get(args.batchId);
    if (!batch) {
      return { deferredUntil: null, success: false };
    }

    if (batch.sent) {
      return { deferredUntil: null, success: true };
    }

    const deferMs = alertBatchMissingConfigDeferMinutes * 60 * 1000;
    const deferredUntil = Math.max(batch.scheduledFor, args.deferredAt + deferMs);
    await ctx.db.patch(batch._id, {
      lastAttemptedAt: args.deferredAt,
      lastAttemptError: "Alert delivery deferred: missing RESEND_API_KEY or RESEND_FROM_EMAIL",
      scheduledFor: deferredUntil,
    });

    return { deferredUntil, success: true };
  },
});

/**
 * Tracks a failed send attempt. Retries with backoff up to a bounded max.
 */
export const recordAlertBatchSendFailure = internalMutation({
  args: {
    batchId: v.id("alertBatches"),
    errorMessage: v.string(),
    failedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const batch = await ctx.db.get(args.batchId);
    if (!batch) {
      return {
        gaveUp: false,
        nextScheduledFor: null,
        sendAttempts: 0,
        success: false,
      };
    }

    if (batch.sent) {
      return {
        gaveUp: false,
        nextScheduledFor: null,
        sendAttempts: batch.sendAttempts ?? 0,
        success: true,
      };
    }

    const sendAttempts = (batch.sendAttempts ?? 0) + 1;
    if (sendAttempts >= alertBatchMaxSendAttempts) {
      const finalError = `Alert delivery failed after ${sendAttempts} attempts: ${args.errorMessage}`;
      const matchedHistory = await getPendingAlertHistoryForBatch(ctx, batch);
      await Promise.all(
        matchedHistory.map((history: AlertHistoryDoc) =>
          ctx.db.patch(history._id, {
            notificationError: finalError,
            notificationSent: false,
          }),
        ),
      );

      await ctx.db.patch(batch._id, {
        lastAttemptedAt: args.failedAt,
        lastAttemptError: finalError,
        sendAttempts,
        sent: true,
        sentAt: args.failedAt,
        terminalFailureAt: args.failedAt,
      });

      return {
        gaveUp: true,
        nextScheduledFor: null,
        sendAttempts,
        success: true,
      };
    }

    const retryDelayMs = getAlertBatchRetryDelayMs(sendAttempts);
    const nextScheduledFor = args.failedAt + retryDelayMs;
    await ctx.db.patch(batch._id, {
      lastAttemptedAt: args.failedAt,
      lastAttemptError: args.errorMessage,
      scheduledFor: nextScheduledFor,
      sendAttempts,
    });

    return {
      gaveUp: false,
      nextScheduledFor,
      sendAttempts,
      success: true,
    };
  },
});

/**
 * Internal action that sends due alert batches. Wire this to a cron.
 */
export const processPendingAlertBatches: ReturnType<typeof internalAction> = internalAction({
  args: {
    limit: v.optional(v.number()),
    now: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = args.now ?? Date.now();
    const pendingBatches = await ctx.runQuery(internal.alerts.listPendingAlertBatches, {
      limit: args.limit,
      now,
    });
    const deliveryConfig = getAlertDeliveryConfig();

    let considered = 0;
    let deferredByMissingConfig = 0;
    let deferredRescheduled = 0;
    let exhaustedRetries = 0;
    let failedSends = 0;
    let retriesScheduled = 0;
    let sentBatches = 0;
    let skippedByEntitlement = 0;
    let skippedByMissingRecipient = 0;

    if (!deliveryConfig && pendingBatches.length > 0) {
      console.error("Alert delivery config missing; deferring pending batches", {
        pendingBatches: pendingBatches.length,
      });
    }

    for (const batch of pendingBatches) {
      considered++;
      const userKey = getStoredUserKey(batch);

      const { alertEntitlements, subscriptionStatus } = await getUserAlertEntitlements(
        ctx,
        getStoredIdentity(batch),
      );
      if (!alertEntitlements.canSendAlerts) {
        skippedByEntitlement++;
        await ctx.runMutation(internal.alerts.markAlertBatchProcessed, {
          batchId: batch._id,
          errorMessage: `Skipped: subscription status ${subscriptionStatus.status} cannot receive alerts`,
          processedAt: now,
          status: "skipped",
        });
        continue;
      }

      if (!deliveryConfig) {
        deferredByMissingConfig++;
        const deferResult = await ctx.runMutation(internal.alerts.deferAlertBatchForMissingConfig, {
          batchId: batch._id,
          deferredAt: now,
        });
        if (deferResult.success) {
          deferredRescheduled++;
        }
        continue;
      }

      const recipientEmail = await resolveAlertRecipientEmail(ctx, getStoredIdentity(batch));
      if (!recipientEmail) {
        skippedByMissingRecipient++;
        await ctx.runMutation(internal.alerts.markAlertBatchProcessed, {
          batchId: batch._id,
          errorMessage: "Skipped: no recipient email available for subscription",
          processedAt: now,
          status: "skipped",
        });
        continue;
      }

      const unsubscribeUrl = await buildUnsubscribeUrl(userKey);
      const digest = formatAlertDigest(batch, deliveryConfig.siteUrl, unsubscribeUrl ?? undefined);
      const sendResult = await sendAlertEmail(deliveryConfig, {
        html: digest.html,
        subject: digest.subject,
        text: digest.text,
        to: recipientEmail,
        unsubscribeUrl: unsubscribeUrl ?? undefined,
      });

      if (!sendResult.ok) {
        failedSends++;
        const failureResult = await ctx.runMutation(internal.alerts.recordAlertBatchSendFailure, {
          batchId: batch._id,
          errorMessage: sendResult.error,
          failedAt: now,
        });

        if (failureResult.gaveUp) {
          exhaustedRetries++;
        } else {
          retriesScheduled++;
        }

        console.error("Failed to send alert batch", {
          batchId: batch._id,
          error: sendResult.error,
          gaveUp: failureResult.gaveUp,
          nextScheduledFor: failureResult.nextScheduledFor,
          sendAttempts: failureResult.sendAttempts,
        });
        continue;
      }

      await ctx.runMutation(internal.alerts.markAlertBatchProcessed, {
        batchId: batch._id,
        processedAt: now,
        status: "sent",
      });
      sentBatches++;
    }

    return {
      considered,
      deferredByMissingConfig,
      deferredRescheduled,
      exhaustedRetries,
      failedSends,
      pendingCount: pendingBatches.length,
      retriesScheduled,
      sentBatches,
      skippedByEntitlement,
      skippedByMissingRecipient,
      success: true,
    };
  },
});
