import { v } from "convex/values";

import { components } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import type { ActionCtx, MutationCtx, QueryCtx } from "../_generated/server";
import { type AuthUserIdentity } from "../lib/authIdentity";
import { takeWithLimit } from "../lib/queries";
import { type AlertPauseReason } from "../stripeUtils";
import { listSubscriptionsForIdentity } from "../subscriptionEntitlements";

export const alertTypeValidator = v.union(
  v.literal("sku"),
  v.literal("category"),
  v.literal("threshold"),
);

export const triggerOnValidator = v.union(
  v.literal("in_stock"),
  v.literal("price_drop"),
  v.literal("threshold_met"),
);

export const metalTypeValidator = v.union(v.literal("gold"), v.literal("silver"));
export const alertBatchWindowMinutes = 15;
export const alertBatchMissingConfigDeferMinutes = 15;
export const alertBatchMaxSendAttempts = 5;
export const alertBatchRetryBaseDelayMinutes = 15;
export const alertBatchRetryMaxDelayMinutes = 12 * 60;
export const categoryWeightToleranceOz = 0.05;
export const defaultPendingBatchProcessLimit = 25;
export const unsubscribeTokenSeparator = ".";
export const defaultReplyToEmail = "support@dashboard.gold";
export const maxAlertProductOptions = 2000;
export const recentPriceDropWindowMs = 30 * 60 * 1000;
export const resendSendEmailUrl = "https://api.resend.com/emails";

// Canonical source. Duplicated in app/routes/alerts/form/types.ts — keep in sync.
export type AlertType = "category" | "sku" | "threshold";
export type TriggerOn = "in_stock" | "price_drop" | "threshold_met";

export interface AlertConfiguration {
  aboveSpotThreshold?: number;
  brand?: string;
  metalType?: "gold" | "silver";
  productId?: string;
  profitThreshold?: number;
  triggerOn: TriggerOn;
  type: AlertType;
  weight?: number;
}

export interface TriggeredAlertProduct {
  productId: string;
  productName: string;
  reason: string;
}

export type AlertBatchDoc = Doc<"alertBatches">;
export type AlertHistoryDoc = Doc<"alertHistory">;
export type AlertDoc = Doc<"alerts">;

