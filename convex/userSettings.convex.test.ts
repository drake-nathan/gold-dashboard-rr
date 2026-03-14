/**
 * User Settings - Convex Function Tests
 *
 * Tests user preferences and migration tracking.
 */

import { convexTest } from "convex-test";
import { expect, test } from "vitest";

import { api } from "./_generated/api";
import schema from "./schema";
import { modules } from "./test.setup";

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
