import { v } from "convex/values";

import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import {
  type ActionCtx,
  type QueryCtx,
  action,
  internalAction,
  internalQuery,
} from "./_generated/server";
import {
  buildUnsubscribeUrl,
  formatUsd,
  getAlertDeliveryConfig,
  resolveAlertRecipientEmail,
  sendAlertEmail,
} from "./alerts/core";
import { requireAuthIdentity } from "./lib/authIdentity";
import { getUserAlertEntitlements } from "./subscriptionEntitlements";

// Cron fires once per UTC day at 15:00 — see convex/crons.ts.
// 23h dedupe window leaves slack for cron drift between runs.
const dailyDedupeWindowMs = 23 * 60 * 60 * 1000;

export const digestFrequencyValidator = v.union(
  v.literal("off"),
  v.literal("daily"),
  v.literal("weekly"),
);

export type DigestFrequency = "daily" | "off" | "weekly";

export interface DigestProductRow {
  bidPerOunce: null | number;
  markupPercent: null | number;
  metalType: "gold" | "silver";
  pricePerOunce: null | number;
  productName: string;
  spreadPercent: null | number;
  thumbnail: null | string;
  totalPrice: number;
  url: string;
}

export interface DigestSpotPrice {
  gold: null | number;
  silver: null | number;
}

export interface MarketDigestContent {
  html: string;
  subject: string;
  text: string;
}

