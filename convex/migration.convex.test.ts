/**
 * Migration Integration Tests
 *
 * Tests the complete localStorage → Convex migration flow.
 */

import { convexTest } from "convex-test";
import { expect, test } from "vitest";

import { api } from "./_generated/api";
import schema from "./schema";
import { modules } from "./test.setup";

// Sample cards that would come from localStorage
const localStorageCards = [
  {
    cardId: "freedom-unlimited",
    cardType: "cashback" as const,
    isCustomizable: true,
    isPreset: true,
    issuer: "Chase",
    name: "Chase Freedom Unlimited",
    pointsPerDollar: 1.5,
    valuePerPoint: 0.021,
  },
  {
    cardId: "custom-card-1",
    cardType: "travel" as const,
    isCustomizable: true,
    isPreset: false,
    issuer: "AMEX",
    name: "My Custom Card",
    pointsPerDollar: 2,
    valuePerPoint: 0.02,
  },
];

test("complete migration flow works end-to-end", async () => {
  const t = convexTest(schema, modules);
  const asUser = t.withIdentity({ name: "Test User", subject: "user_123" });

  // Step 1: Check if migration is needed (should be true for new user)
  const needsMigration = await asUser.query(
    api.userSettings.needsMigration,
    {},
  );

  expect(needsMigration).toBe(true);

  // Step 2: Migrate cards from localStorage
  const migrateResult = await asUser.mutation(
    api.userCards.migrateFromLocalStorage,
    { cards: localStorageCards },
  );

  expect(migrateResult).toStrictEqual({
    imported: 2,
    skipped: 0,
    success: true,
  });

  // Step 3: Update settings with last selected card
  await asUser.mutation(api.userSettings.updateSettings, {
    costcoMembershipEnabled: true,
    lastSelectedCardId: "freedom-unlimited",
  });

  // Step 4: Mark migration complete
  await asUser.mutation(api.userSettings.markMigrationComplete, {});

  // Verify: Migration should no longer be needed
  const needsMigrationAfter = await asUser.query(
    api.userSettings.needsMigration,
    {},
  );

  expect(needsMigrationAfter).toBe(false);

  // Verify: Cards should be accessible
  const cards = await asUser.query(api.userCards.getUserCards, {});

  expect(cards).toHaveLength(2);

  // Verify: Settings should be correct
  const settings = await asUser.query(api.userSettings.getSettings, {});

  expect(settings).toMatchObject({
    costcoMembershipEnabled: true,
    lastSelectedCardId: "freedom-unlimited",
    localStorageMigrated: true,
  });
});

test("running migration twice does not duplicate cards", async () => {
  const t = convexTest(schema, modules);
  const asUser = t.withIdentity({ name: "Test User", subject: "user_123" });

  // First migration
  const firstResult = await asUser.mutation(
    api.userCards.migrateFromLocalStorage,
    { cards: localStorageCards },
  );

  expect(firstResult).toStrictEqual({ imported: 2, skipped: 0, success: true });

  // Second migration (same cards)
  const secondResult = await asUser.mutation(
    api.userCards.migrateFromLocalStorage,
    { cards: localStorageCards },
  );

  expect(secondResult).toStrictEqual({
    imported: 0,
    skipped: 2,
    success: true,
  });

  // Should still have only 2 cards
  const cards = await asUser.query(api.userCards.getUserCards, {});

  expect(cards).toHaveLength(2);
});

test("user can add new cards after migration completes", async () => {
  const t = convexTest(schema, modules);
  const asUser = t.withIdentity({ name: "Test User", subject: "user_123" });

  // Complete migration flow
  await asUser.mutation(api.userCards.migrateFromLocalStorage, {
    cards: localStorageCards,
  });
  await asUser.mutation(api.userSettings.markMigrationComplete, {});

  // Add a new card post-migration
  await asUser.mutation(api.userCards.addCard, {
    cardId: "new-post-migration-card",
    cardType: "cashback" as const,
    isCustomizable: true,
    isPreset: false,
    name: "New Card After Migration",
    pointsPerDollar: 3,
    valuePerPoint: 0.01,
  });

  // Should have original + new card
  const cards = await asUser.query(api.userCards.getUserCards, {});

  expect(cards).toHaveLength(3);
  expect(cards.find((c) => c.id === "new-post-migration-card")).toBeDefined();
});

test("migration correctly handles mixed new and existing cards", async () => {
  const t = convexTest(schema, modules);
  const asUser = t.withIdentity({ name: "Test User", subject: "user_123" });

  // Add one card before migration
  await asUser.mutation(api.userCards.addCard, localStorageCards[0]);

  // Migrate with both cards (one existing, one new)
  const result = await asUser.mutation(api.userCards.migrateFromLocalStorage, {
    cards: localStorageCards,
  });

  // Should import 1 and skip 1
  expect(result).toStrictEqual({ imported: 1, skipped: 1, success: true });

  // Should have 2 cards total
  const cards = await asUser.query(api.userCards.getUserCards, {});

  expect(cards).toHaveLength(2);
});
