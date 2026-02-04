/**
 * Unit tests for Stripe subscription utility functions.
 * Tests pure logic without Convex runtime dependencies.
 */

import { expect, test } from "vitest";

import {
  determineSubscriptionStatus,
  hasProAccess,
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

// =============================================================================
// hasProAccess Tests
// =============================================================================

test("hasProAccess returns false for empty array", () => {
  expect(hasProAccess([])).toBe(false);
});

test("hasProAccess returns true for active subscription", () => {
  const subscriptions: StripeSubscription[] = [{ status: "active" }];

  expect(hasProAccess(subscriptions)).toBe(true);
});

test("hasProAccess returns true for trialing subscription", () => {
  const subscriptions: StripeSubscription[] = [{ status: "trialing" }];

  expect(hasProAccess(subscriptions)).toBe(true);
});

test("hasProAccess returns false for canceled subscription", () => {
  const subscriptions: StripeSubscription[] = [{ status: "canceled" }];

  expect(hasProAccess(subscriptions)).toBe(false);
});

test("hasProAccess returns false for past_due subscription", () => {
  const subscriptions: StripeSubscription[] = [{ status: "past_due" }];

  expect(hasProAccess(subscriptions)).toBe(false);
});

test("hasProAccess returns true if any subscription is active", () => {
  const subscriptions: StripeSubscription[] = [
    { status: "canceled" },
    { status: "past_due" },
    { status: "active" },
  ];

  expect(hasProAccess(subscriptions)).toBe(true);
});