const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const formatPercent = (value: null | number): string =>
  value === null ? "—" : `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;

const formatPerOunce = (value: null | number): string => (value === null ? "—" : formatUsd(value));

const titleCase = (value: string): string => value.charAt(0).toUpperCase() + value.slice(1);

const renderSpotBanner = (spotByMetal: DigestSpotPrice): string => {
  const parts: string[] = [];
  if (spotByMetal.gold !== null) {
    parts.push(
      `Gold spot <strong class="dg-text" style="color:#333;">${formatUsd(spotByMetal.gold)}/oz</strong>`,
    );
  }
  if (spotByMetal.silver !== null) {
    parts.push(
      `Silver spot <strong class="dg-text" style="color:#333;">${formatUsd(spotByMetal.silver)}/oz</strong>`,
    );
  }
  if (parts.length === 0) return "";
  return `<div class="dg-meta" style="text-align:center;padding:0 0 16px;font-size:12px;color:#888;">${parts.join(' <span class="dg-divider" style="color:#ccc;">&middot;</span> ')}</div>`;
};

export const buildDigestRowsFromProducts = (
  products: Doc<"costcoProducts">[],
  pureTotalBidByProductId: Map<string, null | number>,
  fallbackBidByMetal: Map<"gold" | "silver", null | number>,
  spotByMetal: DigestSpotPrice,
): DigestProductRow[] => {
  const rows: DigestProductRow[] = [];
  for (const product of products) {
    if (!product.currentInStock) continue;

    // Derive product weight from costco-side numbers — pureProducts.currentBidPricePerOz can be
    // stale or wrong for individual products, so we always recompute per-oz from total bid here.
    const pricePerOunce = product.currentPricePerOunce ?? null;
    const weightOz =
      pricePerOunce && pricePerOunce > 0 ? product.currentPrice / pricePerOunce : null;

    const matchedTotalBid = product.pureProductId
      ? (pureTotalBidByProductId.get(product.pureProductId) ?? null)
      : null;
    const matchedBidPerOz =
      matchedTotalBid !== null && weightOz && weightOz > 0 ? matchedTotalBid / weightOz : null;
    const fallbackBid = fallbackBidByMetal.get(product.metalType) ?? null;
    const bid = matchedBidPerOz ?? fallbackBid;

    // Markup is vs spot (matches the dashboard's "% markup"), not vs Pure bid.
    const spot = spotByMetal[product.metalType];
    const markup =
      spot && spot > 0 && pricePerOunce !== null ? ((pricePerOunce - spot) / spot) * 100 : null;

    // Spread vs Pure bid relative to price — matches dashboard's pureSpreadPercentage sort key.
    const spreadPercent =
      bid && pricePerOunce && pricePerOunce > 0
        ? ((pricePerOunce - bid) / pricePerOunce) * 100
        : null;

    rows.push({
      bidPerOunce: bid,
      markupPercent: markup,
      metalType: product.metalType,
      pricePerOunce,
      productName: product.name,
      spreadPercent,
      thumbnail: product.thumbnail ?? null,
      totalPrice: product.currentPrice,
      url: product.url,
    });
  }

  return rows.toSorted((a, b) => {
    if (a.metalType !== b.metalType) return a.metalType.localeCompare(b.metalType);
    const aSpread = a.spreadPercent ?? 999;
    const bSpread = b.spreadPercent ?? 999;
    return aSpread - bSpread;
  });
};

export const formatMarketDigest = (
  rows: DigestProductRow[],
  args: {
    frequency: DigestFrequency;
    siteUrl?: string;
    spotByMetal?: DigestSpotPrice;
    unsubscribeUrl?: string;
  },
): MarketDigestContent => {
  const cadenceLabel = args.frequency === "weekly" ? "Weekly" : "Daily";
  const totalCount = rows.length;
  const itemsLabel = totalCount === 1 ? "item" : "items";
  const subject = `Dashboard.Gold ${cadenceLabel} Digest: ${totalCount} ${itemsLabel} in stock`;

  const dashboardUrl = args.siteUrl ? `${args.siteUrl.replace(/\/+$/, "")}/dashboard` : undefined;
  const alertsUrl = args.siteUrl ? `${args.siteUrl.replace(/\/+$/, "")}/alerts` : undefined;

  const byMetal = new Map<"gold" | "silver", DigestProductRow[]>();
  for (const row of rows) {
    const list = byMetal.get(row.metalType) ?? [];
    list.push(row);
    byMetal.set(row.metalType, list);
  }

  const textLines: string[] = [
    `Dashboard.Gold ${cadenceLabel} Digest`,
    "=".repeat(30),
    "",
    `${totalCount} ${itemsLabel} currently in stock at Costco.`,
    "",
  ];

  for (const [metal, metalRows] of byMetal) {
    textLines.push(`${titleCase(metal)} (${metalRows.length}):`);
    for (const row of metalRows) {
      textLines.push(
        `  - ${row.productName} — ${formatUsd(row.totalPrice)} (${formatPerOunce(row.pricePerOunce)}/oz, bid ${formatPerOunce(row.bidPerOunce)}/oz, markup ${formatPercent(row.markupPercent)})`,
      );
    }
    textLines.push("");
  }

  if (dashboardUrl) textLines.push(`View dashboard: ${dashboardUrl}`);
  if (alertsUrl) textLines.push(`Manage digest: ${alertsUrl}`);
  if (args.unsubscribeUrl) textLines.push(`Stop receiving this digest: ${args.unsubscribeUrl}`);

  const sections: string[] = [];
  for (const [metal, metalRows] of byMetal) {
    const rowsHtml = metalRows
      .map((row) => {
        const markupColor =
          row.markupPercent === null
            ? "#666"
            : row.markupPercent <= 0
              ? "#16a34a"
              : row.markupPercent < 3
                ? "#b8860b"
                : row.markupPercent < 6
                  ? "#666"
                  : "#b91c1c";
        const productLink = row.url
          ? `<a href="${escapeHtml(row.url)}" style="color:#b8860b;text-decoration:none;">${escapeHtml(row.productName)}</a>`
          : escapeHtml(row.productName);
        const thumbCell = row.thumbnail
          ? `<img src="${escapeHtml(row.thumbnail)}" alt="" width="40" height="40" style="display:block;width:40px;height:40px;border-radius:6px;border:1px solid #e5e5e5;object-fit:cover;background:#fafafa;" />`
          : `<div style="width:40px;height:40px;border-radius:6px;background:#f5f5f0;border:1px solid #e5e5e5;"></div>`;
        return `<tr>
