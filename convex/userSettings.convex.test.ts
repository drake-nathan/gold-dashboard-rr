/**
 * User Settings - Convex Function Tests
 *
 * Tests user preferences and migration tracking.
 */

import { convexTest } from "convex-test";
import { expect, test } from "vitest";

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

// ============================================================================
// getSettings Tests
// ============================================================================

test("getSettings requires authentication", async () => {
  const t = convexTest(schema, modules);

  await expect(t.query(api.userSettings.getSettings, {})).rejects.toThrow(
    "Authentication required",
  );
});

test("getSettings returns null for new user", async () => {
  const t = convexTest(schema, modules);
  const asUser = t.withIdentity({ name: "Test User", subject: "user_123" });

  const settings = await asUser.query(api.userSettings.getSettings, {});

  expect(settings).toBeNull();
});

test("getSettings returns settings after update", async () => {
  const t = convexTest(schema, modules);
  const asUser = t.withIdentity({ name: "Test User", subject: "user_123" });

  // Update settings
  await asUser.mutation(api.userSettings.updateSettings, {
    costcoMembershipEnabled: true,
    lastSelectedCardId: "freedom-unlimited",
  });

  const settings = await asUser.query(api.userSettings.getSettings, {});

  expect(settings).toMatchObject({
    costcoMembershipEnabled: true,
    lastSelectedCardId: "freedom-unlimited",
    localStorageMigrated: false,
  });
});

test("getSettings reads token-identifier keyed settings after subject changes", async () => {
  const t = convexTest(schema, modules);

  await t.run(async (ctx) => {
    await ctx.db.insert("userSettings", {
      costcoMembershipEnabled: true,
      createdAt: Date.now(),
      lastSelectedCardId: "stored-card",
      localStorageMigrated: false,
      updatedAt: Date.now(),
      userId: "old_subject",
      userTokenIdentifier: "clerk|stable-user",
    });
  });

  const asUser = t.withIdentity({
    name: "Test User",
    subject: "new_subject",
    tokenIdentifier: "clerk|stable-user",
  });

  const settings = await asUser.query(api.userSettings.getSettings, {});

  expect(settings).toMatchObject({
    costcoMembershipEnabled: true,
    lastSelectedCardId: "stored-card",
    localStorageMigrated: false,
  });
});

// ============================================================================
// updateSettings Tests
// ============================================================================

test("updateSettings requires authentication", async () => {
  const t = convexTest(schema, modules);

  await expect(
    t.mutation(api.userSettings.updateSettings, {
      costcoMembershipEnabled: true,
    }),
  ).rejects.toThrow("Authentication required");
});

test("updateSettings creates new settings for new user", async () => {
  const t = convexTest(schema, modules);
  const asUser = t.withIdentity({ name: "Test User", subject: "user_123" });

  const result = await asUser.mutation(api.userSettings.updateSettings, {
    costcoMembershipEnabled: true,
    lastSelectedCardId: "test-card",
  });

  expect(result).toStrictEqual({ success: true });

  const settings = await asUser.query(api.userSettings.getSettings, {});

  expect(settings).toMatchObject({
    costcoMembershipEnabled: true,
    lastSelectedCardId: "test-card",
    localStorageMigrated: false,
  });
});

test("updateSettings updates existing settings", async () => {
  const t = convexTest(schema, modules);
  const asUser = t.withIdentity({ name: "Test User", subject: "user_123" });

  // Create initial settings
  await asUser.mutation(api.userSettings.updateSettings, {
    costcoMembershipEnabled: false,
    lastSelectedCardId: "card-1",
  });

  // Update only one field
  await asUser.mutation(api.userSettings.updateSettings, {
    lastSelectedCardId: "card-2",
  });

  const settings = await asUser.query(api.userSettings.getSettings, {});

  expect(settings).toMatchObject({
    costcoMembershipEnabled: false, // Unchanged
    lastSelectedCardId: "card-2", // Updated
  });
});

