import { convexTest } from "convex-test";
import { expect, test, vi } from "vitest";

// eslint-disable-next-line import-x/no-relative-packages -- Stripe does not export component schema path
import stripeComponentSchema from "../node_modules/@convex-dev/stripe/dist/component/schema.js";
import { api, components, internal } from "./_generated/api";
import schema from "./schema";
import { modules } from "./test.setup";

const stripeComponentModules = import.meta.glob(
  "../node_modules/@convex-dev/stripe/dist/component/**/*.js",
);

const withStripeComponent = () => {
  const t = convexTest(schema, modules);
  t.registerComponent("stripe", stripeComponentSchema, stripeComponentModules);
  return t;
};

const insertCostcoProduct = async (
  t: ReturnType<typeof convexTest>,
  {
    currentInStock = true,
    currentPrice = 1000,
    currentPricePerOunce = 1000,
    metalType = "gold" as const,
    name = "Test Product",
    productId,
    pureProductId = null,
  }: {
    currentInStock?: boolean;
    currentPrice?: number;
    currentPricePerOunce?: null | number;
    metalType?: "gold" | "silver";
    name?: string;
    productId: string;
    pureProductId?: null | string;
  },
) => {
  const now = Date.now();
  await t.run(async (ctx) => {
    await ctx.db.insert("costcoProducts", {
      brand: "Test Brand",
      categories: ["precious-metals"],
      currentInStock,
      currentPrice,
      currentPricePerOunce,
      firstSeen: now,
      isMemberOnly: false,
      isOnlineOnly: true,
      lastPriceChange: now,
      lastStockChange: now,
      lastUpdated: now,
      marketingFeatures: null,
      maxQuantity: null,
      metalType,
      metalWeight: "1 oz",
      name,
      productId,
      pureProductId,
      retailerId: "costco",
      shortDescription: null,
      thumbnail: null,
      upc: null,
      url: `https://www.costco.com/${productId}.html`,
    });
  });
};

test("getAlerts requires authentication", async () => {
  const t = convexTest(schema, modules);

  await expect(t.query(api.alerts.getAlerts, {})).rejects.toThrow("Authentication required");
});

test("createAlert blocks free users without active subscription", async () => {
  const t = withStripeComponent();
  const asUser = t.withIdentity({ name: "Free User", subject: "user_free" });

  await expect(
    asUser.mutation(api.alerts.createAlert, {
      name: "Free user alert",
      productId: "sku-1",
      triggerOn: "in_stock",
      type: "sku",
    }),
  ).rejects.toThrow("Pro subscription required to create alerts");
});

test("createAlert allows active subscribers", async () => {
  const t = withStripeComponent();
  const asUser = t.withIdentity({ name: "Pro User", subject: "user_pro" });

  await t.mutation(components.stripe.private.handleSubscriptionCreated, {
    cancelAtPeriodEnd: false,
    currentPeriodEnd: Date.now() + 86_400_000,
    metadata: { userId: "user_pro" },
    priceId: "price_pro_monthly",
    quantity: 1,
    status: "active",
    stripeCustomerId: "cus_pro_1",
    stripeSubscriptionId: "sub_pro_1",
  });

  const result = await asUser.mutation(api.alerts.createAlert, {
    name: "Pro user alert",
    productId: "sku-1",
    triggerOn: "in_stock",
    type: "sku",
  });

  expect(result).toMatchObject({ success: true });
});

test("updateAlert blocks re-enable when subscription becomes past_due", async () => {
  const t = withStripeComponent();
  const asUser = t.withIdentity({ name: "Pro User", subject: "user_pro_2" });

  await t.mutation(components.stripe.private.handleSubscriptionCreated, {
    cancelAtPeriodEnd: false,
    currentPeriodEnd: Date.now() + 86_400_000,
    metadata: { userId: "user_pro_2" },
    priceId: "price_pro_monthly",
    quantity: 1,
    status: "active",
    stripeCustomerId: "cus_pro_2",
    stripeSubscriptionId: "sub_pro_2",
  });

  const created = await asUser.mutation(api.alerts.createAlert, {
    name: "Past due transition alert",
    productId: "sku-2",
    triggerOn: "in_stock",
    type: "sku",
  });

  await asUser.mutation(api.alerts.updateAlert, {
    alertId: created.alertId,
    enabled: false,
  });

  await t.mutation(components.stripe.private.handleSubscriptionUpdated, {
    cancelAtPeriodEnd: false,
    currentPeriodEnd: Date.now() + 43_200_000,
    metadata: { userId: "user_pro_2" },
    priceId: "price_pro_monthly",
    quantity: 1,
    status: "past_due",
    stripeSubscriptionId: "sub_pro_2",
  });

  await expect(
    asUser.mutation(api.alerts.updateAlert, {
      alertId: created.alertId,
      enabled: true,
    }),
  ).rejects.toThrow("Active subscription required to enable alerts");
});