<td class="dg-cell" style="padding:8px 0 8px 12px;border-bottom:1px solid #f0f0f0;width:40px;vertical-align:middle;">${thumbCell}</td>
<td class="dg-cell" style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:14px;vertical-align:middle;">${productLink}</td>
<td class="dg-cell" style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:14px;text-align:right;white-space:nowrap;vertical-align:middle;">${formatUsd(row.totalPrice)}</td>
<td class="dg-cell dg-muted" style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:14px;text-align:right;white-space:nowrap;vertical-align:middle;">${formatPerOunce(row.pricePerOunce)}</td>
<td class="dg-cell dg-muted" style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:14px;text-align:right;white-space:nowrap;vertical-align:middle;">${formatPerOunce(row.bidPerOunce)}</td>
<td class="dg-cell" style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:14px;text-align:right;white-space:nowrap;color:${markupColor};vertical-align:middle;font-weight:600;">${formatPercent(row.markupPercent)}</td>
</tr>`;
      })
      .join("");

    sections.push(
      `<div style="margin-bottom:24px;">
<h3 class="dg-section" style="margin:0 0 8px;font-size:15px;font-weight:600;color:#333;">${titleCase(metal)} <span style="color:#999;font-weight:400;">(${metalRows.length})</span></h3>
<table class="dg-table" style="width:100%;border-collapse:collapse;background:#fff;border:1px solid #e5e5e5;border-radius:6px;">
<thead><tr>
<th class="dg-th" style="padding:8px 0 8px 12px;text-align:left;font-size:11px;font-weight:600;color:#666;border-bottom:2px solid #e5e5e5;text-transform:uppercase;letter-spacing:0.5px;width:40px;"></th>
<th class="dg-th" style="padding:8px 12px;text-align:left;font-size:11px;font-weight:600;color:#666;border-bottom:2px solid #e5e5e5;text-transform:uppercase;letter-spacing:0.5px;">Product</th>
<th class="dg-th" style="padding:8px 12px;text-align:right;font-size:11px;font-weight:600;color:#666;border-bottom:2px solid #e5e5e5;text-transform:uppercase;letter-spacing:0.5px;">Price</th>
<th class="dg-th" style="padding:8px 12px;text-align:right;font-size:11px;font-weight:600;color:#666;border-bottom:2px solid #e5e5e5;text-transform:uppercase;letter-spacing:0.5px;">$/oz</th>
<th class="dg-th" style="padding:8px 12px;text-align:right;font-size:11px;font-weight:600;color:#666;border-bottom:2px solid #e5e5e5;text-transform:uppercase;letter-spacing:0.5px;">Bid/oz</th>
<th class="dg-th" style="padding:8px 12px;text-align:right;font-size:11px;font-weight:600;color:#666;border-bottom:2px solid #e5e5e5;text-transform:uppercase;letter-spacing:0.5px;">vs Spot</th>
</tr></thead>
<tbody>${rowsHtml}</tbody>
</table>
</div>`,
    );
  }

  if (sections.length === 0) {
    sections.push(
      `<p style="margin:0;font-size:14px;color:#666;">Nothing currently in stock. We'll let you know when that changes.</p>`,
    );
  }

  const footerLinks: string[] = [];
  if (dashboardUrl) {
    footerLinks.push(
      `<a href="${dashboardUrl}" style="color:#b8860b;text-decoration:none;">View Dashboard</a>`,
    );
  }
  if (alertsUrl) {
    footerLinks.push(
      `<a href="${alertsUrl}" style="color:#b8860b;text-decoration:none;">Digest Settings</a>`,
    );
  }
  if (args.unsubscribeUrl) {
    footerLinks.push(
      `<a href="${args.unsubscribeUrl}" style="color:#999;text-decoration:none;">Unsubscribe</a>`,
    );
  }

  const spotBanner = args.spotByMetal ? renderSpotBanner(args.spotByMetal) : "";

  const html = `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<style>
  @media (prefers-color-scheme: dark) {
    body, .dg-body { background-color: #0f0f0e !important; }
    .dg-card { background-color: #1a1a17 !important; border-color: #2b2b27 !important; }
    .dg-table { background-color: #1a1a17 !important; border-color: #2b2b27 !important; }
    .dg-cell { border-color: #2b2b27 !important; color: #e5e5e5 !important; }
    .dg-th { color: #999 !important; border-color: #2b2b27 !important; }
    .dg-section, .dg-text, .dg-brand { color: #f5f5f0 !important; }
    .dg-muted { color: #a3a3a3 !important; }
    .dg-meta, .dg-footer { color: #888 !important; }
    .dg-divider { color: #444 !important; }
    .dg-thumb-empty { background: #1f1f1c !important; border-color: #2b2b27 !important; }
  }
</style>
</head>
<body class="dg-body" style="margin:0;padding:0;background-color:#f5f5f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:680px;margin:0 auto;padding:20px;">

<div style="text-align:center;padding:24px 0 12px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;border-collapse:collapse;">
<tr>
<td style="vertical-align:middle;padding-right:10px;">
<div style="width:40px;height:40px;border-radius:8px;background:linear-gradient(135deg,#facc15,#eab308,#ca8a04);box-shadow:0 1px 3px rgba(202,138,4,0.3);text-align:center;line-height:40px;">
<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#422006" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;">
<rect x="3" y="5" width="18" height="14" rx="2"/>
<path d="M7 9h10M7 12h10M7 15h10"/>
</svg>
</div>
</td>
<td style="vertical-align:middle;text-align:left;">
<div class="dg-brand" style="font-size:22px;font-weight:700;letter-spacing:-0.5px;color:#1a1a1a;line-height:1;">Dashboard<span style="color:#b8860b;">.Gold</span></div>
<div class="dg-meta" style="font-size:11px;color:#888;line-height:1;margin-top:4px;">${cadenceLabel} digest</div>
</td>
</tr>
</table>
</div>

${spotBanner}

<div class="dg-card" style="background:#ffffff;border-radius:8px;border:1px solid #e5e5e5;padding:24px;margin-bottom:16px;">
<p class="dg-text" style="margin:0 0 16px;font-size:14px;color:#333;">
${totalCount} ${itemsLabel} currently in stock. Sorted by best deal first.
</p>
${sections.join("")}
</div>

<div class="dg-footer" style="text-align:center;padding:16px 0;font-size:12px;color:#999;">
${footerLinks.join(' <span class="dg-divider" style="color:#ccc;">&middot;</span> ')}
</div>

</div>
</body></html>`;

  return {
    html,
    subject,
    text: textLines.join("\n").trim(),
  };
};

