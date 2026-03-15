import { expect, test } from "vitest";

import {
  addCustomCard,
  calculateCashbackPercentage,
  calculateSubBonusPercentage,
  calculateTotalCashbackPercentage,
  type CreditCard,
  creditCardSchema,
  DEFAULT_PRESET_CARDS,
  deleteCard,
  resetPresetCard,
  sortCards,
  updateCard,
} from "./credit-cards";

// ============================================================================
// ZOD VALIDATION TESTS
// ============================================================================

test("validates valid credit card", () => {
  const validCard = {
    cardType: "cashback" as const,
    id: "test-card",
    isCustomizable: false,
    isPreset: false,
    issuer: "Chase",
    name: "Test Card",
    pointsPerDollar: 1.5,
    valuePerPoint: 0.02,
  };

  const result = creditCardSchema.safeParse(validCard);

  expect(result.success).toBeTruthy();
});

test("rejects card with missing name", () => {
  const invalidCard = {
    cardType: "cashback" as const,
    id: "test-card",
    isCustomizable: false,
    isPreset: false,
    // name: missing
    pointsPerDollar: 1.5,
    valuePerPoint: 0.02,
  };

  const result = creditCardSchema.safeParse(invalidCard);

  expect(result.success).toBeFalsy();
});

test("rejects card with name too long", () => {
  const invalidCard = {
    cardType: "cashback" as const,
    id: "test-card",
    isCustomizable: false,
    isPreset: false,
    name: "A".repeat(101), // 101 chars, max is 100
    pointsPerDollar: 1.5,
    valuePerPoint: 0.02,
  };

  const result = creditCardSchema.safeParse(invalidCard);

  expect(result.success).toBeFalsy();
});

test("rejects card with points per dollar out of range", () => {
  const invalidCard = {
    cardType: "cashback" as const,
    id: "test-card",
    isCustomizable: false,
    isPreset: false,
    name: "Test Card",
    pointsPerDollar: 150, // Over max of 100
    valuePerPoint: 0.02,
  };

  const result = creditCardSchema.safeParse(invalidCard);

  expect(result.success).toBeFalsy();
});

test("rejects card with negative points per dollar", () => {
  const invalidCard = {
    cardType: "cashback" as const,
    id: "test-card",
    isCustomizable: false,
    isPreset: false,
    name: "Test Card",
    pointsPerDollar: -1,
    valuePerPoint: 0.02,
  };

  const result = creditCardSchema.safeParse(invalidCard);

  expect(result.success).toBeFalsy();
});

test("rejects card with value per point out of range", () => {
  const invalidCard = {
    cardType: "cashback" as const,
    id: "test-card",
    isCustomizable: false,
    isPreset: false,
    name: "Test Card",
    pointsPerDollar: 1.5,
    valuePerPoint: 1.5, // Over max of 1
  };

  const result = creditCardSchema.safeParse(invalidCard);

  expect(result.success).toBeFalsy();
});

test("accepts card with optional issuer", () => {
  const validCard = {
    cardType: "cashback" as const,
    id: "test-card",
    isCustomizable: false,
    isPreset: false,
    name: "Test Card",
    pointsPerDollar: 1.5,
    valuePerPoint: 0.02,
    // issuer is optional
  };

  const result = creditCardSchema.safeParse(validCard);

  expect(result.success).toBeTruthy();
});

// ============================================================================
// CASHBACK CALCULATION TESTS
// ============================================================================

test("calculates cashback percentage correctly for 2% flat card", () => {
  const card: CreditCard = {
    cardType: "cashback" as const,
    id: "test",
    isCustomizable: false,
    isPreset: false,
    name: "2% Flat",
    pointsPerDollar: 2,
    valuePerPoint: 0.01, // 1 cent per point
  };

  const cashback = calculateCashbackPercentage(card);

  expect(cashback).toBe(2); // 2 * 0.01 * 100 = 2%
});