test("getUserSendAlertPermissions reflects subscription status transitions", async () => {
  const t = withStripeComponent();

  await t.mutation(components.stripe.private.handleSubscriptionCreated, {
    cancelAtPeriodEnd: false,
    currentPeriodEnd: Date.now() + 86_400_000,
    metadata: { userId: "user_send_guard" },
    priceId: "price_pro_monthly",
    quantity: 1,
    status: "active",
    stripeCustomerId: "cus_send_guard",
    stripeSubscriptionId: "sub_send_guard",
  });

  const activePermissions = await t.query(internal.alerts.getUserSendAlertPermissions, {
    userId: "user_send_guard",
  });

  expect(activePermissions.status).toBe("active");
  expect(activePermissions.isPro).toBe(true);
  expect(activePermissions.alertEntitlements.canSendAlerts).toBe(true);

  await t.mutation(components.stripe.private.handleSubscriptionUpdated, {
    cancelAtPeriodEnd: false,
    currentPeriodEnd: Date.now() + 43_200_000,
    metadata: { userId: "user_send_guard" },
    priceId: "price_pro_monthly",
    quantity: 1,
    status: "past_due",
    stripeSubscriptionId: "sub_send_guard",
  });

  const pastDuePermissions = await t.query(internal.alerts.getUserSendAlertPermissions, {
    userId: "user_send_guard",
  });

  expect(pastDuePermissions.status).toBe("past_due");
  expect(pastDuePermissions.isPro).toBe(false);
  expect(pastDuePermissions.alertEntitlements.canSendAlerts).toBe(false);
  expect(pastDuePermissions.alertEntitlements.pauseReason).toBe("billing_hold");
});

test("pauseAlertsForUser pauses only enabled alerts for the target user", async () => {
  const t = convexTest(schema, modules);

  await t.run(async (ctx) => {
    const now = Date.now();

    await ctx.db.insert("alerts", {
      cooldownMinutes: 60,
      createdAt: now,
      enabled: true,
      name: "User 1 enabled alert",
      productId: "sku-1",
      triggerOn: "in_stock",
      type: "sku",
      updatedAt: now,
      userId: "user_1",
    });

    await ctx.db.insert("alerts", {
      cooldownMinutes: 60,
      createdAt: now,
      enabled: false,
      name: "User 1 already paused",
      productId: "sku-2",
      triggerOn: "in_stock",
      type: "sku",
      updatedAt: now,
      userId: "user_1",
    });

    await ctx.db.insert("alerts", {
      cooldownMinutes: 60,
      createdAt: now,
      enabled: true,
      name: "User 2 enabled alert",
      productId: "sku-3",
      triggerOn: "in_stock",
      type: "sku",
      updatedAt: now,
      userId: "user_2",
    });
  });

  const result = await t.mutation(internal.alerts.pauseAlertsForUser, {
    pauseReason: "billing_hold",
    userId: "user_1",
  });

  expect(result).toMatchObject({ pausedCount: 1, success: true });

  await t.run(async (ctx) => {
    const user1Alerts = await ctx.db
      .query("alerts")
      .withIndex("by_user", (q) => q.eq("userId", "user_1"))
      .collect();

    expect(user1Alerts).toHaveLength(2);

    const pausedAlert = user1Alerts.find((alert) => alert.name === "User 1 enabled alert");

    expect(pausedAlert?.enabled).toBe(false);
    expect(pausedAlert?.pauseReason).toBe("billing_hold");
    expect(pausedAlert?.pausedAt).toBeTypeOf("number");

    const alreadyDisabledAlert = user1Alerts.find(
      (alert) => alert.name === "User 1 already paused",
    );

    expect(alreadyDisabledAlert?.enabled).toBe(false);
    expect(alreadyDisabledAlert?.pauseReason).toBeUndefined();

    const user2Alerts = await ctx.db
      .query("alerts")
      .withIndex("by_user", (q) => q.eq("userId", "user_2"))
      .collect();

    expect(user2Alerts).toHaveLength(1);
    expect(user2Alerts[0].enabled).toBe(true);
    expect(user2Alerts[0].pauseReason).toBeUndefined();
  });
});

