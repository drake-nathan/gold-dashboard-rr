/**
 * Browser tests for useUserCreditCards migration flow
 *
 * These tests verify the localStorage → Convex migration works correctly
 * when a user signs in for the first time.
 */

import { useEffect } from "react";
import { expect, test, vi } from "vitest";
import { render } from "vitest-browser-react";

import {
  CREDIT_CARDS_STORAGE_KEY,
  type CreditCard,
  DEFAULT_PRESET_CARDS,
} from "@/lib/credit-cards";

// Import after mocks are set up
import { useUserCreditCards } from "./use-user-credit-cards";

// Track mutation calls
const mockMutationCalls = {
  markMigrationComplete: [] as unknown[][],
  migrateFromLocalStorage: [] as unknown[][],
  updateSettings: [] as unknown[][],
};

// Controllable mock state
let mockNeedsMigration: boolean | undefined = true;
let mockConvexCards: CreditCard[] | undefined;
let mockConvexSettings: null | undefined | { lastSelectedCardId?: string };
let mockMigrationShouldFail = false;

// Reset mocks between tests (note: resetCallIndices is defined after the mock)
const resetMocks = () => {
  mockNeedsMigration = true;
  mockConvexCards = undefined;
  mockConvexSettings = undefined;
  mockMigrationShouldFail = false;
  mockMutationCalls.migrateFromLocalStorage = [];
  mockMutationCalls.updateSettings = [];
  mockMutationCalls.markMigrationComplete = [];
  // Reset call indices - will be set after vi.mock
  queryCallIndex = 0;
  mutationCallIndex = 0;
};

// Mock Clerk auth - authenticated user
vi.mock("@clerk/react-router", () => ({
  useAuth: () => ({
    isLoaded: true,
    isSignedIn: true,
  }),
}));

// Track which query/mutation is being called by order of invocation
let queryCallIndex = 0;
let mutationCallIndex = 0;

// Mock Convex with controllable responses
// The hook calls queries in this order: getUserCards, getSettings, needsMigration
// And mutations are identified by tracking which one is called
vi.mock("convex/react", () => ({
  useMutation: () => {
    const index = mutationCallIndex++;
    // Mutations are called in order in the hook:
    // 0: addCard, 1: updateCard, 2: deleteCard, 3: resetPresetCard,
    // 4: migrateFromLocalStorage, 5: updateSettings, 6: markMigrationComplete, 7: resetAllCards
    if (index === 4) {
      // migrateFromLocalStorage
      return (...args: unknown[]) => {
        mockMutationCalls.migrateFromLocalStorage.push(args);
        if (mockMigrationShouldFail) {
          return Promise.reject(new Error("Migration failed"));
        }
        return Promise.resolve({ imported: 1, skipped: 0, success: true });
      };
    }
    if (index === 5) {
      // updateSettings
      return (...args: unknown[]) => {
        mockMutationCalls.updateSettings.push(args);
        return Promise.resolve({ success: true });
      };
    }
    if (index === 6) {
      // markMigrationComplete
      return (...args: unknown[]) => {
        mockMutationCalls.markMigrationComplete.push(args);
        mockNeedsMigration = false;
        return Promise.resolve({ success: true });
      };
    }
    // Other mutations
    return vi.fn().mockResolvedValue({ success: true });
  },
  useQuery: (queryRef: unknown, args: unknown) => {
    // Skip queries when args is "skip"
    if (args === "skip") return undefined;

    const index = queryCallIndex++;
    // Queries are called in order in the hook:
    // 0: getUserCards, 1: getSettings, 2: needsMigration
    if (index === 0) return mockConvexCards;
    if (index === 1) return mockConvexSettings;
    if (index === 2) return mockNeedsMigration;
    return undefined;
  },
}));

// Test component that exposes hook state
const TestComponent = ({
  onStateChange,
}: {
  onStateChange: (state: {
    cards: CreditCard[];
    isLoading: boolean;
    isMigrating: boolean;
    lastSelectedId: string;
  }) => void;
}) => {
  const { cards, isLoading, isMigrating, lastSelectedId } =
    useUserCreditCards();

  useEffect(() => {
    onStateChange({ cards, isLoading, isMigrating, lastSelectedId });
  }, [cards, isLoading, isMigrating, lastSelectedId, onStateChange]);

  return (
    <div>
      <div data-testid="loading">{isLoading ? "loading" : "ready"}</div>
      <div data-testid="migrating">{isMigrating ? "migrating" : "idle"}</div>
      <div data-testid="card-count">{cards.length}</div>
      <div data-testid="last-selected">{lastSelectedId}</div>
    </div>
  );
};