test("calculates cashback percentage correctly for points card", () => {
  const card: CreditCard = {
    cardType: "cashback" as const,
    id: "test",
    isCustomizable: false,
    isPreset: false,
    name: "Chase Freedom",
    pointsPerDollar: 1.5,
    valuePerPoint: 0.021, // 2.1 cents per point
  };

  const cashback = calculateCashbackPercentage(card);

  expect(cashback).toBeCloseTo(3.15, 2); // 1.5 * 0.021 * 100 = 3.15%
});

test("calculates cashback for Robinhood Gold Card preset", () => {
  const robinhood = DEFAULT_PRESET_CARDS.find((c) => c.id === "robinhood");

  expect(robinhood).toBeDefined();

  const cashback = calculateCashbackPercentage(robinhood!);

  expect(cashback).toBe(3); // 3 pts @ 1¢ = 3%
});

test("handles zero cashback card", () => {
  const card: CreditCard = {
    cardType: "cashback" as const,
    id: "test",
    isCustomizable: false,
    isPreset: false,
    name: "No Rewards",
    pointsPerDollar: 0,
    valuePerPoint: 0,
  };

  const cashback = calculateCashbackPercentage(card);

  expect(cashback).toBe(0);
});

// ============================================================================
// ADD CUSTOM CARD TESTS
// ============================================================================

test("adds custom card with auto-generated ID", () => {
  const newCard = addCustomCard({
    isCustomizable: false,
    name: "My Custom Card",
    pointsPerDollar: 1.5,
    valuePerPoint: 0.02,
  });

  expect(newCard.id).toMatch(/^custom-/);
  expect(newCard.isPreset).toBeFalsy();
  expect(newCard.isCustomizable).toBeFalsy();
  expect(newCard.name).toBe("My Custom Card");
  expect(newCard.pointsPerDollar).toBe(1.5);
  expect(newCard.valuePerPoint).toBe(0.02);
});

test("adds custom card with optional issuer", () => {
  const newCard = addCustomCard({
    isCustomizable: false,
    issuer: "AmEx",
    name: "AmEx Gold",
    pointsPerDollar: 4,
    valuePerPoint: 0.01,
  });

  expect(newCard.issuer).toBe("AmEx");
});

test("validates custom card on creation", () => {
  expect(() =>
    addCustomCard({
      isCustomizable: false,
      name: "", // Invalid: empty name
      pointsPerDollar: 1.5,
      valuePerPoint: 0.02,
    }),
  ).toThrow();
});

// ============================================================================
// UPDATE CARD TESTS
// ============================================================================

test("updates card name", () => {
  const cards: CreditCard[] = [
    {
      cardType: "cashback" as const,
      id: "test-1",
      isCustomizable: false,
      isPreset: false,
      name: "Old Name",
      pointsPerDollar: 1.5,
      valuePerPoint: 0.02,
    },
  ];

  const updated = updateCard(cards, "test-1", { name: "New Name" });

  expect(updated[0].name).toBe("New Name");
  expect(updated[0].pointsPerDollar).toBe(1.5); // Unchanged
});

test("updates card points and value", () => {
  const cards: CreditCard[] = [
    {
      cardType: "cashback" as const,
      id: "test-1",
      isCustomizable: false,
      isPreset: false,
      name: "Test Card",
      pointsPerDollar: 1.5,
      valuePerPoint: 0.02,
    },
  ];

  const updated = updateCard(cards, "test-1", {
    pointsPerDollar: 2,
    valuePerPoint: 0.025,
  });

  expect(updated[0].pointsPerDollar).toBe(2);
  expect(updated[0].valuePerPoint).toBe(0.025);
});

test("does not modify other cards when updating one", () => {
  const cards: CreditCard[] = [
    {
      cardType: "cashback" as const,
      id: "test-1",
      isCustomizable: false,
      isPreset: false,
      name: "Card 1",
      pointsPerDollar: 1.5,
      valuePerPoint: 0.02,
    },
    {
      cardType: "cashback" as const,
      id: "test-2",
      isCustomizable: false,
      isPreset: false,
      name: "Card 2",
      pointsPerDollar: 2,
      valuePerPoint: 0.01,
    },
  ];

  const updated = updateCard(cards, "test-1", { name: "Updated Card 1" });

  expect(updated[0].name).toBe("Updated Card 1");
  expect(updated[1].name).toBe("Card 2"); // Unchanged
});