test("updateSettings preserves migration flag", async () => {
  const t = convexTest(schema, modules);
  const asUser = t.withIdentity({ name: "Test User", subject: "user_123" });

  // Mark migration complete first
  await asUser.mutation(api.userSettings.markMigrationComplete, {});

  // Update other settings
  await asUser.mutation(api.userSettings.updateSettings, {
    costcoMembershipEnabled: true,
  });

  const settings = await asUser.query(api.userSettings.getSettings, {});

  expect(settings?.localStorageMigrated).toBeTruthy();
});

test("updateSettings with empty object preserves existing settings", async () => {
  const t = convexTest(schema, modules);
  const asUser = t.withIdentity({ name: "Test User", subject: "user_123" });

  // Create initial settings
  await asUser.mutation(api.userSettings.updateSettings, {
    costcoMembershipEnabled: true,
    lastSelectedCardId: "card-1",
  });

  // Update with empty object (no fields provided)
  await asUser.mutation(api.userSettings.updateSettings, {});

  // Settings should be unchanged
  const settings = await asUser.query(api.userSettings.getSettings, {});

  expect(settings?.costcoMembershipEnabled).toBeTruthy();
  expect(settings?.lastSelectedCardId).toBe("card-1");
});

// ============================================================================
// needsMigration Tests
// ============================================================================

test("needsMigration returns true for new user", async () => {
  const t = convexTest(schema, modules);
  const asUser = t.withIdentity({ name: "Test User", subject: "user_123" });

  const needsMigration = await asUser.query(api.userSettings.needsMigration, {});

  expect(needsMigration).toBeTruthy();
});

test("needsMigration returns true when not migrated", async () => {
  const t = convexTest(schema, modules);
  const asUser = t.withIdentity({ name: "Test User", subject: "user_123" });

  // Create settings without completing migration
  await asUser.mutation(api.userSettings.updateSettings, {
    costcoMembershipEnabled: true,
  });

  const needsMigration = await asUser.query(api.userSettings.needsMigration, {});

  expect(needsMigration).toBeTruthy();
});

test("needsMigration returns false after marking complete", async () => {
  const t = convexTest(schema, modules);
  const asUser = t.withIdentity({ name: "Test User", subject: "user_123" });

  await asUser.mutation(api.userSettings.markMigrationComplete, {});

  const needsMigration = await asUser.query(api.userSettings.needsMigration, {});

  expect(needsMigration).toBeFalsy();
});

// ============================================================================
// markMigrationComplete Tests
// ============================================================================

test("markMigrationComplete sets flag for new user", async () => {
  const t = convexTest(schema, modules);
  const asUser = t.withIdentity({ name: "Test User", subject: "user_123" });

  const result = await asUser.mutation(api.userSettings.markMigrationComplete, {});

  expect(result).toStrictEqual({ success: true });

  const settings = await asUser.query(api.userSettings.getSettings, {});

  expect(settings).toMatchObject({
    costcoMembershipEnabled: false,
    localStorageMigrated: true,
  });
});

test("markMigrationComplete updates existing settings", async () => {
  const t = convexTest(schema, modules);
  const asUser = t.withIdentity({ name: "Test User", subject: "user_123" });

  // Create settings first
  await asUser.mutation(api.userSettings.updateSettings, {
    costcoMembershipEnabled: true,
    lastSelectedCardId: "my-card",
  });

  // Mark migration complete
  await asUser.mutation(api.userSettings.markMigrationComplete, {});

  const settings = await asUser.query(api.userSettings.getSettings, {});

  expect(settings).toMatchObject({
    costcoMembershipEnabled: true,
    lastSelectedCardId: "my-card",
    localStorageMigrated: true,
  });
});

// ============================================================================
// Digest Preferences Tests
// ============================================================================

const setupProUser = async (t: ReturnType<typeof withStripeComponent>, subject: string) => {
  await t.mutation(components.stripe.private.handleSubscriptionCreated, {
    cancelAtPeriodEnd: false,
    currentPeriodEnd: Date.now() + 86_400_000,
    metadata: { userId: subject },
    priceId: "price_pro_monthly",
    quantity: 1,
    status: "active",
    stripeCustomerId: `cus_${subject}`,
    stripeSubscriptionId: `sub_${subject}`,
  });
};

