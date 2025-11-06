import { expect, test } from "vitest";

import {
  addCustomCard,
  calculateCashbackPercentage,
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
    id: "test-card",
    isCustomizable: false,
    isPreset: false,
    issuer: "Chase",
    name: "Test Card",
    pointsPerDollar: 1.5,
    valuePerPoint: 0.02,
  };

  const result = creditCardSchema.safeParse(validCard);

  expect(result.success).toBe(true);
});

test("rejects card with missing name", () => {
  const invalidCard = {
    id: "test-card",
    isCustomizable: false,
    isPreset: false,
    // name: missing
    pointsPerDollar: 1.5,
    valuePerPoint: 0.02,
  };

  const result = creditCardSchema.safeParse(invalidCard);

  expect(result.success).toBe(false);
});

test("rejects card with name too long", () => {
  const invalidCard = {
    id: "test-card",
    isCustomizable: false,
    isPreset: false,
    name: "A".repeat(101), // 101 chars, max is 100
    pointsPerDollar: 1.5,
    valuePerPoint: 0.02,
  };

  const result = creditCardSchema.safeParse(invalidCard);

  expect(result.success).toBe(false);
});

test("rejects card with points per dollar out of range", () => {
  const invalidCard = {
    id: "test-card",
    isCustomizable: false,
    isPreset: false,
    name: "Test Card",
    pointsPerDollar: 150, // Over max of 100
    valuePerPoint: 0.02,
  };

  const result = creditCardSchema.safeParse(invalidCard);

  expect(result.success).toBe(false);
});

test("rejects card with negative points per dollar", () => {
  const invalidCard = {
    id: "test-card",
    isCustomizable: false,
    isPreset: false,
    name: "Test Card",
    pointsPerDollar: -1,
    valuePerPoint: 0.02,
  };

  const result = creditCardSchema.safeParse(invalidCard);

  expect(result.success).toBe(false);
});

test("rejects card with value per point out of range", () => {
  const invalidCard = {
    id: "test-card",
    isCustomizable: false,
    isPreset: false,
    name: "Test Card",
    pointsPerDollar: 1.5,
    valuePerPoint: 1.5, // Over max of 1
  };

  const result = creditCardSchema.safeParse(invalidCard);

  expect(result.success).toBe(false);
});

test("accepts card with optional issuer", () => {
  const validCard = {
    id: "test-card",
    isCustomizable: false,
    isPreset: false,
    name: "Test Card",
    pointsPerDollar: 1.5,
    valuePerPoint: 0.02,
    // issuer is optional
  };

  const result = creditCardSchema.safeParse(validCard);

  expect(result.success).toBe(true);
});

// ============================================================================
// CASHBACK CALCULATION TESTS
// ============================================================================

test("calculates cashback percentage correctly for 2% flat card", () => {
  const card: CreditCard = {
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

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const cashback = calculateCashbackPercentage(robinhood!);

  expect(cashback).toBe(3); // 3 pts @ 1¢ = 3%
});

test("handles zero cashback card", () => {
  const card: CreditCard = {
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
  expect(newCard.isPreset).toBe(false);
  expect(newCard.isCustomizable).toBe(false);
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
      id: "test-1",
      isCustomizable: false,
      isPreset: false,
      name: "Test Card",
      pointsPerDollar: 1.5,
      valuePerPoint: 0.02,
    },
  ];

  const updated = updateCard(cards, "test-1", {
    pointsPerDollar: 2.0,
    valuePerPoint: 0.025,
  });

  expect(updated[0].pointsPerDollar).toBe(2.0);
  expect(updated[0].valuePerPoint).toBe(0.025);
});

test("does not modify other cards when updating one", () => {
  const cards: CreditCard[] = [
    {
      id: "test-1",
      isCustomizable: false,
      isPreset: false,
      name: "Card 1",
      pointsPerDollar: 1.5,
      valuePerPoint: 0.02,
    },
    {
      id: "test-2",
      isCustomizable: false,
      isPreset: false,
      name: "Card 2",
      pointsPerDollar: 2.0,
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
      id: "costco-visa",
      isCustomizable: true,
      isPreset: true,
      issuer: "Citi",
      name: "Costco Visa",
      pointsPerDollar: 2.0,
      valuePerPoint: 0.01,
    },
  ];

  expect(() => deleteCard(cards, "costco-visa")).toThrow(
    "Cannot delete preset cards",
  );
});