test("validates updated card data", () => {
  const cards: CreditCard[] = [
    {
      cardType: "cashback" as const,
      id: "test-1",
      isCustomizable: false,
      isPreset: false,
      name: "Test Card",
      pointsPerDollar: 1.5,
      valuePerPoint: 0.02,
    },
  ];

  expect(() =>
    updateCard(cards, "test-1", {
      pointsPerDollar: 150, // Invalid: over max
    }),
  ).toThrow();
});

// ============================================================================
// DELETE CARD TESTS
// ============================================================================

test("deletes custom card", () => {
  const cards: CreditCard[] = [
    {
      cardType: "cashback" as const,
      id: "custom-1",
      isCustomizable: false,
      isPreset: false,
      name: "Custom Card",
      pointsPerDollar: 1.5,
      valuePerPoint: 0.02,
    },
  ];

  const result = deleteCard(cards, "custom-1");

  expect(result).toHaveLength(0);
});

test("prevents deletion of preset cards", () => {
  const cards: CreditCard[] = [
    {
      cardType: "cashback" as const,
      id: "costco-visa",
      isCustomizable: true,
      isPreset: true,
      issuer: "Citi",
      name: "Costco Visa",
      pointsPerDollar: 2,
      valuePerPoint: 0.01,
    },
  ];

  expect(() => deleteCard(cards, "costco-visa")).toThrow("Cannot delete preset cards");
});

test("only deletes specified card", () => {
  const cards: CreditCard[] = [
    {
      cardType: "cashback" as const,
      id: "custom-1",
      isCustomizable: false,
      isPreset: false,
      name: "Card 1",
      pointsPerDollar: 1.5,
      valuePerPoint: 0.02,
    },
    {
      cardType: "cashback" as const,
      id: "custom-2",
      isCustomizable: false,
      isPreset: false,
      name: "Card 2",
      pointsPerDollar: 2,
      valuePerPoint: 0.01,
    },
  ];

  const result = deleteCard(cards, "custom-1");

  expect(result).toHaveLength(1);
  expect(result[0].id).toBe("custom-2");
});

// ============================================================================
// RESET PRESET CARD TESTS
// ============================================================================

test("resets modified preset card to defaults", () => {
  const modifiedPreset: CreditCard = {
    cardType: "cashback" as const,
    id: "costco-visa",
    isCustomizable: true,
    isPreset: true,
    issuer: "Citi",
    name: "Costco Visa (Modified)",
    pointsPerDollar: 3, // Modified
    valuePerPoint: 0.02, // Modified
  };

  const cards = [modifiedPreset];
  const result = resetPresetCard(cards, "costco-visa");

  const defaultCostcoCard = DEFAULT_PRESET_CARDS.find((c) => c.id === "costco-visa");

  expect(defaultCostcoCard).toBeDefined();

  expect(result[0]).toStrictEqual(defaultCostcoCard);
  expect(result[0].pointsPerDollar).toBe(2); // Reset to default
  expect(result[0].valuePerPoint).toBe(0.01); // Reset to default
});

test("throws error when resetting non-preset card", () => {
  const customCard: CreditCard = {
    cardType: "cashback" as const,
    id: "custom-123",
    isCustomizable: false,
    isPreset: false,
    name: "Custom Card",
    pointsPerDollar: 1.5,
    valuePerPoint: 0.02,
  };

  const cards = [customCard];

  expect(() => resetPresetCard(cards, "custom-123")).toThrow("Card is not a preset");
});

// ============================================================================
// SORT CARDS TESTS
// ============================================================================