test("pauseAlertsForUser is idempotent when user has no enabled alerts", async () => {
  const t = convexTest(schema, modules);

  await t.run(async (ctx) => {
    const now = Date.now();
    await ctx.db.insert("alerts", {
      cooldownMinutes: 60,
      createdAt: now,
      enabled: false,
      name: "Already disabled alert",
      productId: "sku-1",
      triggerOn: "in_stock",
      type: "sku",
      updatedAt: now,
      userId: "user_1",
    });
  });

  const result = await t.mutation(internal.alerts.pauseAlertsForUser, {
    pauseReason: "inactive_subscription",
    userId: "user_1",
  });

  expect(result).toMatchObject({ pausedCount: 0, success: true });
});

test("subscription transition active -> past_due -> active pauses once", async () => {
  const t = convexTest(schema, modules);

  await t.run(async (ctx) => {
    const now = Date.now();
    await ctx.db.insert("alerts", {
      cooldownMinutes: 60,
      createdAt: now,
      enabled: true,
      name: "Transition alert",
      productId: "sku-1",
      triggerOn: "in_stock",
      type: "sku",
      updatedAt: now,
      userId: "user_1",
    });
  });

  const activeResult = await t.mutation(internal.alerts.applySubscriptionStatusToAlerts, {
    status: "active",
    userId: "user_1",
  });

  expect(activeResult).toMatchObject({ pausedCount: 0, success: true });

  const pastDueResult = await t.mutation(internal.alerts.applySubscriptionStatusToAlerts, {
    status: "past_due",
    userId: "user_1",
  });

  expect(pastDueResult).toMatchObject({
    pausedCount: 1,
    pauseReason: "billing_hold",
    success: true,
  });

  const activeAgainResult = await t.mutation(internal.alerts.applySubscriptionStatusToAlerts, {
    status: "active",
    userId: "user_1",
  });

  expect(activeAgainResult).toMatchObject({ pausedCount: 0, success: true });

  await t.run(async (ctx) => {
    const alerts = await ctx.db
      .query("alerts")
      .withIndex("by_user", (q) => q.eq("userId", "user_1"))
      .collect();

    expect(alerts).toHaveLength(1);
    expect(alerts[0].enabled).toBe(false);
    expect(alerts[0].pauseReason).toBe("billing_hold");
  });
});

test("subscription transition active(cancel-end) -> canceled uses inactive pause", async () => {
  const t = convexTest(schema, modules);

  await t.run(async (ctx) => {
    const now = Date.now();
    await ctx.db.insert("alerts", {
      cooldownMinutes: 60,
      createdAt: now,
      enabled: true,
      name: "Cancel transition alert",
      productId: "sku-1",
      triggerOn: "in_stock",
      type: "sku",
      updatedAt: now,
      userId: "user_1",
    });
  });

  const canceledResult = await t.mutation(internal.alerts.applySubscriptionStatusToAlerts, {
    status: "canceled",
    userId: "user_1",
  });

  expect(canceledResult).toMatchObject({
    pausedCount: 1,
    pauseReason: "inactive_subscription",
    success: true,
  });

  await t.run(async (ctx) => {
    const alerts = await ctx.db
      .query("alerts")
      .withIndex("by_user", (q) => q.eq("userId", "user_1"))
      .collect();

    expect(alerts).toHaveLength(1);
    expect(alerts[0].enabled).toBe(false);
    expect(alerts[0].pauseReason).toBe("inactive_subscription");
  });
});

