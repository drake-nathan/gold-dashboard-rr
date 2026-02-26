/**
 * User Credit Cards - Convex Function Tests
 *
 * Tests CRUD operations for user credit cards stored in Convex.
 */

import { convexTest } from "convex-test";
import { expect, test } from "vitest";

import { api } from "./_generated/api";
import schema from "./schema";
import { modules } from "./test.setup";

// Test data
const testCard = {
  cardId: "test-card-1",
  cardType: "travel" as const,
  isCustomizable: true,
  isPreset: false,
  issuer: "Test Bank",
  name: "Test Card",
  pointsPerDollar: 2,
  valuePerPoint: 0.02,
};

const testPresetCard = {
  cardId: "freedom-unlimited",
  cardType: "cashback" as const,
  isCustomizable: true,
  isPreset: true,
  issuer: "Chase",
  name: "Chase Freedom Unlimited",
  pointsPerDollar: 1.5,
  valuePerPoint: 0.021,
};

// ============================================================================
// getUserCards Tests
// ============================================================================

test("getUserCards requires authentication", async () => {
  const t = convexTest(schema, modules);

  await expect(t.query(api.userCards.getUserCards, {})).rejects.toThrow("Authentication required");
});

test("getUserCards returns empty array for new user", async () => {
  const t = convexTest(schema, modules);
  const asUser = t.withIdentity({ name: "Test User", subject: "user_123" });

  const cards = await asUser.query(api.userCards.getUserCards, {});

  expect(cards).toStrictEqual([]);
});

test("getUserCards returns user's cards", async () => {
  const t = convexTest(schema, modules);
  const asUser = t.withIdentity({ name: "Test User", subject: "user_123" });

  // Add a card first
  await asUser.mutation(api.userCards.addCard, testCard);

  const cards = await asUser.query(api.userCards.getUserCards, {});

  expect(cards).toHaveLength(1);
  expect(cards[0]).toMatchObject({
    cardType: testCard.cardType,
    id: testCard.cardId,
    isCustomizable: testCard.isCustomizable,
    isPreset: testCard.isPreset,
    issuer: testCard.issuer,
    name: testCard.name,
    pointsPerDollar: testCard.pointsPerDollar,
    valuePerPoint: testCard.valuePerPoint,
  });
});

test("getUserCards isolates cards between users", async () => {
  const t = convexTest(schema, modules);
  const asUser1 = t.withIdentity({ name: "User 1", subject: "user_1" });
  const asUser2 = t.withIdentity({ name: "User 2", subject: "user_2" });

  // User 1 adds a card
  await asUser1.mutation(api.userCards.addCard, testCard);

  // User 2 adds a different card
  await asUser2.mutation(api.userCards.addCard, {
    ...testCard,
    cardId: "test-card-2",
    name: "User 2 Card",
  });

  // Each user should only see their own cards
  const user1Cards = await asUser1.query(api.userCards.getUserCards, {});
  const user2Cards = await asUser2.query(api.userCards.getUserCards, {});

  expect(user1Cards).toHaveLength(1);
  expect(user1Cards[0].name).toBe("Test Card");

  expect(user2Cards).toHaveLength(1);
  expect(user2Cards[0].name).toBe("User 2 Card");
});

// ============================================================================
// addCard Tests
// ============================================================================

test("addCard requires authentication", async () => {
  const t = convexTest(schema, modules);

  await expect(t.mutation(api.userCards.addCard, testCard)).rejects.toThrow(
    "Authentication required",
  );
});

test("addCard creates a new card", async () => {
  const t = convexTest(schema, modules);
  const asUser = t.withIdentity({ name: "Test User", subject: "user_123" });

  const result = await asUser.mutation(api.userCards.addCard, testCard);

  expect(result).toStrictEqual({ success: true });

  const cards = await asUser.query(api.userCards.getUserCards, {});

  expect(cards).toHaveLength(1);
  expect(cards[0].name).toBe(testCard.name);
});

test("addCard rejects duplicate card IDs", async () => {
  const t = convexTest(schema, modules);
  const asUser = t.withIdentity({ name: "Test User", subject: "user_123" });

  // Add the card first time
  await asUser.mutation(api.userCards.addCard, testCard);

  // Try to add the same card again
  await expect(asUser.mutation(api.userCards.addCard, testCard)).rejects.toThrow(
    "Card with ID test-card-1 already exists",
  );
});

