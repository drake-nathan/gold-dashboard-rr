import { v } from "convex/values";

import { components, internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import type { ActionCtx, MutationCtx, QueryCtx } from "./_generated/server";
import {
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import type { AlertPauseReason } from "./stripeUtils";
import { getPauseReasonFromSubscriptionStatus } from "./stripeUtils";
import { getUserAlertEntitlements } from "./subscriptionEntitlements";

const alertTypeValidator = v.union(v.literal("sku"), v.literal("category"), v.literal("threshold"));

const triggerOnValidator = v.union(
  v.literal("in_stock"),
  v.literal("price_drop"),
  v.literal("threshold_met"),
);

const metalTypeValidator = v.union(v.literal("gold"), v.literal("silver"));
const alertBatchWindowMinutes = 15;
const alertBatchMissingConfigDeferMinutes = 15;
const alertBatchMaxSendAttempts = 5;
const alertBatchRetryBaseDelayMinutes = 15;
const alertBatchRetryMaxDelayMinutes = 12 * 60;
const categoryWeightToleranceOz = 0.05;
const defaultPendingBatchProcessLimit = 25;
const UNSUBSCRIBE_TOKEN_SEPARATOR = ".";
const defaultReplyToEmail = "support@dashboard.gold";
const recentPriceDropWindowMs = 30 * 60 * 1000;
const resendSendEmailUrl = "https://api.resend.com/emails";

type AlertType = "category" | "sku" | "threshold";
type TriggerOn = "in_stock" | "price_drop" | "threshold_met";

interface AlertConfiguration {
  aboveSpotThreshold?: number;
  brand?: string;
  metalType?: "gold" | "silver";
  productId?: string;
  profitThreshold?: number;
  triggerOn: TriggerOn;
  type: AlertType;
  weight?: number;
}

interface TriggeredAlertProduct {
  productId: string;
  productName: string;
  reason: string;
}

type AlertBatchDoc = Doc<"alertBatches">;
type AlertHistoryDoc = Doc<"alertHistory">;

interface AlertDigestContent {
  html: string;
  subject: string;
  text: string;
}

interface AlertDeliveryConfig {
  apiKey: string;
  fromEmail: string;
  replyToEmail: string;
  siteUrl?: string;
}

interface SendAlertEmailArgs {
  html: string;
  subject: string;
  text: string;
  to: string;
  unsubscribeUrl?: string;
}

interface SendAlertEmailFailure {
  error: string;
  ok: false;
}

interface SendAlertEmailSuccess {
  id?: string;
  ok: true;
}

type SendAlertEmailResult = SendAlertEmailFailure | SendAlertEmailSuccess;

const requireAuth = async (ctx: MutationCtx | QueryCtx): Promise<string> => {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Authentication required");
  }
  return identity.subject;
};

const assertValidAlertConfiguration = (config: AlertConfiguration): void => {
  if (config.type === "sku" && !config.productId) {
    throw new Error("SKU alerts require productId");
  }

  if (config.type === "category") {
    if (!config.metalType && !config.weight && !config.brand) {
      throw new Error("Category alerts require at least one filter (metalType, weight, or brand)");
    }
    if (config.triggerOn === "threshold_met") {
      throw new Error("Category alerts cannot use triggerOn=threshold_met");
    }
  }

  if (config.type === "threshold") {
    if (config.aboveSpotThreshold === undefined && config.profitThreshold === undefined) {
      throw new Error("Threshold alerts require aboveSpotThreshold or profitThreshold");
    }
    if (config.triggerOn !== "threshold_met") {
      throw new Error("Threshold alerts must use triggerOn=threshold_met");
    }
  }

  if (config.weight !== undefined && config.weight <= 0) {
    throw new Error("weight must be greater than 0");
  }

  if (config.aboveSpotThreshold !== undefined && config.aboveSpotThreshold < 0) {
    throw new Error("aboveSpotThreshold must be >= 0");
  }

  if (config.profitThreshold !== undefined && config.profitThreshold < 0) {
    throw new Error("profitThreshold must be >= 0");
  }
};

const pauseEnabledAlertsForUser = async (
  ctx: MutationCtx,
  userId: string,
  pauseReason: AlertPauseReason,
): Promise<number> => {
  const enabledAlerts = await ctx.db
    .query("alerts")
    .withIndex("by_user_and_enabled", (q) => q.eq("userId", userId).eq("enabled", true))
    .collect();

  const pausedAt = Date.now();
  for (const alert of enabledAlerts) {
    await ctx.db.patch(alert._id, {
      enabled: false,
      pausedAt,
      pauseReason,
      updatedAt: pausedAt,
    });
  }

  return enabledAlerts.length;
};

const formatUsd = (value: number): string => `$${value.toFixed(2)}`;

const getEstimatedWeightOz = (product: {
  currentPrice: number;
  currentPricePerOunce: null | number;
}): number | undefined => {
  if (!product.currentPricePerOunce || product.currentPricePerOunce <= 0) {
    return undefined;
  }

  return product.currentPrice / product.currentPricePerOunce;
};

const getNextBatchScheduleTime = (timestamp: number): number => {
  const windowMs = alertBatchWindowMinutes * 60 * 1000;
  const currentWindowStart = Math.floor(timestamp / windowMs) * windowMs;
  return currentWindowStart + windowMs;
};

const getAlertBatchRetryDelayMs = (attemptNumber: number): number => {
  const baseDelayMs = alertBatchRetryBaseDelayMinutes * 60 * 1000;
  const maxDelayMs = alertBatchRetryMaxDelayMinutes * 60 * 1000;
  const exponentialDelayMs = baseDelayMs * 2 ** Math.max(0, attemptNumber - 1);
  return Math.min(exponentialDelayMs, maxDelayMs);
};

const getPendingAlertHistoryForBatch = async (
  ctx: MutationCtx,
  batch: AlertBatchDoc,
): Promise<AlertHistoryDoc[]> => {
  const windowMs = alertBatchWindowMinutes * 60 * 1000;
  const windowStart = batch.createdAt - windowMs;
  const windowEnd = batch.createdAt + windowMs;
  const alertIds = new Set(batch.alerts.map((entry) => entry.alertId));
  const pendingHistory = await ctx.db
    .query("alertHistory")
    .withIndex("by_user", (q) => q.eq("userId", batch.userId))
    .filter((q) =>
      q.and(
        q.eq(q.field("notificationSent"), false),
        q.gte(q.field("triggeredAt"), windowStart),
        q.lte(q.field("triggeredAt"), windowEnd),
      ),
    )
    .collect();

  return pendingHistory.filter((history) => alertIds.has(history.alertId));
};

const isAlertInCooldown = (
  alert: {
    cooldownMinutes: number;
    lastTriggered?: number;
  },
  timestamp: number,
): boolean => {
  if (!alert.lastTriggered) {
    return false;
  }

  const cooldownMs = alert.cooldownMinutes * 60 * 1000;
  return timestamp - alert.lastTriggered < cooldownMs;
};

const matchesCategoryFilters = (
  alert: {
    brand?: string;
    metalType?: "gold" | "silver";
    weight?: number;
  },
  product: {
    brand: null | string;
    currentPrice: number;
    currentPricePerOunce: null | number;
    metalType: "gold" | "silver";
  },
): boolean => {
  if (alert.metalType && product.metalType !== alert.metalType) {
    return false;
  }

  if (alert.brand) {
    if (!product.brand) {
      return false;
    }

    const alertBrand = alert.brand.trim().toLowerCase();
    const productBrand = product.brand.trim().toLowerCase();
    if (!productBrand.includes(alertBrand)) {
      return false;
    }
  }

  if (alert.weight !== undefined) {
    const estimatedWeight = getEstimatedWeightOz(product);
    if (!estimatedWeight) {
      return false;
    }

    if (Math.abs(estimatedWeight - alert.weight) > categoryWeightToleranceOz) {
      return false;
    }
  }

  return true;
};

const mergeAlertProducts = (
  existingProducts: TriggeredAlertProduct[],
  nextProducts: TriggeredAlertProduct[],
): TriggeredAlertProduct[] => {
  const productMap = new Map(existingProducts.map((product) => [product.productId, product]));

  for (const product of nextProducts) {
    productMap.set(product.productId, product);
  }

  return [...productMap.values()];
};

const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const formatAlertDigest = (
  batch: AlertBatchDoc,
  siteUrl?: string,
  unsubscribeUrl?: string,
): AlertDigestContent => {
  const totalProducts = batch.alerts.reduce(
    (count, alertEntry) => count + alertEntry.products.length,
    0,
  );
  const pluralizedProducts = totalProducts === 1 ? "item" : "items";
  const subject = `Dashboard.Gold: ${totalProducts} ${pluralizedProducts} triggered`;
  const manageAlertsUrl = siteUrl ? `${siteUrl.replace(/\/+$/, "")}/alerts` : undefined;
  const dashboardUrl = siteUrl ? `${siteUrl.replace(/\/+$/, "")}/dashboard` : undefined;

  // --- Plain text version ---
  const textLines: string[] = [
    "Dashboard.Gold Alert Digest",
    "=".repeat(30),
    "",
    `${totalProducts} ${pluralizedProducts} triggered your alerts.`,
    "",
  ];

  for (const alertEntry of batch.alerts) {
    textLines.push(`${alertEntry.alertName}:`);
    for (const product of alertEntry.products) {
      textLines.push(`  - ${product.productName}: ${product.reason}`);
    }
    textLines.push("");
  }

  if (dashboardUrl) {
    textLines.push(`View dashboard: ${dashboardUrl}`);
  }
  if (manageAlertsUrl) {
    textLines.push(`Manage alerts: ${manageAlertsUrl}`);
  }
  if (unsubscribeUrl) {
    textLines.push(`Unsubscribe from all alerts: ${unsubscribeUrl}`);
  }

  // --- HTML version ---
  const alertSectionsHtml: string[] = [];

  for (const alertEntry of batch.alerts) {
    const rows = alertEntry.products
      .map(
        (product) =>
          `<tr>
<td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:14px;">${escapeHtml(product.productName)}</td>
<td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:14px;color:#b8860b;white-space:nowrap;">${escapeHtml(product.reason)}</td>
</tr>`,
      )
      .join("");

    alertSectionsHtml.push(
      `<div style="margin-bottom:20px;">
<h3 style="margin:0 0 8px;font-size:15px;font-weight:600;color:#333;">${escapeHtml(alertEntry.alertName)}</h3>
<table style="width:100%;border-collapse:collapse;background:#fff;border:1px solid #e5e5e5;border-radius:6px;">
<thead><tr>
<th style="padding:8px 12px;text-align:left;font-size:12px;font-weight:600;color:#666;border-bottom:2px solid #e5e5e5;text-transform:uppercase;letter-spacing:0.5px;">Product</th>
<th style="padding:8px 12px;text-align:left;font-size:12px;font-weight:600;color:#666;border-bottom:2px solid #e5e5e5;text-transform:uppercase;letter-spacing:0.5px;">Trigger</th>
</tr></thead>
<tbody>${rows}</tbody>
</table>
</div>`,
    );
  }

  const footerLinks: string[] = [];
  if (dashboardUrl) {
    footerLinks.push(
      `<a href="${dashboardUrl}" style="color:#b8860b;text-decoration:none;">View Dashboard</a>`,
    );
  }
  if (manageAlertsUrl) {
    footerLinks.push(
      `<a href="${manageAlertsUrl}" style="color:#b8860b;text-decoration:none;">Manage Alerts</a>`,
    );
  }
  if (unsubscribeUrl) {
    footerLinks.push(
      `<a href="${unsubscribeUrl}" style="color:#999;text-decoration:none;">Unsubscribe</a>`,
    );
  }

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f5f5f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:20px;">

<div style="text-align:center;padding:24px 0 16px;">
<h1 style="margin:0;font-size:22px;font-weight:700;color:#b8860b;letter-spacing:-0.5px;">Dashboard.Gold</h1>
</div>

<div style="background:#ffffff;border-radius:8px;border:1px solid #e5e5e5;padding:24px;margin-bottom:16px;">
<p style="margin:0 0 16px;font-size:15px;color:#333;">
${totalProducts} ${pluralizedProducts} triggered your alerts.
</p>
${alertSectionsHtml.join("")}
${dashboardUrl ? `<div style="text-align:center;margin-top:20px;"><a href="${dashboardUrl}" style="display:inline-block;background:#b8860b;color:#fff;padding:10px 24px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:500;">View Dashboard</a></div>` : ""}
</div>

<div style="text-align:center;padding:16px 0;font-size:12px;color:#999;">
${footerLinks.join(' <span style="color:#ccc;">&middot;</span> ')}
</div>

</div>
</body></html>`;

  return {
    html,
    subject,
    text: textLines.join("\n").trim(),
  };
};

const getAlertDeliveryConfig = (): AlertDeliveryConfig | null => {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !fromEmail) {
    return null;
  }

  const configuredReplyToEmail = process.env.RESEND_REPLY_TO_EMAIL?.trim();
  const replyToEmail =
    configuredReplyToEmail && configuredReplyToEmail.length > 0
      ? configuredReplyToEmail
      : defaultReplyToEmail;
  const siteUrl = process.env.SITE_URL;
  return {
    apiKey,
    fromEmail,
    replyToEmail,
    siteUrl,
  };
};

const resolveAlertRecipientEmail = async (
  ctx: ActionCtx,
  userId: string,
): Promise<string | undefined> => {
  const subscriptions = await ctx.runQuery(components.stripe.public.listSubscriptionsByUserId, {
    userId,
  });

  let subscription: (typeof subscriptions)[number] | undefined;
  for (const candidate of subscriptions) {
    if (candidate.status !== "active" && candidate.status !== "trialing") {
      continue;
    }

    if (!subscription || candidate.currentPeriodEnd > subscription.currentPeriodEnd) {
      subscription = candidate;
    }
  }

  if (subscription === undefined) {
    return undefined;
  }

  const customer = await ctx.runQuery(components.stripe.public.getCustomer, {
    stripeCustomerId: subscription.stripeCustomerId,
  });

  const email = customer?.email?.trim();
  if (!email) {
    return undefined;
  }
  return email;
};

const buildUnsubscribeUrl = async (userId: string): Promise<null | string> => {
  const secret = process.env.UNSUBSCRIBE_SECRET;
  const convexUrl = process.env.CONVEX_SITE_URL;
  if (!secret || !convexUrl) {
    return null;
  }

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { hash: "SHA-256", name: "HMAC" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(userId));
  const signatureHex = [...new Uint8Array(signature)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const token = `${userId}${UNSUBSCRIBE_TOKEN_SEPARATOR}${signatureHex}`;
  return `${convexUrl.replace(/\/+$/, "")}/unsubscribe?token=${encodeURIComponent(token)}`;
};

const sendAlertEmail = async (
  config: AlertDeliveryConfig,
  args: SendAlertEmailArgs,
): Promise<SendAlertEmailResult> => {
  try {
    const emailHeaders: Record<string, string> = {};

    if (args.unsubscribeUrl) {
      // RFC 8058 one-click unsubscribe
      emailHeaders["List-Unsubscribe"] =
        `<${args.unsubscribeUrl}>, <mailto:${config.replyToEmail}?subject=unsubscribe>`;
      emailHeaders["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click";
    } else {
      // Fallback: mailto + manage alerts page
      const unsubscribeDestinations = [`<mailto:${config.replyToEmail}?subject=unsubscribe>`];
      if (config.siteUrl) {
        unsubscribeDestinations.push(`<${config.siteUrl.replace(/\/+$/, "")}/alerts>`);
      }
      emailHeaders["List-Unsubscribe"] = unsubscribeDestinations.join(", ");
    }

    const response = await fetch(resendSendEmailUrl, {
      body: JSON.stringify({
        from: config.fromEmail,
        headers: emailHeaders,
        html: args.html,
        reply_to: config.replyToEmail,
        subject: args.subject,
        text: args.text,
        to: [args.to],
      }),
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    const body = (await response.json().catch(() => null)) as null | {
      error?: string;
      id?: string;
      message?: string;
    };

    if (!response.ok) {
      const failureMessage =
        body?.message ?? body?.error ?? `${response.status} ${response.statusText}`;
      return {
        error: `Resend send failed: ${failureMessage}`,
        ok: false,
      };
    }

    return {
      id: body?.id,
      ok: true,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unknown send failure",
      ok: false,
    };
  }
};

export const getAlerts = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuth(ctx);

    const alerts = await ctx.db
      .query("alerts")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    return alerts.toSorted((a, b) => b.updatedAt - a.updatedAt);
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
    const userId = await requireAuth(ctx);
    const { alertEntitlements } = await getUserAlertEntitlements(ctx, userId);

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
      userId,
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
    const userId = await requireAuth(ctx);

    const alert = await ctx.db.get(args.alertId);
    if (alert?.userId !== userId) {
      throw new Error("Alert not found");
    }

    const { alertEntitlements } = await getUserAlertEntitlements(ctx, userId);
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
    const userId = await requireAuth(ctx);

    const alert = await ctx.db.get(args.alertId);
    if (alert?.userId !== userId) {
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
    const userId = await requireAuth(ctx);
    const { alertEntitlements } = await getUserAlertEntitlements(ctx, userId);

    if (!alertEntitlements.shouldPauseEnabledAlerts || !alertEntitlements.pauseReason) {
      return { pausedCount: 0, success: true };
    }

    const pausedCount = await pauseEnabledAlertsForUser(ctx, userId, alertEntitlements.pauseReason);

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
    const enabledAlerts = await ctx.db
      .query("alerts")
      .withIndex("by_user_and_enabled", (q) => q.eq("userId", args.userId).eq("enabled", true))
      .collect();

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

    const products = (
      await Promise.all(
        uniqueProductIds.map((productId) =>
          ctx.db
            .query("costcoProducts")
            .withIndex("by_product_id", (q) => q.eq("productId", productId))
            .first(),
        ),
      )
    ).filter((product) => product !== null);

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
    const pureProducts = (
      await Promise.all(
        pureProductIds.map((pureProductId) =>
          ctx.db
            .query("pureProducts")
            .withIndex("by_pure_id", (q) => q.eq("pureProductId", pureProductId))
            .first(),
        ),
      )
    ).filter((product) => product !== null);

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

      let canSendAlerts = sendEntitlementByUser.get(alert.userId);
      if (canSendAlerts === undefined) {
        const { alertEntitlements } = await getUserAlertEntitlements(ctx, alert.userId);
        canSendAlerts = alertEntitlements.canSendAlerts;
        sendEntitlementByUser.set(alert.userId, canSendAlerts);
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
      });

      await ctx.db.patch(alert._id, {
        lastTriggered: timestamp,
        updatedAt: timestamp,
      });

      let pendingBatch = pendingBatchByUser.get(alert.userId);
      if (pendingBatch === undefined) {
        pendingBatch = await ctx.db
          .query("alertBatches")
          .withIndex("by_user", (q) => q.eq("userId", alert.userId))
          .filter((q) =>
            q.and(q.eq(q.field("scheduledFor"), scheduleTime), q.eq(q.field("sent"), false)),
          )
          .first();
        pendingBatchByUser.set(alert.userId, pendingBatch ?? null);
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
        pendingBatchByUser.set(alert.userId, {
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
        });

        queueInserts++;
        const insertedBatch = await ctx.db.get(batchId);
        pendingBatchByUser.set(alert.userId, insertedBatch);
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

    return await ctx.db
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

      const permissions = await ctx.runQuery(internal.alerts.getUserSendAlertPermissions, {
        userId: batch.userId,
      });
      if (!permissions.alertEntitlements.canSendAlerts) {
        skippedByEntitlement++;
        await ctx.runMutation(internal.alerts.markAlertBatchProcessed, {
          batchId: batch._id,
          errorMessage: `Skipped: subscription status ${permissions.status} cannot receive alerts`,
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

      const recipientEmail = await resolveAlertRecipientEmail(ctx, batch.userId);
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

      const unsubscribeUrl = await buildUnsubscribeUrl(batch.userId);
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