test("deleteAlert only allows deleting own alerts", async () => {
  const t = convexTest(schema, modules);
  const asUser1 = t.withIdentity({ name: "User 1", subject: "user_1" });
  const asUser2 = t.withIdentity({ name: "User 2", subject: "user_2" });

  const alertId = await t.run(async (ctx) =>
    ctx.db.insert("alerts", {
      cooldownMinutes: 60,
      createdAt: Date.now(),
      enabled: true,
      name: "Owned by user 1",
      productId: "sku-1",
      triggerOn: "in_stock",
      type: "sku",
      updatedAt: Date.now(),
      userId: "user_1",
    }),
  );

  await expect(asUser2.mutation(api.alerts.deleteAlert, { alertId })).rejects.toThrow(
    "Alert not found",
  );

  await expect(asUser1.mutation(api.alerts.deleteAlert, { alertId })).resolves.toMatchObject({
    success: true,
  });
});

test("evaluateAlertsForProducts queues history and batch for active SKU alerts", async () => {
  const t = withStripeComponent();
  const asUser = t.withIdentity({
    name: "Evaluation User",
    subject: "user_eval_1",
  });
  const evaluatedAt = Date.now();

  await t.mutation(components.stripe.private.handleSubscriptionCreated, {
    cancelAtPeriodEnd: false,
    currentPeriodEnd: evaluatedAt + 86_400_000,
    metadata: { userId: "user_eval_1" },
    priceId: "price_pro_monthly",
    quantity: 1,
    status: "active",
    stripeCustomerId: "cus_eval_1",
    stripeSubscriptionId: "sub_eval_1",
  });

  await insertCostcoProduct(t, {
    name: "Evaluation Coin",
    productId: "sku_eval_1",
  });

  const created = await asUser.mutation(api.alerts.createAlert, {
    cooldownMinutes: 60,
    name: "Evaluation stock alert",
    productId: "sku_eval_1",
    triggerOn: "in_stock",
    type: "sku",
  });

  const firstRun = await t.mutation(internal.alerts.evaluateAlertsForProducts, {
    evaluatedAt,
    productIds: ["sku_eval_1"],
    source: "test_eval",
  });

  expect(firstRun.triggeredAlerts).toBe(1);
  expect(firstRun.queueInserts).toBe(1);

  const cooldownRun = await t.mutation(internal.alerts.evaluateAlertsForProducts, {
    evaluatedAt: evaluatedAt + 60_000,
    productIds: ["sku_eval_1"],
    source: "test_eval",
  });

  expect(cooldownRun.triggeredAlerts).toBe(0);

  await t.run(async (ctx) => {
    const history = await ctx.db
      .query("alertHistory")
      .withIndex("by_user", (q) => q.eq("userId", "user_eval_1"))
      .collect();

    expect(history).toHaveLength(1);
    expect(history[0].products).toHaveLength(1);
    expect(history[0].products[0].productId).toBe("sku_eval_1");

    const batches = await ctx.db
      .query("alertBatches")
      .withIndex("by_user", (q) => q.eq("userId", "user_eval_1"))
      .collect();

    expect(batches).toHaveLength(1);
    expect(batches[0].sent).toBe(false);
    expect(batches[0].alerts).toHaveLength(1);
    expect(batches[0].alerts[0].alertId).toStrictEqual(created.alertId);

    const alert = await ctx.db.get(created.alertId);

    expect(alert?.lastTriggered).toBe(evaluatedAt);
  });
});

test("evaluateAlertsForProducts triggers threshold alerts when spread threshold is met", async () => {
  const t = withStripeComponent();
  const asUser = t.withIdentity({
    name: "Threshold User",
    subject: "user_threshold_1",
  });
  const evaluatedAt = Date.now();

  await t.mutation(components.stripe.private.handleSubscriptionCreated, {
    cancelAtPeriodEnd: false,
    currentPeriodEnd: evaluatedAt + 86_400_000,
    metadata: { userId: "user_threshold_1" },
    priceId: "price_pro_monthly",
    quantity: 1,
    status: "active",
    stripeCustomerId: "cus_threshold_1",
    stripeSubscriptionId: "sub_threshold_1",
  });

  await t.run(async (ctx) => {
    await ctx.db.insert("pureProducts", {
      currentBidPrice: 100,
      currentBidPricePerOz: 100,
      isGenericFallback: false,
      lastUpdated: evaluatedAt,
      manufacturer: "Test Mint",
      metalType: "gold",
      productName: "Test Mint 1 oz Gold",
      productType: "bar",
      pureProductId: "pure_eval_1",
      sku: null,
      weight: 1,
      weightGrams: null,
    });
  });

  await insertCostcoProduct(t, {
    currentPrice: 101,
    currentPricePerOunce: 101,
    name: "Threshold Product",
    productId: "sku_threshold_1",
    pureProductId: "pure_eval_1",
  });

  await asUser.mutation(api.alerts.createAlert, {
    aboveSpotThreshold: 1,
    cooldownMinutes: 60,
    name: "Threshold alert",
    triggerOn: "threshold_met",
    type: "threshold",
  });

  const evaluation = await t.mutation(internal.alerts.evaluateAlertsForProducts, {
    evaluatedAt,
    productIds: ["sku_threshold_1"],
    source: "threshold_test",
  });

  expect(evaluation.triggeredAlerts).toBe(1);

  await t.run(async (ctx) => {
    const history = await ctx.db
      .query("alertHistory")
      .withIndex("by_user", (q) => q.eq("userId", "user_threshold_1"))
      .collect();

    expect(history).toHaveLength(1);
    expect(history[0].products[0].reason).toContain("above spot");
  });
});

