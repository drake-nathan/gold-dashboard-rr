/**
 * Unit tests for Stripe subscription utility functions.
 * Tests pure logic without Convex runtime dependencies.
 */

import { expect, test } from "vitest";

import {
  determineAlertEntitlements,
  determineSubscriptionStatus,
  getPauseReasonFromSubscriptionStatus,
  type StripeSubscription,
} from "./stripeUtils";

// =============================================================================
// determineSubscriptionStatus Tests
// =============================================================================

test("returns free status for empty subscriptions array", () => {
  const result = determineSubscriptionStatus([]);

  expect(result.isPro).toBeFalsy();
  expect(result.status).toBe("free");
  expect(result.cancelAtPeriodEnd).toBeUndefined();
  expect(result.currentPeriodEnd).toBeUndefined();
});

test("returns isPro=true for active subscription", () => {
  const subscriptions: StripeSubscription[] = [
    {
      cancelAtPeriodEnd: false,
      currentPeriodEnd: 1_735_689_600_000,
      status: "active",
    },
  ];

  const result = determineSubscriptionStatus(subscriptions);

  expect(result.isPro).toBeTruthy();
  expect(result.status).toBe("active");
  expect(result.cancelAtPeriodEnd).toBeFalsy();
  expect(result.currentPeriodEnd).toBe(1_735_689_600_000);
});

test("returns isPro=true for trialing subscription", () => {
  const subscriptions: StripeSubscription[] = [
    {
      cancelAtPeriodEnd: false,
      currentPeriodEnd: 1_735_689_600_000,
      status: "trialing",
    },
  ];

  const result = determineSubscriptionStatus(subscriptions);

  expect(result.isPro).toBeTruthy();
  expect(result.status).toBe("trialing");
});

test("returns isPro=false for canceled subscription", () => {
  const subscriptions: StripeSubscription[] = [
    {
      cancelAtPeriodEnd: true,
      currentPeriodEnd: 1_735_689_600_000,
      status: "canceled",
    },
  ];

  const result = determineSubscriptionStatus(subscriptions);

  expect(result.isPro).toBeFalsy();
  expect(result.status).toBe("canceled");
  expect(result.cancelAtPeriodEnd).toBeTruthy();
});

test("returns isPro=false for past_due subscription", () => {
  const subscriptions: StripeSubscription[] = [
    {
      cancelAtPeriodEnd: false,
      currentPeriodEnd: 1_735_689_600_000,
      status: "past_due",
    },
  ];

  const result = determineSubscriptionStatus(subscriptions);

  expect(result.isPro).toBeFalsy();
  expect(result.status).toBe("past_due");
});

test("prioritizes active subscription over canceled", () => {
  const subscriptions: StripeSubscription[] = [
    {
      cancelAtPeriodEnd: true,
      currentPeriodEnd: 1_735_600_000_000,
      status: "canceled",
    },
    {
      cancelAtPeriodEnd: false,
      currentPeriodEnd: 1_735_689_600_000,
      status: "active",
    },
  ];

  const result = determineSubscriptionStatus(subscriptions);

  expect(result.isPro).toBeTruthy();
  expect(result.status).toBe("active");
  expect(result.currentPeriodEnd).toBe(1_735_689_600_000);
});

test("prioritizes trialing subscription over past_due", () => {
  const subscriptions: StripeSubscription[] = [
    {
      cancelAtPeriodEnd: false,
      currentPeriodEnd: 1_735_600_000_000,
      status: "past_due",
    },
    {
      cancelAtPeriodEnd: false,
      currentPeriodEnd: 1_735_689_600_000,
      status: "trialing",
    },
  ];

  const result = determineSubscriptionStatus(subscriptions);

  expect(result.isPro).toBeTruthy();
  expect(result.status).toBe("trialing");
});

test("handles subscription with cancelAtPeriodEnd=true", () => {
  const subscriptions: StripeSubscription[] = [
    {
      cancelAtPeriodEnd: true,
      currentPeriodEnd: 1_735_689_600_000,
      status: "active",
    },
  ];

  const result = determineSubscriptionStatus(subscriptions);

  expect(result.isPro).toBeTruthy();
  expect(result.status).toBe("active");
  expect(result.cancelAtPeriodEnd).toBeTruthy();
});

test("returns isPro=false for unpaid subscription", () => {
  const subscriptions: StripeSubscription[] = [
    {
      cancelAtPeriodEnd: false,
      currentPeriodEnd: 1_735_689_600_000,
      status: "unpaid",
    },
  ];

  const result = determineSubscriptionStatus(subscriptions);

  expect(result.isPro).toBeFalsy();
  expect(result.status).toBe("unpaid");
});

test("returns free status for incomplete subscription", () => {
  const subscriptions: StripeSubscription[] = [
    {
      cancelAtPeriodEnd: false,
      currentPeriodEnd: 1_735_689_600_000,
      status: "incomplete",
    },
  ];

  const result = determineSubscriptionStatus(subscriptions);

  expect(result.isPro).toBeFalsy();
  expect(result.status).toBe("free");
});

test("returns free status for incomplete_expired subscription", () => {
  const subscriptions: StripeSubscription[] = [
    {
      cancelAtPeriodEnd: false,
      currentPeriodEnd: 1_735_689_600_000,
      status: "incomplete_expired",
    },
  ];

  const result = determineSubscriptionStatus(subscriptions);

  expect(result.isPro).toBeFalsy();
  expect(result.status).toBe("free");
});