test("addCard supports signup bonus", async () => {
  const t = convexTest(schema, modules);
  const asUser = t.withIdentity({ name: "Test User", subject: "user_123" });

  const cardWithBonus = {
    ...testCard,
    signupBonus: {
      enabled: true,
      pointsBonus: 60000,
      spendRequirement: 4000,
    },
  };

  await asUser.mutation(api.userCards.addCard, cardWithBonus);

  const cards = await asUser.query(api.userCards.getUserCards, {});

  expect(cards[0].signupBonus).toStrictEqual({
    enabled: true,
    pointsBonus: 60000,
    spendRequirement: 4000,
  });
});

// ============================================================================
// updateCard Tests
// ============================================================================

test("updateCard requires authentication", async () => {
  const t = convexTest(schema, modules);

  await expect(
    t.mutation(api.userCards.updateCard, {
      cardId: "test-card-1",
      name: "Updated Name",
    }),
  ).rejects.toThrow("Authentication required");
});

test("updateCard updates card fields", async () => {
  const t = convexTest(schema, modules);
  const asUser = t.withIdentity({ name: "Test User", subject: "user_123" });

  // Add a card first
  await asUser.mutation(api.userCards.addCard, testCard);

  // Update it
  await asUser.mutation(api.userCards.updateCard, {
    cardId: testCard.cardId,
    name: "Updated Card Name",
    pointsPerDollar: 3,
  });

  const cards = await asUser.query(api.userCards.getUserCards, {});

  expect(cards[0].name).toBe("Updated Card Name");
  expect(cards[0].pointsPerDollar).toBe(3);
  // Unchanged fields should remain
  expect(cards[0].valuePerPoint).toBe(testCard.valuePerPoint);
});

test("updateCard rejects non-existent card", async () => {
  const t = convexTest(schema, modules);
  const asUser = t.withIdentity({ name: "Test User", subject: "user_123" });

  await expect(
    asUser.mutation(api.userCards.updateCard, {
      cardId: "non-existent",
      name: "New Name",
    }),
  ).rejects.toThrow("Card non-existent not found");
});

test("updateCard can update signupBonus", async () => {
  const t = convexTest(schema, modules);
  const asUser = t.withIdentity({ name: "Test User", subject: "user_123" });

  // Add a card without signup bonus
  await asUser.mutation(api.userCards.addCard, testCard);

  // Update to add signup bonus
  await asUser.mutation(api.userCards.updateCard, {
    cardId: testCard.cardId,
    signupBonus: {
      enabled: true,
      pointsBonus: 75000,
      spendRequirement: 5000,
    },
  });

  const cards = await asUser.query(api.userCards.getUserCards, {});

  expect(cards[0].signupBonus).toStrictEqual({
    enabled: true,
    pointsBonus: 75000,
    spendRequirement: 5000,
  });
});

// ============================================================================
// deleteCard Tests
// ============================================================================

test("deleteCard requires authentication", async () => {
  const t = convexTest(schema, modules);

  await expect(t.mutation(api.userCards.deleteCard, { cardId: "test-card-1" })).rejects.toThrow(
    "Authentication required",
  );
});

test("deleteCard rejects non-existent card", async () => {
  const t = convexTest(schema, modules);
  const asUser = t.withIdentity({ name: "Test User", subject: "user_123" });

  await expect(
    asUser.mutation(api.userCards.deleteCard, { cardId: "non-existent" }),
  ).rejects.toThrow("Card non-existent not found");
});

test("deleteCard removes a custom card", async () => {
  const t = convexTest(schema, modules);
  const asUser = t.withIdentity({ name: "Test User", subject: "user_123" });

  // Add a custom card
  await asUser.mutation(api.userCards.addCard, testCard);

  // Delete it
  const result = await asUser.mutation(api.userCards.deleteCard, {
    cardId: testCard.cardId,
  });

  expect(result).toStrictEqual({ success: true });

  const cards = await asUser.query(api.userCards.getUserCards, {});

  expect(cards).toHaveLength(0);
});

test("deleteCard rejects preset cards", async () => {
  const t = convexTest(schema, modules);
  const asUser = t.withIdentity({ name: "Test User", subject: "user_123" });

  // Add a preset card
  await asUser.mutation(api.userCards.addCard, testPresetCard);

  // Try to delete it
  await expect(
    asUser.mutation(api.userCards.deleteCard, {
      cardId: testPresetCard.cardId,
    }),
  ).rejects.toThrow("Cannot delete preset cards");
});