test("evaluateAlertsForProducts uses spot price denominator for above-spot threshold checks", async () => {
  const t = withStripeComponent();
  const asUser = t.withIdentity({
    name: "Threshold Denominator User",
    subject: "user_threshold_denominator_1",
  });
  const evaluatedAt = Date.now();

  await t.mutation(components.stripe.private.handleSubscriptionCreated, {
    cancelAtPeriodEnd: false,
    currentPeriodEnd: evaluatedAt + 86_400_000,
    metadata: { userId: "user_threshold_denominator_1" },
    priceId: "price_pro_monthly",
    quantity: 1,
    status: "active",
    stripeCustomerId: "cus_threshold_denominator_1",
    stripeSubscriptionId: "sub_threshold_denominator_1",
  });

  await t.run(async (ctx) => {
    await ctx.db.insert("pureProducts", {
      currentBidPrice: 100,
      currentBidPricePerOz: 100,
      isGenericFallback: false,
      lastUpdated: evaluatedAt,
      manufacturer: "Test Mint",
      metalType: "gold",
      productName: "Test Mint 1 oz Gold",
      productType: "bar",
      pureProductId: "pure_eval_denominator_1",
      sku: null,
      weight: 1,
      weightGrams: null,
    });
  });

  await insertCostcoProduct(t, {
    currentPrice: 120,
    currentPricePerOunce: 120,
    name: "Threshold Denominator Product",
    productId: "sku_threshold_denominator_1",
    pureProductId: "pure_eval_denominator_1",
  });

  await asUser.mutation(api.alerts.createAlert, {
    aboveSpotThreshold: 18,
    cooldownMinutes: 60,
    name: "Threshold denominator alert",
    triggerOn: "threshold_met",
    type: "threshold",
  });

  const evaluation = await t.mutation(internal.alerts.evaluateAlertsForProducts, {
    evaluatedAt,
    productIds: ["sku_threshold_denominator_1"],
    source: "threshold_denominator_test",
  });

  // True above-spot = 20% ((120 - 100) / 100), so threshold 18 should not trigger.
  expect(evaluation.triggeredAlerts).toBe(0);

  await t.run(async (ctx) => {
    const history = await ctx.db
      .query("alertHistory")
      .withIndex("by_user", (q) => q.eq("userId", "user_threshold_denominator_1"))
      .collect();

    expect(history).toHaveLength(0);
  });
});

test("evaluateAlertsForProducts skips users without send entitlements", async () => {
  const t = withStripeComponent();
  const evaluatedAt = Date.now();

  await insertCostcoProduct(t, {
    name: "Free tier product",
    productId: "sku_free_eval_1",
  });

  await t.run(async (ctx) => {
    await ctx.db.insert("alerts", {
      cooldownMinutes: 60,
      createdAt: evaluatedAt,
      enabled: true,
      name: "Free tier alert",
      productId: "sku_free_eval_1",
      triggerOn: "in_stock",
      type: "sku",
      updatedAt: evaluatedAt,
      userId: "user_free_eval_1",
    });
  });

  const evaluation = await t.mutation(internal.alerts.evaluateAlertsForProducts, {
    evaluatedAt,
    productIds: ["sku_free_eval_1"],
    source: "free_test",
  });

  expect(evaluation.triggeredAlerts).toBe(0);
  expect(evaluation.skippedByEntitlement).toBe(1);

  await t.run(async (ctx) => {
    const history = await ctx.db
      .query("alertHistory")
      .withIndex("by_user", (q) => q.eq("userId", "user_free_eval_1"))
      .collect();

    expect(history).toHaveLength(0);

    const batches = await ctx.db
      .query("alertBatches")
      .withIndex("by_user", (q) => q.eq("userId", "user_free_eval_1"))
      .collect();

    expect(batches).toHaveLength(0);
  });
});

