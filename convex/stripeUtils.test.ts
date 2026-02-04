/**
 * Unit tests for Stripe subscription utility functions.
 * Tests pure logic without Convex runtime dependencies.
 */

import { expect, test } from "vitest";

import {
  determineSubscriptionStatus,
  type StripeSubscription,
} from "./stripeUtils";

// =============================================================================
// determineSubscriptionStatus Tests
// =============================================================================

test("returns free status for empty subscriptions array", () => {
  const result = determineSubscriptionStatus([]);

  expect(result.isPro).toBe(false);
  expect(result.status).toBe("free");
  expect(result.cancelAtPeriodEnd).toBeUndefined();
  expect(result.currentPeriodEnd).toBeUndefined();
});

test("returns isPro=true for active subscription", () => {
  const subscriptions: StripeSubscription[] = [
    {
      cancelAtPeriodEnd: false,
      currentPeriodEnd: 1735689600000,
      status: "active",
    },
  ];

  const result = determineSubscriptionStatus(subscriptions);

  expect(result.isPro).toBe(true);
  expect(result.status).toBe("active");
  expect(result.cancelAtPeriodEnd).toBe(false);
  expect(result.currentPeriodEnd).toBe(1735689600000);
});

test("returns isPro=true for trialing subscription", () => {
  const subscriptions: StripeSubscription[] = [
    {
      cancelAtPeriodEnd: false,
      currentPeriodEnd: 1735689600000,
      status: "trialing",
    },
  ];

  const result = determineSubscriptionStatus(subscriptions);

  expect(result.isPro).toBe(true);
  expect(result.status).toBe("trialing");
});

test("returns isPro=false for canceled subscription", () => {
  const subscriptions: StripeSubscription[] = [
    {
      cancelAtPeriodEnd: true,
      currentPeriodEnd: 1735689600000,
      status: "canceled",
    },
  ];

  const result = determineSubscriptionStatus(subscriptions);

  expect(result.isPro).toBe(false);
  expect(result.status).toBe("canceled");
  expect(result.cancelAtPeriodEnd).toBe(true);
});

test("returns isPro=false for past_due subscription", () => {
  const subscriptions: StripeSubscription[] = [
    {
      cancelAtPeriodEnd: false,
      currentPeriodEnd: 1735689600000,
      status: "past_due",
    },
  ];

  const result = determineSubscriptionStatus(subscriptions);

  expect(result.isPro).toBe(false);
  expect(result.status).toBe("past_due");
});

test("prioritizes active subscription over canceled", () => {
  const subscriptions: StripeSubscription[] = [
    {
      cancelAtPeriodEnd: true,
      currentPeriodEnd: 1735600000000,
      status: "canceled",
    },
    {
      cancelAtPeriodEnd: false,
      currentPeriodEnd: 1735689600000,
      status: "active",
    },
  ];

  const result = determineSubscriptionStatus(subscriptions);

  expect(result.isPro).toBe(true);
  expect(result.status).toBe("active");
  expect(result.currentPeriodEnd).toBe(1735689600000);
});

test("prioritizes trialing subscription over past_due", () => {
  const subscriptions: StripeSubscription[] = [
    {
      cancelAtPeriodEnd: false,
      currentPeriodEnd: 1735600000000,
      status: "past_due",
    },
    {
      cancelAtPeriodEnd: false,
      currentPeriodEnd: 1735689600000,
      status: "trialing",
    },
  ];

  const result = determineSubscriptionStatus(subscriptions);

  expect(result.isPro).toBe(true);
  expect(result.status).toBe("trialing");
});

test("handles subscription with cancelAtPeriodEnd=true", () => {
  const subscriptions: StripeSubscription[] = [
    {
      cancelAtPeriodEnd: true,
      currentPeriodEnd: 1735689600000,
      status: "active",
    },
  ];

  const result = determineSubscriptionStatus(subscriptions);

  expect(result.isPro).toBe(true);
  expect(result.status).toBe("active");
  expect(result.cancelAtPeriodEnd).toBe(true);
});

test("returns isPro=false for unpaid subscription", () => {
  const subscriptions: StripeSubscription[] = [
    {
      cancelAtPeriodEnd: false,
      currentPeriodEnd: 1735689600000,
      status: "unpaid",
    },
  ];

  const result = determineSubscriptionStatus(subscriptions);

  expect(result.isPro).toBe(false);
  expect(result.status).toBe("unpaid");
});

test("returns free status for incomplete subscription", () => {
  const subscriptions: StripeSubscription[] = [
    {
      cancelAtPeriodEnd: false,
      currentPeriodEnd: 1735689600000,
      status: "incomplete",
    },
  ];

  const result = determineSubscriptionStatus(subscriptions);

  expect(result.isPro).toBe(false);
  expect(result.status).toBe("free");
});

test("returns free status for incomplete_expired subscription", () => {
  const subscriptions: StripeSubscription[] = [
    {
      cancelAtPeriodEnd: false,
      currentPeriodEnd: 1735689600000,
      status: "incomplete_expired",
    },
  ];

  const result = determineSubscriptionStatus(subscriptions);

  expect(result.isPro).toBe(false);
  expect(result.status).toBe("free");
});

test("returns free status for paused subscription", () => {
  const subscriptions: StripeSubscription[] = [
    {
      cancelAtPeriodEnd: false,
      currentPeriodEnd: 1735689600000,
      status: "paused",
    },
  ];

  const result = determineSubscriptionStatus(subscriptions);

  expect(result.isPro).toBe(false);
  expect(result.status).toBe("free");
});

test("selects subscription with latest currentPeriodEnd when multiple active", () => {
  const subscriptions: StripeSubscription[] = [
    {
      cancelAtPeriodEnd: false,
      currentPeriodEnd: 1735600000000, // Earlier
      status: "active",
    },
    {
      cancelAtPeriodEnd: false,
      currentPeriodEnd: 1735689600000, // Later - should be selected
      status: "active",
    },
    {
      cancelAtPeriodEnd: false,
      currentPeriodEnd: 1735500000000, // Middle
      status: "trialing",
    },
  ];

  const result = determineSubscriptionStatus(subscriptions);

  expect(result.isPro).toBe(true);
  expect(result.status).toBe("active");
  expect(result.currentPeriodEnd).toBe(1735689600000);
});
