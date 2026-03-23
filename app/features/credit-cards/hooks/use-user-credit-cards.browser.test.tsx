/**
 * Browser tests for useUserCreditCards hook
 *
 * These tests verify the credit card CRUD operations work correctly
 * for anonymous users (localStorage-based storage).
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

// Mock Clerk auth - anonymous user (not signed in)
vi.mock("@clerk/react-router", () => ({
  useAuth: () => ({
    isLoaded: true,
    isSignedIn: false,
  }),
}));

// Mock Convex - return undefined for all queries since user is not signed in
vi.mock("convex/react", () => ({
  useMutation: () => vi.fn(),
  useQuery: () => {},
}));

// Test component that exposes the hook's state and actions
const TestComponent = ({
  onReady,
}: {
  onReady: (actions: {
    addCard: (card: CreditCard) => Promise<void>;
    getCards: () => CreditCard[];
    setLastSelectedId: (id: string) => Promise<void>;
  }) => void;
}) => {
  const { addCard, cards, isLoading, lastSelectedId, setLastSelectedId } = useUserCreditCards();

  useEffect(() => {
    if (!isLoading) {
      onReady({
        addCard,
        getCards: () => cards,
        setLastSelectedId,
      });
    }
  }, [isLoading, addCard, cards, setLastSelectedId, onReady]);

  return (
    <div>
      <div data-testid="loading">{isLoading ? "loading" : "ready"}</div>
      <div data-testid="card-count">{cards.length}</div>
      <div data-testid="last-selected">{lastSelectedId}</div>
      {cards.map((card) => (
        <div data-testid={`card-${card.id}`} key={card.id}>
          {card.name}
        </div>
      ))}
    </div>
  );
};

// Test component with delete capability
const TestComponentWithDelete = ({
  onReady,
}: {
  onReady: (actions: {
    deleteCard: (cardId: string) => Promise<void>;
    getCards: () => CreditCard[];
  }) => void;
}) => {
  const { cards, deleteCard, isLoading } = useUserCreditCards();

  useEffect(() => {
    if (!isLoading) {
      onReady({
        deleteCard,
        getCards: () => cards,
      });
    }
  }, [isLoading, deleteCard, cards, onReady]);

  return (
    <div>
      <div data-testid="loading">{isLoading ? "loading" : "ready"}</div>
      <div data-testid="card-count">{cards.length}</div>
      {cards.map((card) => (
        <div data-testid={`card-${card.id}`} key={card.id}>
          {card.name}
        </div>
      ))}
    </div>
  );
};

// Test component with update capability
const TestComponentWithUpdate = ({
  onReady,
}: {
  onReady: (actions: {
    updateCard: (cardId: string, updates: Partial<CreditCard>) => Promise<void>;
  }) => void;
}) => {
  const { cards, isLoading, updateCard } = useUserCreditCards();

  useEffect(() => {
    if (!isLoading) {
      onReady({ updateCard });
    }
  }, [isLoading, updateCard, onReady]);

  return (
    <div>
      <div data-testid="loading">{isLoading ? "loading" : "ready"}</div>
      <div data-testid="card-count">{cards.length}</div>
      {cards.map((card) => (
        <div data-testid={`card-${card.id}`} key={card.id}>
          {card.name}
        </div>
      ))}
    </div>
  );
};

// Test component with reset capability
const TestComponentWithReset = ({
  onReady,
}: {
  onReady: (actions: { getCards: () => CreditCard[]; resetAllCards: () => Promise<void> }) => void;
}) => {
  const { cards, isLoading, resetAllCards } = useUserCreditCards();

  useEffect(() => {
    if (!isLoading) {
      onReady({
        getCards: () => cards,
        resetAllCards,
      });
    }
  }, [isLoading, resetAllCards, cards, onReady]);

  return (
    <div>
      <div data-testid="loading">{isLoading ? "loading" : "ready"}</div>
      <div data-testid="card-count">{cards.length}</div>
      {cards.map((card) => (
        <div data-testid={`card-${card.id}`} key={card.id}>
          {card.name}
        </div>
      ))}
    </div>
  );
};

test("returns default preset cards when localStorage is empty", async () => {
  // Clear localStorage
  localStorage.removeItem(CREDIT_CARDS_STORAGE_KEY);

  const screen = await render(<TestComponent onReady={() => {}} />);

  // Wait for hook to initialize
  await expect.element(screen.getByText("ready")).toBeInTheDocument();

  // Verify default card count
  await expect.element(screen.getByText(String(DEFAULT_PRESET_CARDS.length))).toBeInTheDocument();

  // Verify first preset card is in the list
  await expect.element(screen.getByText(DEFAULT_PRESET_CARDS[0].name)).toBeInTheDocument();
});

test("addCard followed by setLastSelectedId preserves the new card", async () => {
  // Clear localStorage
  localStorage.removeItem(CREDIT_CARDS_STORAGE_KEY);

  interface Actions {
    addCard: (card: CreditCard) => Promise<void>;
    getCards: () => CreditCard[];
    setLastSelectedId: (id: string) => Promise<void>;
  }
  let actions: Actions | null = null;

  const screen = await render(<TestComponent onReady={(a) => (actions = a)} />);

  // Wait for hook to initialize
  await expect.element(screen.getByText("ready")).toBeInTheDocument();

  // Wait for actions to be available and capture reference
  await expect.poll(() => actions !== null).toBe(true);

  const verifiedActions = actions as unknown as Actions;

  const initialCount = DEFAULT_PRESET_CARDS.length;

  // Verify initial count
  await expect.element(screen.getByText(String(initialCount))).toBeInTheDocument();

  // Create a custom card
  const customCard: CreditCard = {
    cardType: "cashback",
    id: "custom-test-card",
    isCustomizable: false,
    isPreset: false,
    issuer: "Test Bank",
    name: "Test Custom Card",
    pointsPerDollar: 2.5,
    valuePerPoint: 0.015,
  };

  // This simulates what handleCardsChange does:
  // 1. Add the card
  // 2. Then set the last selected ID
  await verifiedActions.addCard(customCard);
  await verifiedActions.setLastSelectedId(customCard.id);

  // THIS IS THE BUG: The card should appear but it disappears because
  // setLastSelectedId overwrites localStorage with stale data
  await expect.element(screen.getByText(String(initialCount + 1))).toBeInTheDocument();

  // Verify the custom card is in the list
  await expect.element(screen.getByText("Test Custom Card")).toBeInTheDocument();

  // Verify localStorage has the card
  const stored = localStorage.getItem(CREDIT_CARDS_STORAGE_KEY);

  expect(stored).toBeDefined();

  if (!stored) throw new Error("Storage should exist");

  const parsed = JSON.parse(stored) as {
    cards: { id: string; name: string }[];
  };
  const storedCard = parsed.cards.find((c) => c.id === "custom-test-card");

  expect(storedCard).toBeDefined();
  expect(storedCard?.name).toBe("Test Custom Card");
});

test("deleteCard removes custom card from localStorage", async () => {
  // Set up localStorage with a custom card
  const customCard: CreditCard = {
    cardType: "cashback",
    id: "card-to-delete",
    isCustomizable: false,
    isPreset: false,
    issuer: "Test Bank",
    name: "Card To Delete",
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

  interface Actions {
    deleteCard: (cardId: string) => Promise<void>;
    getCards: () => CreditCard[];
  }
  let actions: Actions | null = null;

  const screen = await render(<TestComponentWithDelete onReady={(a) => (actions = a)} />);

  await expect.element(screen.getByText("ready")).toBeInTheDocument();
  await expect.poll(() => actions !== null).toBe(true);

  const verifiedActions = actions as unknown as Actions;

  // Verify card exists initially
  await expect.element(screen.getByText("Card To Delete")).toBeInTheDocument();

  // Delete the card
  await verifiedActions.deleteCard("card-to-delete");

  // Verify card is removed from UI
  await expect.element(screen.getByText(String(DEFAULT_PRESET_CARDS.length))).toBeInTheDocument();

  // Verify card is removed from localStorage
  const stored = localStorage.getItem(CREDIT_CARDS_STORAGE_KEY);

  expect(stored).toBeDefined();

  if (!stored) throw new Error("Storage should exist");

  const parsed = JSON.parse(stored) as { cards: { id: string }[] };
  const deletedCard = parsed.cards.find((c) => c.id === "card-to-delete");

  expect(deletedCard).toBeUndefined();
});

test("updateCard modifies card in localStorage", async () => {
  // Set up localStorage with a custom card
  const customCard: CreditCard = {
    cardType: "cashback",
    id: "card-to-update",
    isCustomizable: false,
    isPreset: false,
    issuer: "Old Bank",
    name: "Old Card Name",
    pointsPerDollar: 1,
    valuePerPoint: 0.01,
  };

  localStorage.setItem(
    CREDIT_CARDS_STORAGE_KEY,
    JSON.stringify({
      cards: [...DEFAULT_PRESET_CARDS, customCard],
      lastSelectedId: customCard.id,
    }),
  );

  interface Actions {
    updateCard: (cardId: string, updates: Partial<CreditCard>) => Promise<void>;
  }
  let actions: Actions | null = null;

  const screen = await render(<TestComponentWithUpdate onReady={(a) => (actions = a)} />);

  await expect.element(screen.getByText("ready")).toBeInTheDocument();
  await expect.poll(() => actions !== null).toBe(true);

  const verifiedActions = actions as unknown as Actions;

  // Update the card
  await verifiedActions.updateCard("card-to-update", {
    name: "New Card Name",
    pointsPerDollar: 3,
  });

  // Verify card is updated in UI
  await expect.element(screen.getByText("New Card Name")).toBeInTheDocument();

  // Verify card is updated in localStorage
  const stored = localStorage.getItem(CREDIT_CARDS_STORAGE_KEY);

  if (!stored) throw new Error("Storage should exist");

  const parsed = JSON.parse(stored) as {
    cards: { id: string; name: string; pointsPerDollar: number }[];
  };
  const updatedCard = parsed.cards.find((c) => c.id === "card-to-update");

  expect(updatedCard?.name).toBe("New Card Name");
  expect(updatedCard?.pointsPerDollar).toBe(3);
});

test("resetAllCards clears all cards and resets to defaults", async () => {
  // Set up localStorage with custom cards
  const customCard: CreditCard = {
    cardType: "travel",
    id: "custom-card-1",
    isCustomizable: false,
    isPreset: false,
    issuer: "Custom Bank",
    name: "Custom Card",
    pointsPerDollar: 5,
    valuePerPoint: 0.02,
  };

  localStorage.setItem(
    CREDIT_CARDS_STORAGE_KEY,
    JSON.stringify({
      cards: [...DEFAULT_PRESET_CARDS, customCard],
      lastSelectedId: customCard.id,
    }),
  );

  interface Actions {
    getCards: () => CreditCard[];
    resetAllCards: () => Promise<void>;
  }
  let actions: Actions | null = null;

  const screen = await render(<TestComponentWithReset onReady={(a) => (actions = a)} />);

  await expect.element(screen.getByText("ready")).toBeInTheDocument();
  await expect.poll(() => actions !== null).toBe(true);

  const verifiedActions = actions as unknown as Actions;

  // Verify custom card exists initially
  const initialCount = DEFAULT_PRESET_CARDS.length + 1;

  await expect.element(screen.getByText(String(initialCount))).toBeInTheDocument();

  // Reset all cards
  await verifiedActions.resetAllCards();

  // Verify only default cards remain
  await expect.element(screen.getByText(String(DEFAULT_PRESET_CARDS.length))).toBeInTheDocument();

  // Verify localStorage is reset
  const stored = localStorage.getItem(CREDIT_CARDS_STORAGE_KEY);

  if (!stored) throw new Error("Storage should exist");

  const parsed = JSON.parse(stored) as { cards: CreditCard[] };

  expect(parsed.cards).toHaveLength(DEFAULT_PRESET_CARDS.length);
  expect(parsed.cards.every((c) => c.isPreset)).toBeTruthy();
});

test("lastSelectedId persists across operations", async () => {
  localStorage.removeItem(CREDIT_CARDS_STORAGE_KEY);

  interface Actions {
    setLastSelectedId: (id: string) => Promise<void>;
  }
  let actions: Actions | null = null;

  const screen = await render(<TestComponent onReady={(a) => (actions = a)} />);

  await expect.element(screen.getByText("ready")).toBeInTheDocument();
  await expect.poll(() => actions !== null).toBe(true);

  const verifiedActions = actions as unknown as Actions;

  // Set a specific card as selected
  const targetCardId = DEFAULT_PRESET_CARDS[1].id;
  await verifiedActions.setLastSelectedId(targetCardId);

  // Verify selection is shown in UI
  await expect.element(screen.getByText(targetCardId)).toBeInTheDocument();

  // Verify selection is in localStorage
  const stored = localStorage.getItem(CREDIT_CARDS_STORAGE_KEY);

  if (!stored) throw new Error("Storage should exist");

  const parsed = JSON.parse(stored) as { lastSelectedId: string };

  expect(parsed.lastSelectedId).toBe(targetCardId);
});