// Helper to wait for migration to complete
const waitForMigration = async (timeout = 1000) => {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (mockMutationCalls.markMigrationComplete.length > 0) {
      return true;
    }
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 50);
    });
  }
  return false;
};

test("migration runs when user signs in with custom cards in localStorage", async () => {
  resetMocks();

  // Set up localStorage with a custom card
  const customCard: CreditCard = {
    cardType: "cashback",
    id: "custom-migrate-test",
    isCustomizable: false,
    isPreset: false,
    issuer: "Test Bank",
    name: "Custom Card To Migrate",
    pointsPerDollar: 2.5,
    valuePerPoint: 0.015,
  };

  localStorage.setItem(
    CREDIT_CARDS_STORAGE_KEY,
    JSON.stringify({
      cards: [...DEFAULT_PRESET_CARDS, customCard],
      lastSelectedId: customCard.id,
    }),
  );

  const states: { isMigrating: boolean }[] = [];
  await render(<TestComponent onStateChange={(s) => states.push(s)} />);

  // Wait for migration to complete
  const migrationCompleted = await waitForMigration();

  expect(migrationCompleted).toBe(true);

  // Verify migrateFromLocalStorage was called with the custom card
  expect(mockMutationCalls.migrateFromLocalStorage).toHaveLength(1);

  const migratedCards = mockMutationCalls.migrateFromLocalStorage[0][0] as {
    cards: { cardId: string }[];
  };

  expect(
    migratedCards.cards.some((c) => c.cardId === "custom-migrate-test"),
  ).toBe(true);

  // Verify updateSettings was called with lastSelectedCardId
  expect(mockMutationCalls.updateSettings).toHaveLength(1);
  expect(mockMutationCalls.updateSettings[0][0]).toMatchObject({
    lastSelectedCardId: customCard.id,
  });

  // Verify markMigrationComplete was called
  expect(mockMutationCalls.markMigrationComplete).toHaveLength(1);

  // Verify localStorage was cleared
  expect(localStorage.getItem(CREDIT_CARDS_STORAGE_KEY)).toBeNull();
});

test("migration only migrates custom cards and modified presets", async () => {
  resetMocks();

  // Create a modified preset (different pointsPerDollar from default)
  const defaultPreset = DEFAULT_PRESET_CARDS[0];
  const modifiedPreset: CreditCard = {
    ...defaultPreset,
    pointsPerDollar: defaultPreset.pointsPerDollar + 1, // Modified value
  };

  // Create a custom card
  const customCard: CreditCard = {
    cardType: "travel",
    id: "custom-card-123",
    isCustomizable: false,
    isPreset: false,
    name: "My Custom Card",
    pointsPerDollar: 3,
    valuePerPoint: 0.02,
  };

  // Set up localStorage with: modified preset + unmodified presets + custom card
  const unmodifiedPresets = DEFAULT_PRESET_CARDS.slice(1);
  localStorage.setItem(
    CREDIT_CARDS_STORAGE_KEY,
    JSON.stringify({
      cards: [modifiedPreset, ...unmodifiedPresets, customCard],
      lastSelectedId: customCard.id,
    }),
  );

  await render(<TestComponent onStateChange={() => undefined} />);

  const migrationCompleted = await waitForMigration();

  expect(migrationCompleted).toBe(true);

  // Verify only modified preset and custom card were migrated
  const migratedCards = mockMutationCalls.migrateFromLocalStorage[0][0] as {
    cards: { cardId: string; isPreset: boolean }[];
  };

  // Should have exactly 2 cards: the modified preset and the custom card
  expect(migratedCards.cards).toHaveLength(2);

  // Verify the custom card is included
  expect(migratedCards.cards.some((c) => c.cardId === "custom-card-123")).toBe(
    true,
  );

  // Verify the modified preset is included
  expect(migratedCards.cards.some((c) => c.cardId === defaultPreset.id)).toBe(
    true,
  );

  // Verify unmodified presets are NOT included
  for (const preset of unmodifiedPresets) {
    expect(migratedCards.cards.some((c) => c.cardId === preset.id)).toBe(false);
  }
});

test("migration skips when user has no custom data", async () => {
  resetMocks();

  // Set up localStorage with only unmodified default presets
  localStorage.setItem(
    CREDIT_CARDS_STORAGE_KEY,
    JSON.stringify({
      cards: DEFAULT_PRESET_CARDS,
      lastSelectedId: DEFAULT_PRESET_CARDS[0].id,
    }),
  );

  await render(<TestComponent onStateChange={() => undefined} />);

  const migrationCompleted = await waitForMigration();

  expect(migrationCompleted).toBe(true);

  // migrateFromLocalStorage should NOT be called (no custom data)
  expect(mockMutationCalls.migrateFromLocalStorage).toHaveLength(0);

  // But markMigrationComplete should still be called
  expect(mockMutationCalls.markMigrationComplete).toHaveLength(1);
});

