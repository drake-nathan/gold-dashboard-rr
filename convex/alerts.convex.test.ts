import { convexTest } from "convex-test";
import { expect, test, vi } from "vitest";

import migrationsComponentSchema from "../node_modules/@convex-dev/migrations/dist/component/schema.js";
import stripeComponentSchema from "../node_modules/@convex-dev/stripe/dist/component/schema.js";
import { api, components, internal } from "./_generated/api";
import schema from "./schema";
import { modules } from "./test.setup";

const migrationsComponentModules = import.meta.glob(
  "../node_modules/@convex-dev/migrations/dist/component/**/*.js",
);
const stripeComponentModules = import.meta.glob(
  "../node_modules/@convex-dev/stripe/dist/component/**/*.js",
);

const withStripeComponent = () => {
  const t = convexTest(schema, modules);
  t.registerComponent("stripe", stripeComponentSchema, stripeComponentModules);
  return t;
};

const withMigrationsComponent = () => {
  const t = convexTest(schema, modules);
  t.registerComponent("migrations", migrationsComponentSchema, migrationsComponentModules);
  return t;
};

const insertCostcoProduct = async (
  t: ReturnType<typeof withStripeComponent>,
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

const createProcessedProduct = ({
  metalType = "gold" as const,
  name = "Test Product",
  price = 1000,
  productId,
}: {
  metalType?: "gold" | "silver";
  name?: string;
  price?: number;
  productId: string;
}) => ({
  attributes: [{ key: "Metal Weight", value: "1 oz" }],
  brand: "Test Brand",
  categories: ["precious-metals"],
  id: productId,
  in_stock: true,
  is_member_only: false,
  is_warehouse_only: false,
  marketing_features: [],
  max_quantity: 5,
  metalType,
  metalWeight: "1 oz",
  name,
  price,
  pricePerOunce: price,
  retailer_id: "costco",
  url: `https://www.costco.com/${productId}.html`,
});

test("getAlerts requires authentication", async () => {
  const t = convexTest(schema, modules);

  await expect(t.query(api.alerts.getAlerts, {})).rejects.toThrow("Authentication required");
});

test("getAlerts reads token-identifier keyed alerts after subject changes", async () => {
  const t = convexTest(schema, modules);

  await t.run(async (ctx) => {
    await ctx.db.insert("alerts", {
      cooldownMinutes: 60,
      createdAt: Date.now(),
      enabled: true,
      name: "Token-owned alert",
      productId: "sku-token-1",
      triggerOn: "in_stock",
      type: "sku",
      updatedAt: Date.now(),
      userId: "old_subject",
      userTokenIdentifier: "clerk|alerts-user",
    });
  });

  const asUser = t.withIdentity({
    name: "Alerts User",
    subject: "new_subject",
    tokenIdentifier: "clerk|alerts-user",
  });

  const alerts = await asUser.query(api.alerts.getAlerts, {});

  expect(alerts).toHaveLength(1);
  expect(alerts[0].name).toBe("Token-owned alert");
});

test("getProductOptions reads the alert product option summary table", async () => {
  const t = convexTest(schema, modules);
  const now = Date.now();

  await t.mutation(internal.costco.upsertProduct, {
    product: createProcessedProduct({
      metalType: "silver",
      name: "B Silver Coin",
      productId: "sku-b",
    }),
    timestamp: now,
  });

  await t.mutation(internal.costco.upsertProduct, {
    product: createProcessedProduct({
      metalType: "gold",
      name: "A Gold Bar",
      productId: "sku-a",
    }),
    timestamp: now,
  });

  const options = await t.query(api.alerts.getProductOptions, {});

  expect(options).toStrictEqual([
    { metalType: "gold", name: "A Gold Bar", productId: "sku-a" },
    { metalType: "silver", name: "B Silver Coin", productId: "sku-b" },
  ]);
});

test("getBrandOptions returns distinct non-empty brands from Costco products", async () => {
  const t = convexTest(schema, modules);
  const now = Date.now();

  await t.mutation(internal.costco.upsertProduct, {
    product: {
      ...createProcessedProduct({
        metalType: "gold",
        name: "A Gold Bar",
        productId: "sku-brand-a",
      }),
      brand: "PAMP",
    },
    timestamp: now,
  });

  await t.mutation(internal.costco.upsertProduct, {
    product: {
      ...createProcessedProduct({
        metalType: "silver",
        name: "B Silver Coin",
        productId: "sku-brand-b",
      }),
      brand: "Valcambi",
    },
    timestamp: now,
  });

  await t.mutation(internal.costco.upsertProduct, {
    product: {
      ...createProcessedProduct({
        metalType: "gold",
        name: "C Gold Bar",
        productId: "sku-brand-c",
      }),
      brand: "PAMP",
    },
    timestamp: now,
  });

  const brands = await t.query(api.alerts.getBrandOptions, {});

  expect(brands).toStrictEqual(["PAMP", "Valcambi"]);
});

test("backfillAlertProductOptions populates summary rows for existing Costco products", async () => {
  const t = withMigrationsComponent();
  const now = Date.now();

  await t.run(async (ctx) => {
    await ctx.db.insert("costcoProducts", {
      brand: "Legacy Brand",
      categories: ["precious-metals"],
      currentInStock: true,
      currentPrice: 2050,
      currentPricePerOunce: 2050,
      firstSeen: now,
      isMemberOnly: false,
      isOnlineOnly: true,
      lastPriceChange: now,
      lastStockChange: now,
      lastUpdated: now,
      marketingFeatures: null,
      maxQuantity: null,
      metalType: "gold",
      metalWeight: "1 oz",
      name: "Legacy Gold Bar",
      productId: "legacy-gold-1",
      pureProductId: null,
      retailerId: "costco",
      shortDescription: null,
      thumbnail: null,
      upc: null,
      url: "https://www.costco.com/legacy-gold-1.html",
    });
  });

  await t.mutation(internal.migrations.run, {
    dryRun: false,
    fn: "migrations:backfillAlertProductOptions",
  });

  const options = await t.query(api.alerts.getProductOptions, {});

  expect(options).toStrictEqual([
    { metalType: "gold", name: "Legacy Gold Bar", productId: "legacy-gold-1" },
  ]);
});

test("upsertProduct recreates a missing alert product option for an existing product", async () => {
  const t = convexTest(schema, modules);
  const now = Date.now();

  await t.run(async (ctx) => {
    await ctx.db.insert("costcoProducts", {
      brand: "Legacy Brand",
      categories: ["precious-metals"],
      currentInStock: true,
      currentPrice: 2050,
      currentPricePerOunce: 2050,
      firstSeen: now,
      isMemberOnly: false,
      isOnlineOnly: true,
      lastPriceChange: now,
      lastStockChange: now,
      lastUpdated: now,
      marketingFeatures: null,
      maxQuantity: null,
      metalType: "gold",
      metalWeight: "1 oz",
      name: "Existing Gold Bar",
      productId: "existing-gold-1",
      pureProductId: null,
      retailerId: "costco",
      shortDescription: null,
      thumbnail: null,
      upc: null,
      url: "https://www.costco.com/existing-gold-1.html",
    });
  });

  await t.mutation(internal.costco.upsertProduct, {
    product: createProcessedProduct({
      metalType: "gold",
      name: "Existing Gold Bar",
      price: 2050,
      productId: "existing-gold-1",
    }),
    timestamp: now + 1000,
  });

  const options = await t.query(api.alerts.getProductOptions, {});

  expect(options).toContainEqual({
    metalType: "gold",
    name: "Existing Gold Bar",
    productId: "existing-gold-1",
  });
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

test("alerts CRUD lifecycle persists changes for the owning user", async () => {
  const t = withStripeComponent();
  const asUser = t.withIdentity({
    name: "CRUD User",
    subject: "user_alert_crud",
    tokenIdentifier: "clerk|alert-crud",
  });

  await t.mutation(components.stripe.private.handleSubscriptionCreated, {
    cancelAtPeriodEnd: false,
    currentPeriodEnd: Date.now() + 86_400_000,
    metadata: { userId: "clerk|alert-crud" },
    priceId: "price_pro_monthly",
    quantity: 1,
    status: "active",
    stripeCustomerId: "cus_alert_crud",
    stripeSubscriptionId: "sub_alert_crud",
  });

  const created = await asUser.mutation(api.alerts.createAlert, {
    cooldownMinutes: 30,
    enabled: true,
    name: "Original alert",
    productId: "sku-crud-1",
    triggerOn: "in_stock",
    type: "sku",
  });

  await asUser.mutation(api.alerts.updateAlert, {
    alertId: created.alertId,
    cooldownMinutes: 90,
    enabled: false,
    name: "Updated alert",
    productId: "sku-crud-2",
    triggerOn: "price_drop",
    type: "sku",
  });

  const alertsAfterUpdate = await asUser.query(api.alerts.getAlerts, {});

  expect(alertsAfterUpdate).toHaveLength(1);
  expect(alertsAfterUpdate[0]).toMatchObject({
    cooldownMinutes: 90,
    enabled: false,
    name: "Updated alert",
    productId: "sku-crud-2",
    triggerOn: "price_drop",
    type: "sku",
    userId: "user_alert_crud",
    userTokenIdentifier: "clerk|alert-crud",
  });

  await asUser.mutation(api.alerts.deleteAlert, {
    alertId: created.alertId,
  });

  await expect(asUser.query(api.alerts.getAlerts, {})).resolves.toStrictEqual([]);
});

test("updateAlert clears category filters when explicit null is supplied", async () => {
  const t = withStripeComponent();
  const asUser = t.withIdentity({ name: "Category User", subject: "user_category_edit" });

  await t.mutation(components.stripe.private.handleSubscriptionCreated, {
    cancelAtPeriodEnd: false,
    currentPeriodEnd: Date.now() + 86_400_000,
    metadata: { userId: "user_category_edit" },
    priceId: "price_pro_monthly",
    quantity: 1,
    status: "active",
    stripeCustomerId: "cus_category_edit",
    stripeSubscriptionId: "sub_category_edit",
  });

  const created = await asUser.mutation(api.alerts.createAlert, {
    brand: "PAMP",
    cooldownMinutes: 30,
    metalType: "gold",
    name: "Original category alert",
    triggerOn: "in_stock",
    type: "category",
    weightGroup: "100g",
  });

  // Mirrors what buildAlertPayload sends: explicit null on every clearable
  // field for the alert's type. Omitted fields would be preserved instead.
  await asUser.mutation(api.alerts.updateAlert, {
    alertId: created.alertId,
    brand: null,
    cooldownMinutes: 90,
    metalType: "gold",
    name: "Metal-only category alert",
    triggerOn: "in_stock",
    type: "category",
    weightGroup: null,
  });

  const alertsAfterUpdate = await asUser.query(api.alerts.getAlerts, {});

  expect(alertsAfterUpdate).toHaveLength(1);
  expect(alertsAfterUpdate[0]).toMatchObject({
    cooldownMinutes: 90,
    metalType: "gold",
    name: "Metal-only category alert",
    triggerOn: "in_stock",
    type: "category",
  });
  expect(alertsAfterUpdate[0].brand).toBeUndefined();
  expect(alertsAfterUpdate[0].weight).toBeUndefined();
  expect(alertsAfterUpdate[0].weightGroup).toBeUndefined();
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
  expect(activePermissions.isPro).toBeTruthy();
  expect(activePermissions.alertEntitlements.canSendAlerts).toBeTruthy();

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
  expect(pastDuePermissions.isPro).toBeFalsy();
  expect(pastDuePermissions.alertEntitlements.canSendAlerts).toBeFalsy();
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
      userTokenIdentifier: "user_1",
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
      userTokenIdentifier: "user_1",
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
      userTokenIdentifier: "user_2",
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

    expect(pausedAlert?.enabled).toBeFalsy();
    expect(pausedAlert?.pauseReason).toBe("billing_hold");
    expect(pausedAlert?.pausedAt).toBeTypeOf("number");

    const alreadyDisabledAlert = user1Alerts.find(
      (alert) => alert.name === "User 1 already paused",
    );

    expect(alreadyDisabledAlert?.enabled).toBeFalsy();
    expect(alreadyDisabledAlert?.pauseReason).toBeUndefined();

    const user2Alerts = await ctx.db
      .query("alerts")
      .withIndex("by_user", (q) => q.eq("userId", "user_2"))
      .collect();

    expect(user2Alerts).toHaveLength(1);
    expect(user2Alerts[0].enabled).toBeTruthy();
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
      userTokenIdentifier: "user_1",
    });
  });

  const result = await t.mutation(internal.alerts.pauseAlertsForUser, {
    pauseReason: "inactive_subscription",
    userId: "user_1",
  });

  expect(result).toMatchObject({ pausedCount: 0, success: true });
});