test("processPendingAlertBatches sends due batches and marks history notified", async () => {
  const t = withStripeComponent();
  const asUser = t.withIdentity({
    name: "Digest User",
    subject: "user_digest_1",
  });
  const evaluatedAt = Date.now();
  const originalApiKey = process.env.RESEND_API_KEY;
  const originalFromEmail = process.env.RESEND_FROM_EMAIL;
  const originalReplyToEmail = process.env.RESEND_REPLY_TO_EMAIL;
  const originalSiteUrl = process.env.SITE_URL;
  const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
    json: () => Promise.resolve({ id: "email_1" }),
    ok: true,
    status: 200,
    statusText: "OK",
  } as Response);

  process.env.RESEND_API_KEY = "test_resend_api_key";
  process.env.RESEND_FROM_EMAIL = "alerts@example.com";
  delete process.env.RESEND_REPLY_TO_EMAIL;
  process.env.SITE_URL = "https://dashboard.gold";

  try {
    await t.mutation(components.stripe.public.createOrUpdateCustomer, {
      email: "digest@example.com",
      metadata: { userId: "user_digest_1" },
      name: "Digest User",
      stripeCustomerId: "cus_digest_1",
    });

    await t.mutation(components.stripe.private.handleSubscriptionCreated, {
      cancelAtPeriodEnd: false,
      currentPeriodEnd: evaluatedAt + 86_400_000,
      metadata: { userId: "user_digest_1" },
      priceId: "price_pro_monthly",
      quantity: 1,
      status: "active",
      stripeCustomerId: "cus_digest_1",
      stripeSubscriptionId: "sub_digest_1",
    });

    await insertCostcoProduct(t, {
      name: "Digest Product",
      productId: "sku_digest_1",
    });

    await asUser.mutation(api.alerts.createAlert, {
      cooldownMinutes: 60,
      name: "Digest alert",
      productId: "sku_digest_1",
      triggerOn: "in_stock",
      type: "sku",
    });

    await t.mutation(internal.alerts.evaluateAlertsForProducts, {
      evaluatedAt,
      productIds: ["sku_digest_1"],
      source: "digest_test",
    });

    const processResult = await t.action(internal.alerts.processPendingAlertBatches, {
      now: evaluatedAt + 20 * 60 * 1000,
    });

    expect(processResult.sentBatches).toBe(1);
    expect(processResult.failedSends).toBe(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const fetchCall = fetchMock.mock.calls[0];
    const requestInit = fetchCall[1] as RequestInit;
    const requestBody = typeof requestInit.body === "string" ? JSON.parse(requestInit.body) : null;

    expect(requestBody).not.toBeNull();

    if (!requestBody?.headers) {
      throw new Error("Expected JSON request body with headers");
    }

    expect(requestBody.reply_to).toBe("support@dashboard.gold");
    expect(requestBody.headers["List-Unsubscribe"]).toContain(
      "mailto:support@dashboard.gold?subject=unsubscribe",
    );
    expect(requestBody.headers["List-Unsubscribe"]).toContain("https://dashboard.gold/alerts");

    await t.run(async (ctx) => {
      const batches = await ctx.db
        .query("alertBatches")
        .withIndex("by_user", (q) => q.eq("userId", "user_digest_1"))
        .collect();

      expect(batches).toHaveLength(1);
      expect(batches[0].sent).toBe(true);
      expect(batches[0].sentAt).toBeTypeOf("number");

      const history = await ctx.db
        .query("alertHistory")
        .withIndex("by_user", (q) => q.eq("userId", "user_digest_1"))
        .collect();

      expect(history).toHaveLength(1);
      expect(history[0].notificationSent).toBe(true);
      expect(history[0].notificationError).toBeUndefined();
    });
  } finally {
    fetchMock.mockRestore();
    process.env.RESEND_API_KEY = originalApiKey;
    process.env.RESEND_FROM_EMAIL = originalFromEmail;
    if (originalReplyToEmail === undefined) {
      delete process.env.RESEND_REPLY_TO_EMAIL;
    } else {
      process.env.RESEND_REPLY_TO_EMAIL = originalReplyToEmail;
    }
    process.env.SITE_URL = originalSiteUrl;
  }
});