// ============================================================================
// resetPresetCard Tests
// ============================================================================

test("resetPresetCard requires authentication", async () => {
  const t = convexTest(schema, modules);

  await expect(
    t.mutation(api.userCards.resetPresetCard, { cardId: "freedom-unlimited" }),
  ).rejects.toThrow("Authentication required");
});

test("resetPresetCard removes customized preset", async () => {
  const t = convexTest(schema, modules);
  const asUser = t.withIdentity({ name: "Test User", subject: "user_123" });

  // Add a preset card with custom values
  await asUser.mutation(api.userCards.addCard, testPresetCard);

  // Reset it
  const result = await asUser.mutation(api.userCards.resetPresetCard, {
    cardId: testPresetCard.cardId,
  });

  expect(result).toStrictEqual({ success: true });

  // Card should be gone (frontend will use defaults)
  const cards = await asUser.query(api.userCards.getUserCards, {});

  expect(cards).toHaveLength(0);
});

test("resetPresetCard rejects custom cards", async () => {
  const t = convexTest(schema, modules);
  const asUser = t.withIdentity({ name: "Test User", subject: "user_123" });

  // Add a custom card
  await asUser.mutation(api.userCards.addCard, testCard);

  // Try to reset it
  await expect(
    asUser.mutation(api.userCards.resetPresetCard, {
      cardId: testCard.cardId,
    }),
  ).rejects.toThrow("Can only reset preset cards");
});

// ============================================================================
// resetAllCards Tests
// ============================================================================

test("resetAllCards requires authentication", async () => {
  const t = convexTest(schema, modules);

  await expect(t.mutation(api.userCards.resetAllCards, {})).rejects.toThrow(
    "Authentication required",
  );
});

test("resetAllCards deletes all user cards", async () => {
  const t = convexTest(schema, modules);
  const asUser = t.withIdentity({ name: "Test User", subject: "user_123" });

  // Add multiple cards
  await asUser.mutation(api.userCards.addCard, testCard);
  await asUser.mutation(api.userCards.addCard, testPresetCard);
  await asUser.mutation(api.userCards.addCard, {
    ...testCard,
    cardId: "test-card-3",
    name: "Third Card",
  });

  // Reset all
  const result = await asUser.mutation(api.userCards.resetAllCards, {});

  expect(result).toStrictEqual({ deleted: 3, success: true });

  const cards = await asUser.query(api.userCards.getUserCards, {});

  expect(cards).toHaveLength(0);
});

// ============================================================================
// migrateFromLocalStorage Tests
// ============================================================================

test("migrateFromLocalStorage requires authentication", async () => {
  const t = convexTest(schema, modules);

  await expect(t.mutation(api.userCards.migrateFromLocalStorage, { cards: [] })).rejects.toThrow(
    "Authentication required",
  );
});

test("migrateFromLocalStorage imports new cards", async () => {
  const t = convexTest(schema, modules);
  const asUser = t.withIdentity({ name: "Test User", subject: "user_123" });

  const result = await asUser.mutation(api.userCards.migrateFromLocalStorage, {
    cards: [testCard, testPresetCard],
  });

  expect(result).toStrictEqual({ imported: 2, skipped: 0, success: true });

  const cards = await asUser.query(api.userCards.getUserCards, {});

  expect(cards).toHaveLength(2);
});

test("migrateFromLocalStorage skips existing cards", async () => {
  const t = convexTest(schema, modules);
  const asUser = t.withIdentity({ name: "Test User", subject: "user_123" });

  // Add one card first
  await asUser.mutation(api.userCards.addCard, testCard);

  // Try to migrate including the existing card
  const result = await asUser.mutation(api.userCards.migrateFromLocalStorage, {
    cards: [testCard, testPresetCard],
  });

  expect(result).toStrictEqual({ imported: 1, skipped: 1, success: true });

  const cards = await asUser.query(api.userCards.getUserCards, {});

  expect(cards).toHaveLength(2);
});

test("migrateFromLocalStorage handles empty array", async () => {
  const t = convexTest(schema, modules);
  const asUser = t.withIdentity({ name: "Test User", subject: "user_123" });

  const result = await asUser.mutation(api.userCards.migrateFromLocalStorage, {
    cards: [],
  });

  expect(result).toStrictEqual({ imported: 0, skipped: 0, success: true });

  const cards = await asUser.query(api.userCards.getUserCards, {});

  expect(cards).toHaveLength(0);
});
