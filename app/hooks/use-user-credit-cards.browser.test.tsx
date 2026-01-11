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
  useQuery: () => undefined,
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
  const { addCard, cards, isLoading, lastSelectedId, setLastSelectedId } =
    useUserCreditCards();

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

test("returns default preset cards when localStorage is empty", async () => {
  // Clear localStorage
  localStorage.removeItem(CREDIT_CARDS_STORAGE_KEY);

  const screen = await render(<TestComponent onReady={() => undefined} />);

  // Wait for hook to initialize
  await expect.element(screen.getByText("ready")).toBeInTheDocument();

  // Verify default card count
  await expect
    .element(screen.getByText(String(DEFAULT_PRESET_CARDS.length)))
    .toBeInTheDocument();

  // Verify first preset card is in the list
  await expect
    .element(screen.getByText(DEFAULT_PRESET_CARDS[0].name))
    .toBeInTheDocument();
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
  await expect
    .element(screen.getByText(String(initialCount)))
    .toBeInTheDocument();

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
  await expect
    .element(screen.getByText(String(initialCount + 1)))
    .toBeInTheDocument();

  // Verify the custom card is in the list
  await expect
    .element(screen.getByText("Test Custom Card"))
    .toBeInTheDocument();

  // Verify localStorage has the card
  const stored = localStorage.getItem(CREDIT_CARDS_STORAGE_KEY);

  expect(stored).toBeDefined();

  // eslint-disable-next-line vitest/no-conditional-in-test -- Type narrowing after assertion
  if (!stored) throw new Error("Storage should exist");

  const parsed = JSON.parse(stored) as {
    cards: { id: string; name: string }[];
  };
  const storedCard = parsed.cards.find((c) => c.id === "custom-test-card");

  expect(storedCard).toBeDefined();
  expect(storedCard?.name).toBe("Test Custom Card");
});