test("sorts cards with presets first, then custom", () => {
  const cards: CreditCard[] = [
    {
      cardType: "cashback" as const,
      id: "custom-1",
      isCustomizable: false,
      isPreset: false,
      name: "Zebra Card",
      pointsPerDollar: 1,
      valuePerPoint: 0.01,
    },
    {
      cardType: "cashback" as const,
      id: "preset-1",
      isCustomizable: true,
      isPreset: true,
      name: "Alpha Preset",
      pointsPerDollar: 1,
      valuePerPoint: 0.01,
    },
    {
      cardType: "cashback" as const,
      id: "custom-2",
      isCustomizable: false,
      isPreset: false,
      name: "Apple Custom",
      pointsPerDollar: 1,
      valuePerPoint: 0.01,
    },
    {
      cardType: "cashback" as const,
      id: "preset-2",
      isCustomizable: true,
      isPreset: true,
      name: "Beta Preset",
      pointsPerDollar: 1,
      valuePerPoint: 0.01,
    },
  ];

  const sorted = sortCards(cards);

  // First two should be presets (alphabetically sorted)
  expect(sorted[0].isPreset).toBeTruthy();
  expect(sorted[0].name).toBe("Alpha Preset");
  expect(sorted[1].isPreset).toBeTruthy();
  expect(sorted[1].name).toBe("Beta Preset");

  // Last two should be custom (alphabetically sorted)
  expect(sorted[2].isPreset).toBeFalsy();
  expect(sorted[2].name).toBe("Apple Custom");
  expect(sorted[3].isPreset).toBeFalsy();
  expect(sorted[3].name).toBe("Zebra Card");
});

test("sorts empty array", () => {
  const sorted = sortCards([]);

  expect(sorted).toHaveLength(0);
});

test("sorts cards alphabetically within each group", () => {
  const cards: CreditCard[] = [
    {
      cardType: "cashback" as const,
      id: "p-3",
      isCustomizable: true,
      isPreset: true,
      name: "Zulu",
      pointsPerDollar: 1,
      valuePerPoint: 0.01,
    },
    {
      cardType: "cashback" as const,
      id: "p-1",
      isCustomizable: true,
      isPreset: true,
      name: "Alpha",
      pointsPerDollar: 1,
      valuePerPoint: 0.01,
    },
    {
      cardType: "cashback" as const,
      id: "p-2",
      isCustomizable: true,
      isPreset: true,
      name: "Bravo",
      pointsPerDollar: 1,
      valuePerPoint: 0.01,
    },
  ];

  const sorted = sortCards(cards);

  expect(sorted[0].name).toBe("Alpha");
  expect(sorted[1].name).toBe("Bravo");
  expect(sorted[2].name).toBe("Zulu");
});

// ============================================================================
// DEFAULT PRESET CARDS TESTS
// ============================================================================

test("default preset cards are valid", () => {
  for (const card of DEFAULT_PRESET_CARDS) {
    const result = creditCardSchema.safeParse(card);

    expect(result.success).toBeTruthy();
  }
});

test("default preset cards have unique IDs", () => {
  const ids = DEFAULT_PRESET_CARDS.map((c) => c.id);
  const uniqueIds = new Set(ids);

  expect(uniqueIds.size).toBe(ids.length);
});

test("default preset cards are all marked as presets", () => {
  for (const card of DEFAULT_PRESET_CARDS) {
    expect(card.isPreset).toBeTruthy();
  }
});

test("costco Visa is first in default presets", () => {
  expect(DEFAULT_PRESET_CARDS[0].id).toBe("costco-visa");
});

// ============================================================================
// SIGNUP BONUS CALCULATION TESTS
// ============================================================================

test("calculates SUB bonus percentage correctly", () => {
  const card: CreditCard = {
    cardType: "travel" as const,
    id: "test-card",
    isCustomizable: false,
    isPreset: false,
    name: "Test Card",
    pointsPerDollar: 1.5,
    signupBonus: {
      enabled: true,
      pointsBonus: 60_000,
      spendRequirement: 4000,
    },
    valuePerPoint: 0.021, // 2.1 cents per point
  };

  const subBonus = calculateSubBonusPercentage(card);

  // 60000 points / $4000 = 15 points per dollar
  // 15 points * 0.021 value = 0.315 = 31.5%
  expect(subBonus).toBeCloseTo(31.5, 2);
});

test("returns 0 when SUB is not enabled", () => {
  const card: CreditCard = {
    cardType: "cashback" as const,
    id: "test-card",
    isCustomizable: false,
    isPreset: false,
    name: "Test Card",
    pointsPerDollar: 1.5,
    signupBonus: {
      enabled: false,
      pointsBonus: 60_000,
      spendRequirement: 4000,
    },
    valuePerPoint: 0.02,
  };

  const subBonus = calculateSubBonusPercentage(card);

  expect(subBonus).toBe(0);
});

