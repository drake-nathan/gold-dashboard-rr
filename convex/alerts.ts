import { v } from "convex/values";

import {
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import {
  deferAlertBatchForMissingConfigHelper,
  listPendingAlertBatchesHelper,
  markAlertBatchProcessedHelper,
  processPendingAlertBatchesHelper,
  recordAlertBatchSendFailureHelper,
} from "./alerts/batches";
import {
  type AlertConfiguration,
  alertTypeValidator,
  assertValidAlertConfiguration,
  getEnabledAlertsForUserKey,
  isAlertOwnedByIdentity,
  listAlertsForIdentity,
  metalTypeValidator,
  pauseEnabledAlertsForIdentity,
  pauseEnabledAlertsForUser,
  takeAlertProductOptions,
  triggerOnValidator,
} from "./alerts/core";
import { evaluateAlertsForProductsHelper } from "./alerts/evaluation";
import { categoryWeightGroupValidator } from "./alerts/weightGroups";
import { requireAuthIdentity } from "./lib/authIdentity";
import { getPauseReasonFromSubscriptionStatus } from "./stripeUtils";
import { getUserAlertEntitlements } from "./subscriptionEntitlements";

export const getAlerts = query({
  args: {},
  handler: async (ctx) => {
    const identity = await requireAuthIdentity(ctx);
    const alerts = await listAlertsForIdentity(ctx, identity);

    return alerts.toSorted((a, b) => b.createdAt - a.createdAt);
  },
});

export const getProductOptions = query({
  args: {},
  handler: async (ctx) => {
    return takeAlertProductOptions(ctx);
  },
});

export const getBrandOptions = query({
  args: {},
  handler: async (ctx) => {
    const products = await ctx.db.query("costcoProducts").take(250);
    const brands = new Set<string>();

    for (const product of products) {
      const brand = product.brand?.trim();
      if (brand) {
        brands.add(brand);
      }
    }

    return [...brands].toSorted((a, b) => a.localeCompare(b));
  },
});

// `null` is accepted on clearable fields so the form can use one payload shape
// for both create and update. On create, null is treated as "not set". On update,
// null means "clear this field"; undefined means "leave existing value alone".
const clearableMetalType = v.optional(v.union(metalTypeValidator, v.null()));
const clearableString = v.optional(v.union(v.string(), v.null()));
const clearableNumber = v.optional(v.union(v.number(), v.null()));
const clearableWeightGroup = v.optional(v.union(categoryWeightGroupValidator, v.null()));

const coalesceProvided = <T>(value: null | T | undefined): T | undefined =>
  value === null ? undefined : value;

export const createAlert = mutation({
  args: {
    aboveSpotThreshold: clearableNumber,
    brand: clearableString,
    cooldownMinutes: v.optional(v.number()),
    enabled: v.optional(v.boolean()),
    metalType: clearableMetalType,
    name: v.string(),
    productId: clearableString,
    profitThreshold: clearableNumber,
    triggerOn: triggerOnValidator,
    type: alertTypeValidator,
    weight: clearableNumber,
    weightGroup: clearableWeightGroup,
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

    const aboveSpotThreshold = coalesceProvided(args.aboveSpotThreshold);
    const brand = coalesceProvided(args.brand);
    const metalType = coalesceProvided(args.metalType);
    const productId = coalesceProvided(args.productId);
    const profitThreshold = coalesceProvided(args.profitThreshold);
    const weight = coalesceProvided(args.weight);
    const weightGroup = coalesceProvided(args.weightGroup);

    assertValidAlertConfiguration({
      aboveSpotThreshold,
      brand,
      metalType,
      productId,
      profitThreshold,
      triggerOn: args.triggerOn,
      type: args.type,
      weight,
      weightGroup,
    });

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
      ...(aboveSpotThreshold !== undefined && { aboveSpotThreshold }),
      ...(brand !== undefined && { brand }),
      ...(metalType !== undefined && { metalType }),
      ...(productId !== undefined && { productId }),
      ...(profitThreshold !== undefined && { profitThreshold }),
      ...(weight !== undefined && { weight }),
      ...(weightGroup !== undefined && { weightGroup }),
    });

    return { alertId, success: true };
  },
});