test("pauseAlertsForUser supports token-identifier keyed alerts", async () => {
  const t = convexTest(schema, modules);

  await t.run(async (ctx) => {
    const now = Date.now();
    await ctx.db.insert("alerts", {
      cooldownMinutes: 60,
      createdAt: now,
      enabled: true,
      name: "Token keyed alert",
      productId: "sku-token-pause",
      triggerOn: "in_stock",
      type: "sku",
      updatedAt: now,
      userId: "legacy_subject",
      userTokenIdentifier: "clerk|pause-user",
    });
  });

  const result = await t.mutation(internal.alerts.pauseAlertsForUser, {
    pauseReason: "billing_hold",
    userId: "clerk|pause-user",
  });

  expect(result).toMatchObject({ pausedCount: 1, success: true });

  await t.run(async (ctx) => {
    const alerts = await ctx.db
      .query("alerts")
      .withIndex("by_user_token_identifier", (q) => q.eq("userTokenIdentifier", "clerk|pause-user"))
      .collect();

    expect(alerts).toHaveLength(1);
    expect(alerts[0].enabled).toBeFalsy();
    expect(alerts[0].pauseReason).toBe("billing_hold");
  });
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
      userTokenIdentifier: "user_1",
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
    expect(alerts[0].enabled).toBeFalsy();
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
      userTokenIdentifier: "user_1",
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
    expect(alerts[0].enabled).toBeFalsy();
    expect(alerts[0].pauseReason).toBe("inactive_subscription");
  });
});