test("only deletes specified card", () => {
  const cards: CreditCard[] = [
    {
      id: "custom-1",
      isCustomizable: false,
      isPreset: false,
      name: "Card 1",
      pointsPerDollar: 1.5,
      valuePerPoint: 0.02,
    },
    {
      id: "custom-2",
      isCustomizable: false,
      isPreset: false,
      name: "Card 2",
      pointsPerDollar: 2.0,
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
    id: "costco-visa",
    isCustomizable: true,
    isPreset: true,
    issuer: "Citi",
    name: "Costco Visa (Modified)",
    pointsPerDollar: 3.0, // Modified
    valuePerPoint: 0.02, // Modified
  };

  const cards = [modifiedPreset];
  const result = resetPresetCard(cards, "costco-visa");

  const defaultCostcoCard = DEFAULT_PRESET_CARDS.find(
    (c) => c.id === "costco-visa",
  );

  expect(defaultCostcoCard).toBeDefined();

  expect(result[0]).toStrictEqual(defaultCostcoCard);
  expect(result[0].pointsPerDollar).toBe(2.0); // Reset to default
  expect(result[0].valuePerPoint).toBe(0.01); // Reset to default
});

test("throws error when resetting non-preset card", () => {
  const customCard: CreditCard = {
    id: "custom-123",
    isCustomizable: false,
    isPreset: false,
    name: "Custom Card",
    pointsPerDollar: 1.5,
    valuePerPoint: 0.02,
  };

  const cards = [customCard];

  expect(() => resetPresetCard(cards, "custom-123")).toThrow(
    "Card is not a preset",
  );
});

// ============================================================================
// SORT CARDS TESTS
// ============================================================================

test("sorts cards with presets first, then custom", () => {
  const cards: CreditCard[] = [
    {
      id: "custom-1",
      isCustomizable: false,
      isPreset: false,
      name: "Zebra Card",
      pointsPerDollar: 1,
      valuePerPoint: 0.01,
    },
    {
      id: "preset-1",
      isCustomizable: true,
      isPreset: true,
      name: "Alpha Preset",
      pointsPerDollar: 1,
      valuePerPoint: 0.01,
    },
    {
      id: "custom-2",
      isCustomizable: false,
      isPreset: false,
      name: "Apple Custom",
      pointsPerDollar: 1,
      valuePerPoint: 0.01,
    },
    {
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
  expect(sorted[0].isPreset).toBe(true);
  expect(sorted[0].name).toBe("Alpha Preset");
  expect(sorted[1].isPreset).toBe(true);
  expect(sorted[1].name).toBe("Beta Preset");

  // Last two should be custom (alphabetically sorted)
  expect(sorted[2].isPreset).toBe(false);
  expect(sorted[2].name).toBe("Apple Custom");
  expect(sorted[3].isPreset).toBe(false);
  expect(sorted[3].name).toBe("Zebra Card");
});

test("sorts empty array", () => {
  const sorted = sortCards([]);

  expect(sorted).toHaveLength(0);
});

test("sorts cards alphabetically within each group", () => {
  const cards: CreditCard[] = [
    {
      id: "p-3",
      isCustomizable: true,
      isPreset: true,
      name: "Zulu",
      pointsPerDollar: 1,
      valuePerPoint: 0.01,
    },
    {
      id: "p-1",
      isCustomizable: true,
      isPreset: true,
      name: "Alpha",
      pointsPerDollar: 1,
      valuePerPoint: 0.01,
    },
    {
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
  DEFAULT_PRESET_CARDS.forEach((card) => {
    const result = creditCardSchema.safeParse(card);

    expect(result.success).toBe(true);
  });
});

test("default preset cards have unique IDs", () => {
  const ids = DEFAULT_PRESET_CARDS.map((c) => c.id);
  const uniqueIds = new Set(ids);

  expect(uniqueIds.size).toBe(ids.length);
});

test("default preset cards are all marked as presets", () => {
  DEFAULT_PRESET_CARDS.forEach((card) => {
    expect(card.isPreset).toBe(true);
  });
});

test("costco Visa is first in default presets", () => {
  expect(DEFAULT_PRESET_CARDS[0].id).toBe("costco-visa");
});