test("processPendingAlertBatches skips batches for non-entitled users", async () => {
  const t = withStripeComponent();
  const now = Date.now();

  await t.run(async (ctx) => {
    const alertId = await ctx.db.insert("alerts", {
      cooldownMinutes: 60,
      createdAt: now,
      enabled: true,
      name: "Free user alert",
      productId: "sku_skip_1",
      triggerOn: "in_stock",
      type: "sku",
      updatedAt: now,
      userId: "user_skip_1",
    });

    await ctx.db.insert("alertHistory", {
      alertId,
      notificationSent: false,
      products: [
        {
          productId: "sku_skip_1",
          productName: "Skipped Product",
          reason: "Back in stock",
        },
      ],
      triggeredAt: now,
      userId: "user_skip_1",
    });

    await ctx.db.insert("alertBatches", {
      alerts: [
        {
          alertId,
          alertName: "Free user alert",
          products: [
            {
              productId: "sku_skip_1",
              productName: "Skipped Product",
              reason: "Back in stock",
            },
          ],
        },
      ],
      createdAt: now,
      scheduledFor: now,
      sent: false,
      userId: "user_skip_1",
    });
  });

  const result = await t.action(internal.alerts.processPendingAlertBatches, {
    now: now + 60_000,
  });

  expect(result.skippedByEntitlement).toBe(1);
  expect(result.sentBatches).toBe(0);

  await t.run(async (ctx) => {
    const batches = await ctx.db
      .query("alertBatches")
      .withIndex("by_user", (q) => q.eq("userId", "user_skip_1"))
      .collect();

    expect(batches).toHaveLength(1);
    expect(batches[0].sent).toBe(true);

    const history = await ctx.db
      .query("alertHistory")
      .withIndex("by_user", (q) => q.eq("userId", "user_skip_1"))
      .collect();

    expect(history).toHaveLength(1);
    expect(history[0].notificationSent).toBe(false);
    expect(history[0].notificationError).toContain("subscription status free");
  });
});

test("processPendingAlertBatches defers pending batches when delivery config is missing", async () => {
  const t = withStripeComponent();
  const asUser = t.withIdentity({
    name: "Deferred User",
    subject: "user_deferred_1",
  });
  const now = Date.now();
  const originalApiKey = process.env.RESEND_API_KEY;
  const originalFromEmail = process.env.RESEND_FROM_EMAIL;

  delete process.env.RESEND_API_KEY;
  delete process.env.RESEND_FROM_EMAIL;

  try {
    await t.mutation(components.stripe.private.handleSubscriptionCreated, {
      cancelAtPeriodEnd: false,
      currentPeriodEnd: now + 86_400_000,
      metadata: { userId: "user_deferred_1" },
      priceId: "price_pro_monthly",
      quantity: 1,
      status: "active",
      stripeCustomerId: "cus_deferred_1",
      stripeSubscriptionId: "sub_deferred_1",
    });

    await insertCostcoProduct(t, {
      name: "Deferred Product",
      productId: "sku_deferred_1",
    });

    await asUser.mutation(api.alerts.createAlert, {
      cooldownMinutes: 60,
      name: "Deferred alert",
      productId: "sku_deferred_1",
      triggerOn: "in_stock",
      type: "sku",
    });

    await t.mutation(internal.alerts.evaluateAlertsForProducts, {
      evaluatedAt: now,
      productIds: ["sku_deferred_1"],
      source: "defer_test",
    });

    const result = await t.action(internal.alerts.processPendingAlertBatches, {
      now: now + 20 * 60 * 1000,
    });

    expect(result.deferredByMissingConfig).toBe(1);
    expect(result.deferredRescheduled).toBe(1);
    expect(result.sentBatches).toBe(0);

    await t.run(async (ctx) => {
      const batches = await ctx.db
        .query("alertBatches")
        .withIndex("by_user", (q) => q.eq("userId", "user_deferred_1"))
        .collect();

      expect(batches).toHaveLength(1);
      expect(batches[0].sent).toBe(false);
      expect(batches[0].scheduledFor).toBeGreaterThan(now + 20 * 60 * 1000);
      expect(batches[0].lastAttemptError).toContain("missing RESEND_API_KEY");
    });
  } finally {
    process.env.RESEND_API_KEY = originalApiKey;
    process.env.RESEND_FROM_EMAIL = originalFromEmail;
  }
});