export interface DigestEligibilityArgs {
  evaluatedAtUtc: number;
  lastSentAt?: number;
  weeklyDayOfWeek: number;
}

export const isDigestEligibleNow = (
  frequency: DigestFrequency,
  args: DigestEligibilityArgs,
): boolean => {
  if (frequency === "off") return false;
  if (args.lastSentAt && args.evaluatedAtUtc - args.lastSentAt < dailyDedupeWindowMs) {
    return false;
  }
  if (frequency === "daily") return true;

  const dayOfWeek = new Date(args.evaluatedAtUtc).getUTCDay();
  return dayOfWeek === args.weeklyDayOfWeek;
};

const collectDigestRowsForActiveProducts = async (ctx: QueryCtx) => {
  const goldInStock = await ctx.db
    .query("costcoProducts")
    .withIndex("by_metal_and_stock", (q) => q.eq("metalType", "gold").eq("currentInStock", true))
    .collect();
  const silverInStock = await ctx.db
    .query("costcoProducts")
    .withIndex("by_metal_and_stock", (q) => q.eq("metalType", "silver").eq("currentInStock", true))
    .collect();
  const products = [...goldInStock, ...silverInStock];

  const pureProductIds = [
    ...new Set(
      products
        .map((product) => product.pureProductId)
        .filter((id): id is string => typeof id === "string" && id.length > 0),
    ),
  ];
  const pureProducts = (
    await Promise.all(
      pureProductIds.map((id) =>
        ctx.db
          .query("pureProducts")
          .withIndex("by_pure_id", (q) => q.eq("pureProductId", id))
          .first(),
      ),
    )
  ).filter((p): p is Doc<"pureProducts"> => p !== null);

  const pureTotalBidByProductId = new Map<string, null | number>(
    pureProducts.map((p) => [p.pureProductId, p.currentBidPrice]),
  );

  const [latestGold, latestSilver, goldMarket, silverMarket] = await Promise.all([
    ctx.db
      .query("collectPurePrices")
      .withIndex("by_metal_and_time", (q) => q.eq("metalType", "gold"))
      .order("desc")
      .first(),
    ctx.db
      .query("collectPurePrices")
      .withIndex("by_metal_and_time", (q) => q.eq("metalType", "silver"))
      .order("desc")
      .first(),
    ctx.db
      .query("marketPrices")
      .withIndex("by_symbol", (q) => q.eq("symbol", "XAU"))
      .first(),
    ctx.db
      .query("marketPrices")
      .withIndex("by_symbol", (q) => q.eq("symbol", "XAG"))
      .first(),
  ]);
  const fallbackBidByMetal = new Map<"gold" | "silver", null | number>([
    ["gold", latestGold?.bidPrice ?? null],
    ["silver", latestSilver?.bidPrice ?? null],
  ]);
  const spotByMetal: DigestSpotPrice = {
    gold: goldMarket?.currentPrice ?? null,
    silver: silverMarket?.currentPrice ?? null,
  };

  return {
    rows: buildDigestRowsFromProducts(
      products,
      pureTotalBidByProductId,
      fallbackBidByMetal,
      spotByMetal,
    ),
    spotByMetal,
  };
};