test("returns 0 when SUB is not defined", () => {
  const card: CreditCard = {
    cardType: "cashback" as const,
    id: "test-card",
    isCustomizable: false,
    isPreset: false,
    name: "Test Card",
    pointsPerDollar: 1.5,
    valuePerPoint: 0.02,
  };

  const subBonus = calculateSubBonusPercentage(card);

  expect(subBonus).toBe(0);
});

test("returns 0 when SUB has zero points bonus", () => {
  const card: CreditCard = {
    cardType: "cashback" as const,
    id: "test-card",
    isCustomizable: false,
    isPreset: false,
    name: "Test Card",
    pointsPerDollar: 1.5,
    signupBonus: {
      enabled: true,
      pointsBonus: 0,
      spendRequirement: 4000,
    },
    valuePerPoint: 0.02,
  };

  const subBonus = calculateSubBonusPercentage(card);

  expect(subBonus).toBe(0);
});

test("returns 0 when SUB has zero spend requirement", () => {
  const card: CreditCard = {
    cardType: "cashback" as const,
    id: "test-card",
    isCustomizable: false,
    isPreset: false,
    name: "Test Card",
    pointsPerDollar: 1.5,
    signupBonus: {
      enabled: true,
      pointsBonus: 60_000,
      spendRequirement: 0,
    },
    valuePerPoint: 0.02,
  };

  const subBonus = calculateSubBonusPercentage(card);

  expect(subBonus).toBe(0);
});

test("calculates total cashback percentage correctly with SUB", () => {
  const card: CreditCard = {
    cardType: "travel" as const,
    id: "test-card",
    isCustomizable: false,
    isPreset: false,
    name: "Test Card",
    pointsPerDollar: 1.5,
    signupBonus: {
      enabled: true,
      pointsBonus: 60_000,
      spendRequirement: 4000,
    },
    valuePerPoint: 0.021, // 2.1 cents per point
  };

  const baseCashback = calculateCashbackPercentage(card);
  const totalCashback = calculateTotalCashbackPercentage(card);

  // Base: 1.5 * 0.021 * 100 = 3.15%
  expect(baseCashback).toBeCloseTo(3.15, 2);

  // SUB: (60000 / 4000) * 0.021 * 100 = 31.5%
  // Total: 3.15% + 31.5% = 34.65%
  expect(totalCashback).toBeCloseTo(34.65, 2);
});

test("total cashback equals base cashback when no SUB", () => {
  const card: CreditCard = {
    cardType: "cashback" as const,
    id: "test-card",
    isCustomizable: false,
    isPreset: false,
    name: "Test Card",
    pointsPerDollar: 2,
    valuePerPoint: 0.01, // 1 cent per point = 2% cashback
  };

  const baseCashback = calculateCashbackPercentage(card);
  const totalCashback = calculateTotalCashbackPercentage(card);

  expect(baseCashback).toBe(2);
  expect(totalCashback).toBe(2);
});

test("calculates SUB bonus with high-value card", () => {
  const card: CreditCard = {
    cardType: "travel" as const,
    id: "test-card",
    isCustomizable: false,
    isPreset: false,
    name: "Premium Card",
    pointsPerDollar: 3,
    signupBonus: {
      enabled: true,
      pointsBonus: 100_000,
      spendRequirement: 5000,
    },
    valuePerPoint: 0.02, // 2 cents per point
  };

  const baseCashback = calculateCashbackPercentage(card);
  const subBonus = calculateSubBonusPercentage(card);
  const totalCashback = calculateTotalCashbackPercentage(card);

  // Base: 3.0 * 0.02 * 100 = 6%
  expect(baseCashback).toBeCloseTo(6, 2);

  // SUB: (100000 / 5000) * 0.02 * 100 = 40%
  expect(subBonus).toBeCloseTo(40, 2);

  // Total: 6% + 40% = 46%
  expect(totalCashback).toBeCloseTo(46, 2);
});
