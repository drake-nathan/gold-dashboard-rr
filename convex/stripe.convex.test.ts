import { StripeSubscriptions } from "@convex-dev/stripe";
import { convexTest } from "convex-test";
import StripeSdk from "stripe";
import { afterEach, expect, test, vi } from "vitest";

import stripeComponentSchema from "../node_modules/@convex-dev/stripe/dist/component/schema.js";
import { api, components } from "./_generated/api";
import schema from "./schema";
import { modules } from "./test.setup";

const stripeComponentModules = import.meta.glob(
  "../node_modules/@convex-dev/stripe/dist/component/**/*.js",
);

const stripe = new StripeSdk("sk_test_dashboard_gold");

const withStripeComponent = () => {
  const t = convexTest(schema, modules);
  t.registerComponent("stripe", stripeComponentSchema, stripeComponentModules);
  return t;
};

const sendStripeWebhook = async (
  t: ReturnType<typeof withStripeComponent>,
  event: Record<string, unknown>,
) => {
  const payload = JSON.stringify(event);
  const signature = stripe.webhooks.generateTestHeaderString({
    payload,
    secret: "whsec_dashboard_gold",
  });

  return t.fetch("/stripe/webhook", {
    body: payload,
    headers: {
      "Content-Type": "application/json",
      "stripe-signature": signature,
    },
    method: "POST",
  });
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

test("createCheckoutSession uses the configured price ID and existing token customer", async () => {
  vi.stubEnv("SITE_URL", "https://dashboard.gold");
  vi.stubEnv("STRIPE_PRICE_ID", "price_configured");

  const t = withStripeComponent();
  const asUser = t.withIdentity({
    email: "checkout@example.com",
    name: "Checkout User",
    subject: "user_checkout_subject",
    tokenIdentifier: "clerk|checkout-user",
  });

  await t.mutation(components.stripe.public.createOrUpdateCustomer, {
    email: "checkout@example.com",
    metadata: { userId: "clerk|checkout-user" },
    name: "Checkout User",
    stripeCustomerId: "cus_existing_token",
  });

  const getOrCreateCustomerSpy = vi.spyOn(StripeSubscriptions.prototype, "getOrCreateCustomer");
  const createCheckoutSessionSpy = vi
    .spyOn(StripeSubscriptions.prototype, "createCheckoutSession")
    .mockResolvedValue({
      sessionId: "cs_test_1",
      url: "https://checkout.stripe.com/pay/cs_test_1",
    });

  const result = await asUser.action(api.stripe.createCheckoutSession, {
    priceId: "price_tampered",
  });

  expect(result).toStrictEqual({
    url: "https://checkout.stripe.com/pay/cs_test_1",
  });
  expect(getOrCreateCustomerSpy).not.toHaveBeenCalled();
  expect(createCheckoutSessionSpy).toHaveBeenCalledWith(expect.anything(), {
    cancelUrl: "https://dashboard.gold?checkout=canceled",
    customerId: "cus_existing_token",
    mode: "subscription",
    priceId: "price_configured",
    subscriptionMetadata: { userId: "clerk|checkout-user" },
    successUrl: "https://dashboard.gold?checkout=success",
  });
});

test("createCheckoutSession falls back to a subject-linked customer before creating a new one", async () => {
  vi.stubEnv("SITE_URL", "https://dashboard.gold");
  vi.stubEnv("STRIPE_PRICE_ID", "price_configured");

  const t = withStripeComponent();
  const asUser = t.withIdentity({
    email: "legacy@example.com",
    name: "Legacy User",
    subject: "user_legacy_subject",
    tokenIdentifier: "clerk|legacy-user",
  });

  await t.mutation(components.stripe.public.createOrUpdateCustomer, {
    email: "legacy@example.com",
    metadata: { userId: "user_legacy_subject" },
    name: "Legacy User",
    stripeCustomerId: "cus_subject_only",
  });

  const getOrCreateCustomerSpy = vi.spyOn(StripeSubscriptions.prototype, "getOrCreateCustomer");
  const createCheckoutSessionSpy = vi
    .spyOn(StripeSubscriptions.prototype, "createCheckoutSession")
    .mockResolvedValue({
      sessionId: "cs_test_legacy",
      url: "https://checkout.stripe.com/pay/cs_test_legacy",
    });

  const result = await asUser.action(api.stripe.createCheckoutSession, {
    priceId: "price_configured",
  });

  expect(result).toStrictEqual({
    url: "https://checkout.stripe.com/pay/cs_test_legacy",
  });
  expect(getOrCreateCustomerSpy).not.toHaveBeenCalled();
  expect(createCheckoutSessionSpy).toHaveBeenCalledWith(expect.anything(), {
    cancelUrl: "https://dashboard.gold?checkout=canceled",
    customerId: "cus_subject_only",
    mode: "subscription",
    priceId: "price_configured",
    subscriptionMetadata: { userId: "clerk|legacy-user" },
    successUrl: "https://dashboard.gold?checkout=success",
  });
});

test("createCheckoutSession returns the user to the requested in-app route", async () => {
  vi.stubEnv("SITE_URL", "https://dashboard.gold");
  vi.stubEnv("STRIPE_PRICE_ID", "price_configured");

  const t = withStripeComponent();
  const asUser = t.withIdentity({
    email: "alerts@example.com",
    name: "Alerts User",
    subject: "user_alerts_subject",
    tokenIdentifier: "clerk|alerts-user",
  });

  await t.mutation(components.stripe.public.createOrUpdateCustomer, {
    email: "alerts@example.com",
    metadata: { userId: "clerk|alerts-user" },
    name: "Alerts User",
    stripeCustomerId: "cus_alerts_token",
  });

  const createCheckoutSessionSpy = vi
    .spyOn(StripeSubscriptions.prototype, "createCheckoutSession")
    .mockResolvedValue({
      sessionId: "cs_test_alerts",
      url: "https://checkout.stripe.com/pay/cs_test_alerts",
    });

  const result = await asUser.action(api.stripe.createCheckoutSession, {
    priceId: "price_configured",
    returnPath: "/alerts?type=sku",
  });

  expect(result).toStrictEqual({
    url: "https://checkout.stripe.com/pay/cs_test_alerts",
  });
  expect(createCheckoutSessionSpy).toHaveBeenCalledWith(expect.anything(), {
    cancelUrl: "https://dashboard.gold/alerts?type=sku&checkout=canceled",
    customerId: "cus_alerts_token",
    mode: "subscription",
    priceId: "price_configured",
    subscriptionMetadata: { userId: "clerk|alerts-user" },
    successUrl: "https://dashboard.gold/alerts?type=sku&checkout=success",
  });
});

test("createPortalSession creates a customer when needed and returns the portal URL", async () => {
  vi.stubEnv("SITE_URL", "https://dashboard.gold");

  const t = withStripeComponent();
  const asUser = t.withIdentity({
    email: "portal@example.com",
    name: "Portal User",
    subject: "user_portal_subject",
    tokenIdentifier: "clerk|portal-user",
  });

  const getOrCreateCustomerSpy = vi
    .spyOn(StripeSubscriptions.prototype, "getOrCreateCustomer")
    .mockResolvedValue({
      customerId: "cus_created_for_portal",
      isNew: true,
    });
  const createCustomerPortalSessionSpy = vi
    .spyOn(StripeSubscriptions.prototype, "createCustomerPortalSession")
    .mockResolvedValue({
      url: "https://billing.stripe.com/p/session_123",
    });

  const result = await asUser.action(api.stripe.createPortalSession, {});

  expect(result).toStrictEqual({
    url: "https://billing.stripe.com/p/session_123",
  });
  expect(getOrCreateCustomerSpy).toHaveBeenCalledWith(expect.anything(), {
    email: "portal@example.com",
    name: "Portal User",
    userId: "clerk|portal-user",
  });
  expect(createCustomerPortalSessionSpy).toHaveBeenCalledWith(expect.anything(), {
    customerId: "cus_created_for_portal",
    returnUrl: "https://dashboard.gold",
  });
});

test("getSubscriptionStatus returns anonymous defaults when no identity is present", async () => {
  const t = withStripeComponent();

  const result = await t.query(api.stripe.getSubscriptionStatus, {});

  expect(result).toStrictEqual({
    alertEntitlements: {
      canCreateAlerts: false,
      canEnableAlerts: false,
      canManageAlerts: false,
      canSendAlerts: false,
      shouldPauseEnabledAlerts: false,
    },
    isPro: false,
    status: "anonymous",
  });
});

test("getSubscriptionStatus merges token and legacy subscriptions and prefers the active one", async () => {
  const t = withStripeComponent();
  const asUser = t.withIdentity({
    name: "Merged User",
    subject: "user_status_subject",
    tokenIdentifier: "clerk|status-user",
  });

  await t.mutation(components.stripe.private.handleSubscriptionCreated, {
    cancelAtPeriodEnd: true,
    currentPeriodEnd: Date.now() + 3_600_000,
    metadata: { userId: "clerk|status-user" },
    priceId: "price_old",
    quantity: 1,
    status: "canceled",
    stripeCustomerId: "cus_status_1",
    stripeSubscriptionId: "sub_status_1",
  });

  await t.mutation(components.stripe.private.handleSubscriptionCreated, {
    cancelAtPeriodEnd: false,
    currentPeriodEnd: Date.now() + 86_400_000,
    metadata: { userId: "user_status_subject" },
    priceId: "price_active",
    quantity: 1,
    status: "active",
    stripeCustomerId: "cus_status_2",
    stripeSubscriptionId: "sub_status_2",
  });

  const result = await asUser.query(api.stripe.getSubscriptionStatus, {});

  expect(result).toMatchObject({
    alertEntitlements: {
      canCreateAlerts: true,
      canEnableAlerts: true,
      canManageAlerts: true,
      canSendAlerts: true,
      shouldPauseEnabledAlerts: false,
    },
    currentPeriodEnd: expect.any(Number),
    isPro: true,
    status: "active",
    userId: "clerk|status-user",
  });
});

test("customer.subscription.updated webhook pauses enabled alerts and updates subscription status", async () => {
  vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_dashboard_gold");
  vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_dashboard_gold");

  const t = withStripeComponent();
  const asUser = t.withIdentity({
    name: "Webhook User",
    subject: "user_webhook_subject",
    tokenIdentifier: "clerk|webhook-user",
  });

  await t.mutation(components.stripe.private.handleSubscriptionCreated, {
    cancelAtPeriodEnd: false,
    currentPeriodEnd: Date.now() + 86_400_000,
    metadata: { userId: "clerk|webhook-user" },
    priceId: "price_pro_monthly",
    quantity: 1,
    status: "active",
    stripeCustomerId: "cus_webhook_1",
    stripeSubscriptionId: "sub_webhook_1",
  });

  const created = await asUser.mutation(api.alerts.createAlert, {
    name: "Webhook-managed alert",
    productId: "sku-webhook-1",
    triggerOn: "in_stock",
    type: "sku",
  });

  const response = await sendStripeWebhook(t, {
    data: {
      object: {
        cancel_at: null,
        cancel_at_period_end: false,
        customer: "cus_webhook_1",
        id: "sub_webhook_1",
        items: {
          data: [
            {
              current_period_end: Math.floor((Date.now() + 43_200_000) / 1000),
              price: { id: "price_pro_monthly" },
              quantity: 1,
            },
          ],
        },
        metadata: {},
        status: "past_due",
      },
    },
    id: "evt_subscription_updated",
    object: "event",
    type: "customer.subscription.updated",
  });

  expect(response.status).toBe(200);

  const alerts = await asUser.query(api.alerts.getAlerts, {});
  const subscriptionStatus = await asUser.query(api.stripe.getSubscriptionStatus, {});

  expect(alerts[0]).toMatchObject({
    _id: created.alertId,
    enabled: false,
    pauseReason: "billing_hold",
  });
  expect(subscriptionStatus).toMatchObject({
    isPro: false,
    status: "past_due",
    userId: "clerk|webhook-user",
  });
  expect(subscriptionStatus.alertEntitlements.canSendAlerts).toBeFalsy();
});

test("customer.subscription.deleted webhook disables alerts and marks the subscription canceled", async () => {
  vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_dashboard_gold");
  vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_dashboard_gold");

  const t = withStripeComponent();
  const asUser = t.withIdentity({
    name: "Canceled User",
    subject: "user_canceled_subject",
    tokenIdentifier: "clerk|canceled-user",
  });

  await t.mutation(components.stripe.private.handleSubscriptionCreated, {
    cancelAtPeriodEnd: false,
    currentPeriodEnd: Date.now() + 86_400_000,
    metadata: { userId: "clerk|canceled-user" },
    priceId: "price_pro_monthly",
    quantity: 1,
    status: "active",
    stripeCustomerId: "cus_webhook_2",
    stripeSubscriptionId: "sub_webhook_2",
  });

  const created = await asUser.mutation(api.alerts.createAlert, {
    name: "Canceled subscription alert",
    productId: "sku-webhook-2",
    triggerOn: "in_stock",
    type: "sku",
  });

  const response = await sendStripeWebhook(t, {
    data: {
      object: {
        cancel_at: null,
        cancel_at_period_end: true,
        customer: "cus_webhook_2",
        id: "sub_webhook_2",
        items: {
          data: [
            {
              current_period_end: Math.floor((Date.now() + 43_200_000) / 1000),
              price: { id: "price_pro_monthly" },
              quantity: 1,
            },
          ],
        },
        metadata: {},
      },
    },
    id: "evt_subscription_deleted",
    object: "event",
    type: "customer.subscription.deleted",
  });

  expect(response.status).toBe(200);

  const alerts = await asUser.query(api.alerts.getAlerts, {});
  const subscriptionStatus = await asUser.query(api.stripe.getSubscriptionStatus, {});

  expect(alerts[0]).toMatchObject({
    _id: created.alertId,
    enabled: false,
    pauseReason: "inactive_subscription",
  });
  expect(subscriptionStatus).toMatchObject({
    isPro: false,
    status: "canceled",
    userId: "clerk|canceled-user",
  });
  expect(subscriptionStatus.alertEntitlements.canCreateAlerts).toBeFalsy();
});