export const collectDigestRows = internalQuery({
  args: {},
  handler: async (ctx) => {
    return collectDigestRowsForActiveProducts(ctx);
  },
});

const sendDigestForUser = async (
  ctx: ActionCtx,
  args: {
    deliveryConfig: NonNullable<ReturnType<typeof getAlertDeliveryConfig>>;
    frequency: DigestFrequency;
    rows: DigestProductRow[];
    sentAt: number;
    spotByMetal: DigestSpotPrice;
    user: {
      userId: string;
      userTokenIdentifier: string;
    };
  },
): Promise<"failed" | "sent" | "skipped_no_recipient" | "skipped_unentitled"> => {
  const identity = {
    subject: args.user.userId,
    tokenIdentifier: args.user.userTokenIdentifier,
  };

  const { alertEntitlements } = await getUserAlertEntitlements(ctx, identity);
  if (!alertEntitlements.canSendAlerts) {
    return "skipped_unentitled";
  }

  const recipientEmail = await resolveAlertRecipientEmail(ctx, identity);
  if (!recipientEmail) {
    return "skipped_no_recipient";
  }

  const unsubscribeUrl = await buildUnsubscribeUrl(args.user.userTokenIdentifier, "digest");
  const digest = formatMarketDigest(args.rows, {
    frequency: args.frequency,
    siteUrl: args.deliveryConfig.siteUrl,
    spotByMetal: args.spotByMetal,
    unsubscribeUrl: unsubscribeUrl ?? undefined,
  });

  const result = await sendAlertEmail(args.deliveryConfig, {
    html: digest.html,
    subject: digest.subject,
    text: digest.text,
    to: recipientEmail,
    unsubscribeUrl: unsubscribeUrl ?? undefined,
  });

  if (!result.ok) {
    console.error("Failed to send market digest", {
      error: result.error,
      userId: args.user.userId,
    });
    return "failed";
  }

  await ctx.runMutation(internal.userSettings.markDigestSent, {
    sentAt: args.sentAt,
    userTokenIdentifier: args.user.userTokenIdentifier,
  });
  return "sent";
};

/**
 * Cron entrypoint: build market digests and send to opted-in users.
 * Runs daily; skips weekly users on non-matching days, dedupes via lastSent.
 */