export interface AlertDigestContent {
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

export type SendAlertEmailResult = SendAlertEmailFailure | SendAlertEmailSuccess;

interface UserOwnedRecord {
  userId: string;
  userTokenIdentifier: string;
}

export const listAlertsForIdentity = async (
  ctx: MutationCtx | QueryCtx,
  identity: AuthUserIdentity,
): Promise<AlertDoc[]> => {
  return ctx.db
    .query("alerts")
    .withIndex("by_user_token_identifier", (q) =>
      q.eq("userTokenIdentifier", identity.tokenIdentifier),
    )
    .collect();
};

export const getEnabledAlertsForIdentity = async (
  ctx: MutationCtx,
  identity: AuthUserIdentity,
): Promise<AlertDoc[]> => {
  return ctx.db
    .query("alerts")
    .withIndex("by_user_token_identifier_and_enabled", (q) =>
      q.eq("userTokenIdentifier", identity.tokenIdentifier).eq("enabled", true),
    )
    .collect();
};

export const getEnabledAlertsForUserKey = async (
  ctx: MutationCtx,
  userKey: string,
): Promise<AlertDoc[]> => {
  const alertsByLegacyKey = await ctx.db
    .query("alerts")
    .withIndex("by_user_and_enabled", (q) => q.eq("userId", userKey).eq("enabled", true))
    .collect();

  const alertsByTokenKey = await ctx.db
    .query("alerts")
    .withIndex("by_user_token_identifier_and_enabled", (q) =>
      q.eq("userTokenIdentifier", userKey).eq("enabled", true),
    )
    .collect();

  const alerts = new Map(alertsByLegacyKey.map((alert) => [alert._id, alert]));
  for (const alert of alertsByTokenKey) {
    alerts.set(alert._id, alert);
  }

  return [...alerts.values()];
};

export const isAlertOwnedByIdentity = (alert: AlertDoc, identity: AuthUserIdentity): boolean =>
  alert.userTokenIdentifier === identity.tokenIdentifier;

export const getStoredUserKey = (record: UserOwnedRecord): string => record.userTokenIdentifier;

export const getStoredIdentity = (record: UserOwnedRecord): AuthUserIdentity => ({
  subject: record.userId,
  tokenIdentifier: record.userTokenIdentifier,
});

export const listPendingAlertHistoryForUserKey = async (
  ctx: MutationCtx,
  userKey: string,
  windowStart: number,
  windowEnd: number,
): Promise<AlertHistoryDoc[]> => {
  const historyByLegacyKey = await ctx.db
    .query("alertHistory")
    .withIndex("by_user_notification_sent_and_triggered", (q) =>
      q
        .eq("userId", userKey)
        .eq("notificationSent", false)
        .gte("triggeredAt", windowStart)
        .lte("triggeredAt", windowEnd),
    )
    .collect();

  const historyByTokenKey = await ctx.db
    .query("alertHistory")
    .withIndex("by_user_token_identifier_notification_sent_and_triggered", (q) =>
      q
        .eq("userTokenIdentifier", userKey)
        .eq("notificationSent", false)
        .gte("triggeredAt", windowStart)
        .lte("triggeredAt", windowEnd),
    )
    .collect();

  const history = new Map(historyByLegacyKey.map((entry) => [entry._id, entry]));
  for (const entry of historyByTokenKey) {
    history.set(entry._id, entry);
  }

  return [...history.values()];
};

export const findPendingBatchForUserKey = async (
  ctx: MutationCtx,
  userKey: string,
  scheduleTime: number,
): Promise<AlertBatchDoc | null> => {
  const batchesByLegacyKey = await ctx.db
    .query("alertBatches")
    .withIndex("by_user_pending_schedule", (q) =>
      q.eq("userId", userKey).eq("sent", false).eq("scheduledFor", scheduleTime),
    )
    .collect();

  const batchesByTokenKey = await ctx.db
    .query("alertBatches")
    .withIndex("by_user_token_identifier_pending_schedule", (q) =>
      q.eq("userTokenIdentifier", userKey).eq("sent", false).eq("scheduledFor", scheduleTime),
    )
    .collect();

  const batches = new Map(batchesByLegacyKey.map((batch) => [batch._id, batch]));
  for (const batch of batchesByTokenKey) {
    batches.set(batch._id, batch);
  }

  return [...batches.values()][0] ?? null;
};

export const assertValidAlertConfiguration = (config: AlertConfiguration): void => {
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

export const pauseEnabledAlertsForUser = async (
  ctx: MutationCtx,
  userKey: string,
  pauseReason: AlertPauseReason,
): Promise<number> => {
  const enabledAlerts = await getEnabledAlertsForUserKey(ctx, userKey);

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

export const pauseEnabledAlertsForIdentity = async (
  ctx: MutationCtx,
  identity: AuthUserIdentity,
  pauseReason: AlertPauseReason,
): Promise<number> => {
  const enabledAlerts = await getEnabledAlertsForIdentity(ctx, identity);

  const pausedAt = Date.now();
  for (const alert of enabledAlerts) {
    await ctx.db.patch(alert._id, {
      enabled: false,
      pausedAt,
      pauseReason,
      updatedAt: pausedAt,
      userId: identity.subject,
      userTokenIdentifier: identity.tokenIdentifier,
    });
  }

  return enabledAlerts.length;
};

export const formatUsd = (value: number): string => `$${value.toFixed(2)}`;

export const getEstimatedWeightOz = (product: {
  currentPrice: number;
  currentPricePerOunce: null | number;
}): number | undefined => {
  if (!product.currentPricePerOunce || product.currentPricePerOunce <= 0) {
    return undefined;
  }

  return product.currentPrice / product.currentPricePerOunce;
};

export const getNextBatchScheduleTime = (timestamp: number): number => {
  const windowMs = alertBatchWindowMinutes * 60 * 1000;
  const currentWindowStart = Math.floor(timestamp / windowMs) * windowMs;
  return currentWindowStart + windowMs;
};

export const getAlertBatchRetryDelayMs = (attemptNumber: number): number => {
  const baseDelayMs = alertBatchRetryBaseDelayMinutes * 60 * 1000;
  const maxDelayMs = alertBatchRetryMaxDelayMinutes * 60 * 1000;
  const exponentialDelayMs = baseDelayMs * 2 ** Math.max(0, attemptNumber - 1);
  return Math.min(exponentialDelayMs, maxDelayMs);
};

export const getPendingAlertHistoryForBatch = async (
  ctx: MutationCtx,
  batch: AlertBatchDoc,
): Promise<AlertHistoryDoc[]> => {
  const windowMs = alertBatchWindowMinutes * 60 * 1000;
  const windowStart = batch.createdAt - windowMs;
  const windowEnd = batch.createdAt + windowMs;
  const alertIds = new Set(batch.alerts.map((entry) => entry.alertId));
  const pendingHistory = await listPendingAlertHistoryForUserKey(
    ctx,
    getStoredUserKey(batch),
    windowStart,
    windowEnd,
  );

  return pendingHistory.filter((history) => alertIds.has(history.alertId));
};

export const isAlertInCooldown = (
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

export const matchesCategoryFilters = (
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

export const mergeAlertProducts = (
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

export const formatAlertDigest = (
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

export const getAlertDeliveryConfig = (): AlertDeliveryConfig | null => {
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

export const resolveAlertRecipientEmail = async (
  ctx: ActionCtx,
  identity: AuthUserIdentity | string,
): Promise<string | undefined> => {
  const subscriptions = await listSubscriptionsForIdentity(ctx, identity);

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

export const buildUnsubscribeUrl = async (userId: string): Promise<null | string> => {
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
  const token = `${userId}${unsubscribeTokenSeparator}${signatureHex}`;
  return `${convexUrl.replace(/\/+$/, "")}/unsubscribe?token=${encodeURIComponent(token)}`;
};

export const sendAlertEmail = async (
  config: AlertDeliveryConfig,
  args: SendAlertEmailArgs,
): Promise<SendAlertEmailResult> => {
  try {
    const emailHeaders: Record<string, string> = {};

    if (args.unsubscribeUrl) {
      emailHeaders["List-Unsubscribe"] =
        `<${args.unsubscribeUrl}>, <mailto:${config.replyToEmail}?subject=unsubscribe>`;
      emailHeaders["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click";
    } else {
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

export const takeAlertProductOptions = async (ctx: QueryCtx) => {
  const productOptions = await takeWithLimit(
    () => ctx.db.query("alertProductOptions").take(maxAlertProductOptions + 1),
    maxAlertProductOptions,
    "alert product options",
  );

  return productOptions
    .map((product) => ({
      metalType: product.metalType,
      name: product.name,
      productId: product.productId,
    }))
    .toSorted((a, b) => a.name.localeCompare(b.name));
};