test("processPendingAlertBatches retries failed sends then gives up after max attempts", async () => {
  const t = withStripeComponent();
  const asUser = t.withIdentity({
    name: "Retry User",
    subject: "user_retry_1",
  });
  const now = Date.now();
  const originalApiKey = process.env.RESEND_API_KEY;
  const originalFromEmail = process.env.RESEND_FROM_EMAIL;
  const originalSiteUrl = process.env.SITE_URL;
  const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
    json: () => Promise.resolve({ error: "invalid recipient" }),
    ok: false,
    status: 400,
    statusText: "Bad Request",
  } as Response);

  process.env.RESEND_API_KEY = "test_resend_api_key";
  process.env.RESEND_FROM_EMAIL = "alerts@example.com";
  process.env.SITE_URL = "https://dashboard.gold";

  try {
    await t.mutation(components.stripe.public.createOrUpdateCustomer, {
      email: "retry@example.com",
      metadata: { userId: "user_retry_1" },
      name: "Retry User",
      stripeCustomerId: "cus_retry_1",
    });

    await t.mutation(components.stripe.private.handleSubscriptionCreated, {
      cancelAtPeriodEnd: false,
      currentPeriodEnd: now + 86_400_000,
      metadata: { userId: "user_retry_1" },
      priceId: "price_pro_monthly",
      quantity: 1,
      status: "active",
      stripeCustomerId: "cus_retry_1",
      stripeSubscriptionId: "sub_retry_1",
    });

    await insertCostcoProduct(t, {
      name: "Retry Product",
      productId: "sku_retry_1",
    });

    await asUser.mutation(api.alerts.createAlert, {
      cooldownMinutes: 60,
      name: "Retry alert",
      productId: "sku_retry_1",
      triggerOn: "in_stock",
      type: "sku",
    });

    await t.mutation(internal.alerts.evaluateAlertsForProducts, {
      evaluatedAt: now,
      productIds: ["sku_retry_1"],
      source: "retry_test",
    });

    let processNow = now + 20 * 60 * 1000;
    let finalResult: null | {
      exhaustedRetries: number;
      failedSends: number;
      retriesScheduled: number;
    } = null;

    for (let attempt = 1; attempt <= 5; attempt++) {
      finalResult = await t.action(internal.alerts.processPendingAlertBatches, {
        now: processNow,
      });

      await t.run(async (ctx) => {
        const batches = await ctx.db
          .query("alertBatches")
          .withIndex("by_user", (q) => q.eq("userId", "user_retry_1"))
          .collect();

        expect(batches).toHaveLength(1);

        const batch = batches[0];

        expect(batch.sendAttempts).toBe(attempt);

        if (attempt < 5) {
          expect(batch.sent).toBe(false);
          expect(batch.scheduledFor).toBeGreaterThan(processNow);

          processNow = batch.scheduledFor + 1;
        } else {
          expect(batch.sent).toBe(true);
          expect(batch.terminalFailureAt).toBeTypeOf("number");
        }
      });
    }

    expect(finalResult).not.toBeNull();
    expect(finalResult?.failedSends).toBe(1);
    expect(finalResult?.exhaustedRetries).toBe(1);
    expect(finalResult?.retriesScheduled).toBe(0);

    await t.run(async (ctx) => {
      const history = await ctx.db
        .query("alertHistory")
        .withIndex("by_user", (q) => q.eq("userId", "user_retry_1"))
        .collect();

      expect(history).toHaveLength(1);
      expect(history[0].notificationSent).toBe(false);
      expect(history[0].notificationError).toContain("failed after 5 attempts");
    });
  } finally {
    fetchMock.mockRestore();
    process.env.RESEND_API_KEY = originalApiKey;
    process.env.RESEND_FROM_EMAIL = originalFromEmail;
    process.env.SITE_URL = originalSiteUrl;
  }
});