test("merge runs when needsMigration is false but localStorage has custom data", async () => {
  resetMocks();
  mockNeedsMigration = false; // Already migrated on another device

  // Set up localStorage with custom data from this device
  const customCard: CreditCard = {
    cardType: "cashback",
    id: "should-merge",
    isCustomizable: false,
    isPreset: false,
    name: "Should Merge",
    pointsPerDollar: 5,
    valuePerPoint: 0.01,
  };

  localStorage.setItem(
    CREDIT_CARDS_STORAGE_KEY,
    JSON.stringify({
      cards: [...DEFAULT_PRESET_CARDS, customCard],
      lastSelectedId: customCard.id,
    }),
  );

  await render(<TestComponent onStateChange={() => undefined} />);

  // Wait for merge to complete
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 200);
  });

  // migrateFromLocalStorage should be called to merge the custom card
  expect(mockMutationCalls.migrateFromLocalStorage).toHaveLength(1);

  // Verify the custom card was included in the merge
  const mergedCards = mockMutationCalls.migrateFromLocalStorage[0][0] as {
    cards: { cardId: string }[];
  };

  expect(mergedCards.cards).toHaveLength(1);
  expect(mergedCards.cards[0].cardId).toBe("should-merge");

  // markMigrationComplete should NOT be called (already complete)
  expect(mockMutationCalls.markMigrationComplete).toHaveLength(0);

  // localStorage should be cleared after successful merge
  expect(localStorage.getItem(CREDIT_CARDS_STORAGE_KEY)).toBeNull();
});

test("migration handles preset with signupBonus as modified", async () => {
  resetMocks();

  // Create a preset with signupBonus added (counts as modified)
  const presetWithBonus: CreditCard = {
    ...DEFAULT_PRESET_CARDS[0],
    signupBonus: {
      enabled: true,
      pointsBonus: 60000,
      spendRequirement: 4000,
    },
  };

  localStorage.setItem(
    CREDIT_CARDS_STORAGE_KEY,
    JSON.stringify({
      cards: [presetWithBonus, ...DEFAULT_PRESET_CARDS.slice(1)],
      lastSelectedId: presetWithBonus.id,
    }),
  );

  await render(<TestComponent onStateChange={() => undefined} />);

  const migrationCompleted = await waitForMigration();

  expect(migrationCompleted).toBe(true);

  // Verify the preset with signupBonus was migrated
  const migratedCards = mockMutationCalls.migrateFromLocalStorage[0][0] as {
    cards: { cardId: string; signupBonus?: object }[];
  };

  expect(migratedCards.cards).toHaveLength(1);
  expect(migratedCards.cards[0].cardId).toBe(DEFAULT_PRESET_CARDS[0].id);
  expect(migratedCards.cards[0].signupBonus).toBeDefined();
});

test("migration preserves localStorage when migration fails", async () => {
  resetMocks();
  mockMigrationShouldFail = true;

  const customCard: CreditCard = {
    cardType: "cashback",
    id: "card-for-failed-migration",
    isCustomizable: false,
    isPreset: false,
    name: "Card For Failed Migration",
    pointsPerDollar: 2,
    valuePerPoint: 0.01,
  };

  localStorage.setItem(
    CREDIT_CARDS_STORAGE_KEY,
    JSON.stringify({
      cards: [...DEFAULT_PRESET_CARDS, customCard],
      lastSelectedId: customCard.id,
    }),
  );

  // Suppress console.error for this test
  const consoleSpy = vi
    .spyOn(console, "error")
    .mockImplementation(() => undefined);

  await render(<TestComponent onStateChange={() => undefined} />);

  // Give time for migration to attempt and fail
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 300);
  });

  // Migration was attempted but failed
  expect(mockMutationCalls.migrateFromLocalStorage).toHaveLength(1);

  // markMigrationComplete should NOT be called (migration failed)
  expect(mockMutationCalls.markMigrationComplete).toHaveLength(0);

  // localStorage should still exist (not cleared on failure)
  const stored = localStorage.getItem(CREDIT_CARDS_STORAGE_KEY);

  expect(stored).not.toBeNull();

  // Verify the custom card is still in localStorage
  const parsed = JSON.parse(stored ?? "{}") as { cards: { id: string }[] };

  expect(parsed.cards.some((c) => c.id === "card-for-failed-migration")).toBe(
    true,
  );

  consoleSpy.mockRestore();
});
