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
  vi.unstubAllEnvs();
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