export const sendMarketDigests = internalAction({
  args: {},
  handler: async (
    ctx,
  ): Promise<{
    deliveryConfig: boolean;
    eligible: number;
    failed: number;
    sent: number;
    skippedNoRecipient: number;
    skippedRecentlySent: number;
    skippedUnentitled: number;
    success: boolean;
  }> => {
    const evaluatedAt = Date.now();
    const deliveryConfig = getAlertDeliveryConfig();
    if (!deliveryConfig) {
      console.error("Skipping market digest run: delivery config not available");
      return {
        deliveryConfig: false,
        eligible: 0,
        failed: 0,
        sent: 0,
        skippedNoRecipient: 0,
        skippedRecentlySent: 0,
        skippedUnentitled: 0,
        success: false,
      };
    }

    const [dailySubs, weeklySubs] = await Promise.all([
      ctx.runQuery(internal.userSettings.listDigestSubscribers, { frequency: "daily" }),
      ctx.runQuery(internal.userSettings.listDigestSubscribers, { frequency: "weekly" }),
    ]);

    const eligibleDaily = dailySubs.filter((entry) =>
      isDigestEligibleNow("daily", {
        evaluatedAtUtc: evaluatedAt,
        lastSentAt: entry.digestLastSentAt,
        weeklyDayOfWeek: entry.digestWeeklyDayOfWeek,
      }),
    );
    const eligibleWeekly = weeklySubs.filter((entry) =>
      isDigestEligibleNow("weekly", {
        evaluatedAtUtc: evaluatedAt,
        lastSentAt: entry.digestLastSentAt,
        weeklyDayOfWeek: entry.digestWeeklyDayOfWeek,
      }),
    );
    const skippedRecentlySent =
      dailySubs.length - eligibleDaily.length + (weeklySubs.length - eligibleWeekly.length);

    const totalEligible = eligibleDaily.length + eligibleWeekly.length;
    if (totalEligible === 0) {
      return {
        deliveryConfig: true,
        eligible: 0,
        failed: 0,
        sent: 0,
        skippedNoRecipient: 0,
        skippedRecentlySent,
        skippedUnentitled: 0,
        success: true,
      };
    }

    const { rows, spotByMetal } = await ctx.runQuery(internal.digests.collectDigestRows, {});

    let sent = 0;
    let failed = 0;
    let skippedNoRecipient = 0;
    let skippedUnentitled = 0;

    const dispatch = async (
      frequency: DigestFrequency,
      entries: typeof eligibleDaily,
    ): Promise<void> => {
      for (const entry of entries) {
        const outcome = await sendDigestForUser(ctx, {
          deliveryConfig,
          frequency,
          rows,
          sentAt: evaluatedAt,
          spotByMetal,
          user: {
            userId: entry.userId,
            userTokenIdentifier: entry.userTokenIdentifier,
          },
        });
        if (outcome === "sent") sent++;
        else if (outcome === "failed") failed++;
        else if (outcome === "skipped_no_recipient") skippedNoRecipient++;
        else skippedUnentitled++;
      }
    };

    await dispatch("daily", eligibleDaily);
    await dispatch("weekly", eligibleWeekly);

    return {
      deliveryConfig: true,
      eligible: totalEligible,
      failed,
      sent,
      skippedNoRecipient,
      skippedRecentlySent,
      skippedUnentitled,
      success: true,
    };
  },
});

/**
 * Authenticated action: send a one-off preview digest to the current user.
 * Useful for sanity-checking content. Pro-gated.
 */
export const sendPreviewDigest = action({
  args: {},
  handler: async (ctx): Promise<{ error?: string; success: boolean }> => {
    try {
      const identity = await requireAuthIdentity(ctx);
      const { alertEntitlements } = await getUserAlertEntitlements(ctx, identity);
      if (!alertEntitlements.canSendAlerts) {
        return { error: "Active Pro subscription required", success: false };
      }

      const deliveryConfig = getAlertDeliveryConfig();
      if (!deliveryConfig) {
        return { error: "Email delivery not configured", success: false };
      }

      const recipientEmail = await resolveAlertRecipientEmail(ctx, identity);
      if (!recipientEmail) {
        return { error: "No recipient email on file", success: false };
      }

      const { rows, spotByMetal } = await ctx.runQuery(internal.digests.collectDigestRows, {});
      const unsubscribeUrl = await buildUnsubscribeUrl(identity.tokenIdentifier, "digest");
      const digest = formatMarketDigest(rows, {
        frequency: "daily",
        siteUrl: deliveryConfig.siteUrl,
        spotByMetal,
        unsubscribeUrl: unsubscribeUrl ?? undefined,
      });
      const subjectPrefix = "[Preview] ";

      const result = await sendAlertEmail(deliveryConfig, {
        html: digest.html,
        subject: `${subjectPrefix}${digest.subject}`,
        text: digest.text,
        to: recipientEmail,
        unsubscribeUrl: unsubscribeUrl ?? undefined,
      });

      if (!result.ok) {
        return { error: result.error, success: false };
      }
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to send preview";
      return { error: message, success: false };
    }
  },
});