export const updateAlert = mutation({
  args: {
    aboveSpotThreshold: clearableNumber,
    alertId: v.id("alerts"),
    brand: clearableString,
    cooldownMinutes: v.optional(v.number()),
    enabled: v.optional(v.boolean()),
    metalType: clearableMetalType,
    name: v.optional(v.string()),
    productId: clearableString,
    profitThreshold: clearableNumber,
    triggerOn: v.optional(triggerOnValidator),
    type: v.optional(alertTypeValidator),
    weight: clearableNumber,
    weightGroup: clearableWeightGroup,
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

    const hasConfigurationUpdate =
      args.aboveSpotThreshold !== undefined ||
      args.brand !== undefined ||
      args.metalType !== undefined ||
      args.productId !== undefined ||
      args.profitThreshold !== undefined ||
      args.triggerOn !== undefined ||
      args.type !== undefined ||
      args.weight !== undefined ||
      args.weightGroup !== undefined;

    // Field merge contract: callers that omit a field get the existing value (when
    // type is unchanged); callers that pass null clear it. Switching alert types
    // drops fields that don't apply to the new type.
    let nextConfiguration: AlertConfiguration | null = null;
    if (hasConfigurationUpdate) {
      const nextType = args.type ?? alert.type;
      const sameType = nextType === alert.type;
      const resolve = <T>(
        arg: null | T | undefined,
        existing: T | undefined,
        allowedForType: boolean,
      ): T | undefined => {
        if (!allowedForType) return undefined;
        if (arg === null) return undefined;
        if (arg === undefined) return sameType ? existing : undefined;
        return arg;
      };

      nextConfiguration = {
        aboveSpotThreshold: resolve(
          args.aboveSpotThreshold,
          alert.aboveSpotThreshold,
          nextType === "threshold",
        ),
        brand: resolve(args.brand, alert.brand, nextType === "category"),
        metalType: resolve(args.metalType, alert.metalType, nextType !== "sku"),
        productId: resolve(args.productId, alert.productId, nextType === "sku"),
        profitThreshold: resolve(
          args.profitThreshold,
          alert.profitThreshold,
          nextType === "threshold",
        ),
        triggerOn: args.triggerOn ?? alert.triggerOn,
        type: nextType,
        weight: resolve(args.weight, alert.weight, nextType === "category"),
        weightGroup: resolve(args.weightGroup, alert.weightGroup, nextType === "category"),
      };
      assertValidAlertConfiguration(nextConfiguration);
    }

    if (args.enabled === true && !alertEntitlements.canEnableAlerts) {
      throw new Error("Active subscription required to enable alerts");
    }

    const updatedAt = Date.now();
    const updates: Record<string, boolean | number | string | undefined> = {
      updatedAt,
      userId: identity.subject,
      userTokenIdentifier: identity.tokenIdentifier,
    };

    if (nextConfiguration) {
      updates.aboveSpotThreshold = nextConfiguration.aboveSpotThreshold;
      updates.brand = nextConfiguration.brand;
      updates.metalType = nextConfiguration.metalType;
      updates.productId = nextConfiguration.productId;
      updates.profitThreshold = nextConfiguration.profitThreshold;
      updates.triggerOn = nextConfiguration.triggerOn;
      updates.type = nextConfiguration.type;
      updates.weight = nextConfiguration.weight;
      updates.weightGroup = nextConfiguration.weightGroup;
    }
    if (args.cooldownMinutes !== undefined) {
      updates.cooldownMinutes = args.cooldownMinutes;
    }
    if (args.enabled !== undefined) updates.enabled = args.enabled;
    if (args.name !== undefined) updates.name = args.name;

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
  handler: (ctx, args) => evaluateAlertsForProductsHelper(ctx, args),
});

/**
 * Internal query used by alert batch processing to fetch due, unsent batches.
 */
export const listPendingAlertBatches = internalQuery({
  args: {
    limit: v.optional(v.number()),
    now: v.optional(v.number()),
  },
  handler: (ctx, args) => listPendingAlertBatchesHelper(ctx, args),
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
  handler: (ctx, args) => markAlertBatchProcessedHelper(ctx, args),
});

/**
 * Defers a pending batch when delivery is temporarily unavailable (e.g. missing config).
 */
export const deferAlertBatchForMissingConfig = internalMutation({
  args: {
    batchId: v.id("alertBatches"),
    deferredAt: v.number(),
  },
  handler: (ctx, args) => deferAlertBatchForMissingConfigHelper(ctx, args),
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
  handler: (ctx, args) => recordAlertBatchSendFailureHelper(ctx, args),
});

/**
 * Internal action that sends due alert batches. Wire this to a cron.
 */
export const processPendingAlertBatches: ReturnType<typeof internalAction> = internalAction({
  args: {
    limit: v.optional(v.number()),
    now: v.optional(v.number()),
  },
  handler: (ctx, args) => processPendingAlertBatchesHelper(ctx, args),
});