test("returns free status for paused subscription", () => {
  const subscriptions: StripeSubscription[] = [
    {
      cancelAtPeriodEnd: false,
      currentPeriodEnd: 1_735_689_600_000,
      status: "paused",
    },
  ];

  const result = determineSubscriptionStatus(subscriptions);

  expect(result.isPro).toBeFalsy();
  expect(result.status).toBe("free");
});

test("selects subscription with latest currentPeriodEnd when multiple active", () => {
  const subscriptions: StripeSubscription[] = [
    {
      cancelAtPeriodEnd: false,
      currentPeriodEnd: 1_735_600_000_000, // Earlier
      status: "active",
    },
    {
      cancelAtPeriodEnd: false,
      currentPeriodEnd: 1_735_689_600_000, // Later - should be selected
      status: "active",
    },
    {
      cancelAtPeriodEnd: false,
      currentPeriodEnd: 1_735_500_000_000, // Middle
      status: "trialing",
    },
  ];

  const result = determineSubscriptionStatus(subscriptions);

  expect(result.isPro).toBeTruthy();
  expect(result.status).toBe("active");
  expect(result.currentPeriodEnd).toBe(1_735_689_600_000);
});

// =============================================================================
// determineAlertEntitlements Tests
// =============================================================================

test("grants full alert access for active status", () => {
  const result = determineAlertEntitlements("active");

  expect(result.canManageAlerts).toBeTruthy();
  expect(result.canCreateAlerts).toBeTruthy();
  expect(result.canEnableAlerts).toBeTruthy();
  expect(result.canSendAlerts).toBeTruthy();
  expect(result.shouldPauseEnabledAlerts).toBeFalsy();
  expect(result.pauseReason).toBeUndefined();
});

test("grants full alert access for trialing status", () => {
  const result = determineAlertEntitlements("trialing");

  expect(result.canManageAlerts).toBeTruthy();
  expect(result.canCreateAlerts).toBeTruthy();
  expect(result.canEnableAlerts).toBeTruthy();
  expect(result.canSendAlerts).toBeTruthy();
  expect(result.shouldPauseEnabledAlerts).toBeFalsy();
  expect(result.pauseReason).toBeUndefined();
});

test("blocks alert sends and enabling for past_due", () => {
  const result = determineAlertEntitlements("past_due");

  expect(result.canManageAlerts).toBeTruthy();
  expect(result.canCreateAlerts).toBeFalsy();
  expect(result.canEnableAlerts).toBeFalsy();
  expect(result.canSendAlerts).toBeFalsy();
  expect(result.shouldPauseEnabledAlerts).toBeTruthy();
  expect(result.pauseReason).toBe("billing_hold");
});

test("blocks alert sends and enabling for unpaid", () => {
  const result = determineAlertEntitlements("unpaid");

  expect(result.canManageAlerts).toBeTruthy();
  expect(result.canCreateAlerts).toBeFalsy();
  expect(result.canEnableAlerts).toBeFalsy();
  expect(result.canSendAlerts).toBeFalsy();
  expect(result.shouldPauseEnabledAlerts).toBeTruthy();
  expect(result.pauseReason).toBe("billing_hold");
});

test("blocks alert sends and enabling for canceled", () => {
  const result = determineAlertEntitlements("canceled");

  expect(result.canManageAlerts).toBeTruthy();
  expect(result.canCreateAlerts).toBeFalsy();
  expect(result.canEnableAlerts).toBeFalsy();
  expect(result.canSendAlerts).toBeFalsy();
  expect(result.shouldPauseEnabledAlerts).toBeTruthy();
  expect(result.pauseReason).toBe("inactive_subscription");
});

test("blocks alert sends and enabling for free", () => {
  const result = determineAlertEntitlements("free");

  expect(result.canManageAlerts).toBeTruthy();
  expect(result.canCreateAlerts).toBeFalsy();
  expect(result.canEnableAlerts).toBeFalsy();
  expect(result.canSendAlerts).toBeFalsy();
  expect(result.shouldPauseEnabledAlerts).toBeTruthy();
  expect(result.pauseReason).toBe("inactive_subscription");
});

test("denies alert access for anonymous", () => {
  const result = determineAlertEntitlements("anonymous");

  expect(result.canManageAlerts).toBeFalsy();
  expect(result.canCreateAlerts).toBeFalsy();
  expect(result.canEnableAlerts).toBeFalsy();
  expect(result.canSendAlerts).toBeFalsy();
  expect(result.shouldPauseEnabledAlerts).toBeFalsy();
  expect(result.pauseReason).toBeUndefined();
});

// =============================================================================
// getPauseReasonFromSubscriptionStatus Tests
// =============================================================================

test("returns no pause reason for active status", () => {
  expect(getPauseReasonFromSubscriptionStatus("active")).toBeUndefined();
});

test("returns no pause reason for trialing status", () => {
  expect(getPauseReasonFromSubscriptionStatus("trialing")).toBeUndefined();
});

test("returns billing_hold for past_due status", () => {
  expect(getPauseReasonFromSubscriptionStatus("past_due")).toBe("billing_hold");
});

test("returns billing_hold for unpaid status", () => {
  expect(getPauseReasonFromSubscriptionStatus("unpaid")).toBe("billing_hold");
});

test("returns inactive_subscription for canceled status", () => {
  expect(getPauseReasonFromSubscriptionStatus("canceled")).toBe("inactive_subscription");
});

test("returns no pause reason for unsupported status", () => {
  expect(getPauseReasonFromSubscriptionStatus("incomplete")).toBeUndefined();
});