test("deleteAlert only allows deleting own alerts", async () => {
  const t = convexTest(schema, modules);
  const asUser1 = t.withIdentity({
    name: "User 1",
    subject: "user_1",
    tokenIdentifier: "clerk|user_1",
  });
  const asUser2 = t.withIdentity({
    name: "User 2",
    subject: "user_2",
    tokenIdentifier: "clerk|user_2",
  });

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
      userTokenIdentifier: "clerk|user_1",
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
    expect(batches[0].sent).toBeFalsy();
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

test("updateAlert merges threshold config: partial metalType update preserves aboveSpotThreshold", async () => {
  const t = withStripeComponent();
  const asUser = t.withIdentity({
    name: "Partial Update User",
    subject: "user_partial_1",
    tokenIdentifier: "clerk|partial-1",
  });

  await t.mutation(components.stripe.private.handleSubscriptionCreated, {
    cancelAtPeriodEnd: false,
    currentPeriodEnd: Date.now() + 86_400_000,
    metadata: { userId: "clerk|partial-1" },
    priceId: "price_pro_monthly",
    quantity: 1,
    status: "active",
    stripeCustomerId: "cus_partial_1",
    stripeSubscriptionId: "sub_partial_1",
  });

  const created = await asUser.mutation(api.alerts.createAlert, {
    aboveSpotThreshold: 2,
    cooldownMinutes: 60,
    name: "Threshold w/ metal",
    triggerOn: "threshold_met",
    type: "threshold",
  });

  // Pure partial update: only metalType supplied. Threshold field must survive.
  await asUser.mutation(api.alerts.updateAlert, {
    alertId: created.alertId,
    metalType: "gold",
  });

  const alerts = await asUser.query(api.alerts.getAlerts, {});
  expect(alerts).toHaveLength(1);
  expect(alerts[0]).toMatchObject({
    aboveSpotThreshold: 2,
    metalType: "gold",
    type: "threshold",
  });

  // Explicit null clears the field; aboveSpotThreshold is still preserved.
  await asUser.mutation(api.alerts.updateAlert, {
    alertId: created.alertId,
    metalType: null,
  });

  const cleared = await asUser.query(api.alerts.getAlerts, {});
  expect(cleared[0].metalType).toBeUndefined();
  expect(cleared[0].aboveSpotThreshold).toBe(2);
});

test("evaluateAlertsForProducts threshold alert respects metalType filter", async () => {
  const t = withStripeComponent();
  const asUser = t.withIdentity({
    name: "Threshold Metal User",
    subject: "user_threshold_metal_1",
  });
  const evaluatedAt = Date.now();

  await t.mutation(components.stripe.private.handleSubscriptionCreated, {
    cancelAtPeriodEnd: false,
    currentPeriodEnd: evaluatedAt + 86_400_000,
    metadata: { userId: "user_threshold_metal_1" },
    priceId: "price_pro_monthly",
    quantity: 1,
    status: "active",
    stripeCustomerId: "cus_threshold_metal_1",
    stripeSubscriptionId: "sub_threshold_metal_1",
  });

  await t.run(async (ctx) => {
    await ctx.db.insert("collectPurePrices", {
      askPrice: null,
      bidPrice: 100,
      isMock: false,
      metalType: "gold",
      spotPrice: 100,
      timestamp: evaluatedAt,
    });
    await ctx.db.insert("collectPurePrices", {
      askPrice: null,
      bidPrice: 30,
      isMock: false,
      metalType: "silver",
      spotPrice: 30,
      timestamp: evaluatedAt,
    });
  });

  await insertCostcoProduct(t, {
    currentPrice: 101,
    currentPricePerOunce: 101,
    metalType: "gold",
    name: "Gold Bar",
    productId: "sku_gold_threshold",
  });
  await insertCostcoProduct(t, {
    currentPrice: 30.3,
    currentPricePerOunce: 30.3,
    metalType: "silver",
    name: "Silver Coin",
    productId: "sku_silver_threshold",
  });

  await asUser.mutation(api.alerts.createAlert, {
    aboveSpotThreshold: 5,
    cooldownMinutes: 60,
    metalType: "gold",
    name: "Gold-only markup",
    triggerOn: "threshold_met",
    type: "threshold",
  });

  const evaluation = await t.mutation(internal.alerts.evaluateAlertsForProducts, {
    evaluatedAt,
    productIds: ["sku_gold_threshold", "sku_silver_threshold"],
    source: "threshold_metal_test",
  });

  expect(evaluation.triggeredAlerts).toBe(1);

  await t.run(async (ctx) => {
    const history = await ctx.db
      .query("alertHistory")
      .withIndex("by_user", (q) => q.eq("userId", "user_threshold_metal_1"))
      .collect();

    expect(history).toHaveLength(1);
    expect(history[0].products).toHaveLength(1);
    expect(history[0].products[0].productId).toBe("sku_gold_threshold");
  });
});

test("evaluateAlertsForProducts matches grouped category weights including other", async () => {
  const t = withStripeComponent();
  const asUser = t.withIdentity({
    name: "Category Weight User",
    subject: "user_category_weight_1",
  });
  const evaluatedAt = Date.now();

  await t.mutation(components.stripe.private.handleSubscriptionCreated, {
    cancelAtPeriodEnd: false,
    currentPeriodEnd: evaluatedAt + 86_400_000,
    metadata: { userId: "user_category_weight_1" },
    priceId: "price_pro_monthly",
    quantity: 1,
    status: "active",
    stripeCustomerId: "cus_category_weight_1",
    stripeSubscriptionId: "sub_category_weight_1",
  });

  await insertCostcoProduct(t, {
    currentPrice: 1000,
    currentPricePerOunce: 1000,
    name: "One Ounce Product",
    productId: "sku_category_weight_1oz",
  });

  await insertCostcoProduct(t, {
    currentPrice: 5000,
    currentPricePerOunce: 500,
    name: "Ten Ounce Product",
    productId: "sku_category_weight_other",
  });

  await asUser.mutation(api.alerts.createAlert, {
    cooldownMinutes: 60,
    name: "1 oz alert",
    triggerOn: "in_stock",
    type: "category",
    weightGroup: "1oz",
  });

  await asUser.mutation(api.alerts.createAlert, {
    cooldownMinutes: 60,
    name: "Other weight alert",
    triggerOn: "in_stock",
    type: "category",
    weightGroup: "other",
  });

  const evaluation = await t.mutation(internal.alerts.evaluateAlertsForProducts, {
    evaluatedAt,
    productIds: ["sku_category_weight_1oz", "sku_category_weight_other"],
    source: "category_weight_test",
  });

  expect(evaluation.triggeredAlerts).toBe(2);

  await t.run(async (ctx) => {
    const history = await ctx.db
      .query("alertHistory")
      .withIndex("by_user", (q) => q.eq("userId", "user_category_weight_1"))
      .collect();

    expect(history).toHaveLength(2);

    const historyByAlertName = new Map(
      history.map((entry) => [entry.products[0]?.productName ?? "", entry]),
    );

    expect(historyByAlertName.get("One Ounce Product")?.products[0]?.productId).toBe(
      "sku_category_weight_1oz",
    );
    expect(historyByAlertName.get("Ten Ounce Product")?.products[0]?.productId).toBe(
      "sku_category_weight_other",
    );
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
      userTokenIdentifier: "user_free_eval_1",
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

    const resendCall = fetchMock.mock.calls.find(
      ([url]) => typeof url === "string" && url.includes("api.resend.com"),
    );
    if (!resendCall) {
      throw new Error("Expected a Resend fetch call");
    }

    const requestInit = resendCall[1] as RequestInit;
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
      expect(batches[0].sent).toBeTruthy();
      expect(batches[0].sentAt).toBeTypeOf("number");

      const history = await ctx.db
        .query("alertHistory")
        .withIndex("by_user", (q) => q.eq("userId", "user_digest_1"))
        .collect();

      expect(history).toHaveLength(1);
      expect(history[0].notificationSent).toBeTruthy();
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
      userTokenIdentifier: "user_skip_1",
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
      userTokenIdentifier: "user_skip_1",
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
      userTokenIdentifier: "user_skip_1",
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
    expect(batches[0].sent).toBeTruthy();

    const history = await ctx.db
      .query("alertHistory")
      .withIndex("by_user", (q) => q.eq("userId", "user_skip_1"))
      .collect();

    expect(history).toHaveLength(1);
    expect(history[0].notificationSent).toBeFalsy();
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
      expect(batches[0].sent).toBeFalsy();
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
          expect(batch.sent).toBeFalsy();
          expect(batch.scheduledFor).toBeGreaterThan(processNow);

          processNow = batch.scheduledFor + 1;
        } else {
          expect(batch.sent).toBeTruthy();
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
      expect(history[0].notificationSent).toBeFalsy();
      expect(history[0].notificationError).toContain("failed after 5 attempts");
    });
  } finally {
    fetchMock.mockRestore();
    process.env.RESEND_API_KEY = originalApiKey;
    process.env.RESEND_FROM_EMAIL = originalFromEmail;
    process.env.SITE_URL = originalSiteUrl;
  }
});