test("updateDigestPreferences requires Pro subscription to enable", async () => {
  const t = withStripeComponent();
  const asUser = t.withIdentity({ name: "Free User", subject: "free_user_1" });

  await expect(
    asUser.mutation(api.userSettings.updateDigestPreferences, { frequency: "daily" }),
  ).rejects.toThrow("Active Pro subscription required");
});

test("updateDigestPreferences allows turning off without subscription", async () => {
  const t = withStripeComponent();
  const asUser = t.withIdentity({ name: "Free User", subject: "free_user_2" });

  const result = await asUser.mutation(api.userSettings.updateDigestPreferences, {
    frequency: "off",
  });

  expect(result).toStrictEqual({ success: true });
  const settings = await asUser.query(api.userSettings.getSettings, {});
  expect(settings?.digestFrequency).toBe("off");
});

test("updateDigestPreferences persists daily/weekly for Pro user and exposes via getSettings", async () => {
  const t = withStripeComponent();
  await setupProUser(t, "pro_digest_1");
  const asUser = t.withIdentity({ name: "Pro User", subject: "pro_digest_1" });

  await asUser.mutation(api.userSettings.updateDigestPreferences, { frequency: "weekly" });

  const settings = await asUser.query(api.userSettings.getSettings, {});
  expect(settings).toMatchObject({
    digestFrequency: "weekly",
    digestWeeklyDayOfWeek: 1,
  });
});

test("listDigestSubscribers returns only matching frequency", async () => {
  const t = withStripeComponent();
  await setupProUser(t, "pro_digest_daily");
  await setupProUser(t, "pro_digest_weekly");

  const asDailyUser = t.withIdentity({ name: "Daily", subject: "pro_digest_daily" });
  const asWeeklyUser = t.withIdentity({ name: "Weekly", subject: "pro_digest_weekly" });
  await asDailyUser.mutation(api.userSettings.updateDigestPreferences, { frequency: "daily" });
  await asWeeklyUser.mutation(api.userSettings.updateDigestPreferences, { frequency: "weekly" });

  const dailySubs = await t.query(internal.userSettings.listDigestSubscribers, {
    frequency: "daily",
  });
  const weeklySubs = await t.query(internal.userSettings.listDigestSubscribers, {
    frequency: "weekly",
  });

  expect(dailySubs).toHaveLength(1);
  expect(dailySubs[0].userId).toBe("pro_digest_daily");
  expect(weeklySubs).toHaveLength(1);
  expect(weeklySubs[0].userId).toBe("pro_digest_weekly");
});

test("disableDigestForUser flips an enabled subscription to off", async () => {
  const t = withStripeComponent();
  await setupProUser(t, "pro_digest_unsub");
  const asUser = t.withIdentity({ name: "Unsub", subject: "pro_digest_unsub" });
  await asUser.mutation(api.userSettings.updateDigestPreferences, { frequency: "daily" });

  const result = await t.mutation(internal.userSettings.disableDigestForUser, {
    userId: "pro_digest_unsub",
  });

  expect(result).toStrictEqual({ changed: true, success: true });
  const settings = await asUser.query(api.userSettings.getSettings, {});
  expect(settings?.digestFrequency).toBe("off");
});

test("markDigestSent updates digestLastSentAt", async () => {
  const t = withStripeComponent();
  await setupProUser(t, "pro_digest_marked");
  const asUser = t.withIdentity({
    name: "Marked",
    subject: "pro_digest_marked",
    tokenIdentifier: "pro_digest_marked",
  });
  await asUser.mutation(api.userSettings.updateDigestPreferences, { frequency: "daily" });

  const sentAt = Date.now();
  const result = await t.mutation(internal.userSettings.markDigestSent, {
    sentAt,
    userTokenIdentifier: "pro_digest_marked",
  });

  expect(result).toStrictEqual({ success: true });
  const settings = await asUser.query(api.userSettings.getSettings, {});
  expect(settings?.digestLastSentAt).toBe(sentAt);
});
