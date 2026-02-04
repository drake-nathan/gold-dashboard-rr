/**
 * Browser tests for useSubscription hook
 *
 * Tests loading states, auth states, and subscription statuses.
 */

import { beforeEach, expect, test, vi } from "vitest";
import { render } from "vitest-browser-react";

// Import after mocks are set up
import { useSubscription } from "./use-subscription";

// Track mock state - must be declared before vi.mock calls
let mockAuthState = { isLoaded: true, isSignedIn: false };
let mockQueryResult: unknown;
let mockActionFn = vi.fn();

// Mock Clerk auth
vi.mock("@clerk/react-router", () => ({
  useAuth: () => mockAuthState,
}));

// Mock Convex
vi.mock("convex/react", () => ({
  useAction: () => mockActionFn,
  useQuery: (_query: unknown, args: unknown) => {
    // Return undefined when query is skipped
    if (args === "skip") return undefined;
    return mockQueryResult;
  },
}));

// Mock the environment variable for Stripe enabled
vi.stubEnv("VITE_STRIPE_ENABLED", "true");

// Test component that exposes the hook's state
const TestComponent = () => {
  const { isActionLoading, isLoading, isPro, subscription } = useSubscription();

  return (
    <div>
      <div data-testid="isLoading">{String(isLoading)}</div>
      <div data-testid="isPro">{String(isPro)}</div>
      <div data-testid="status">{subscription.status}</div>
      <div data-testid="isActionLoading">{String(isActionLoading)}</div>
      <div data-testid="cancelAtPeriodEnd">
        {String(subscription.cancelAtPeriodEnd ?? "undefined")}
      </div>
      <div data-testid="currentPeriodEnd">
        {String(subscription.currentPeriodEnd ?? "undefined")}
      </div>
    </div>
  );
};

beforeEach(() => {
  mockAuthState = { isLoaded: true, isSignedIn: false };
  mockQueryResult = undefined;
  mockActionFn = vi.fn();
});

// =============================================================================
// Loading State Tests
// =============================================================================

test("shows loading when auth is not loaded", async () => {
  mockAuthState = { isLoaded: false, isSignedIn: false };

  const screen = await render(<TestComponent />);

  await expect
    .element(screen.getByTestId("isLoading"))
    .toHaveTextContent("true");
});

test("shows loading when signed in but query is pending", async () => {
  mockAuthState = { isLoaded: true, isSignedIn: true };
  mockQueryResult = undefined;

  const screen = await render(<TestComponent />);

  await expect
    .element(screen.getByTestId("isLoading"))
    .toHaveTextContent("true");
});

test("not loading when auth loaded and signed out", async () => {
  mockAuthState = { isLoaded: true, isSignedIn: false };

  const screen = await render(<TestComponent />);

  await expect
    .element(screen.getByTestId("isLoading"))
    .toHaveTextContent("false");
});

// =============================================================================
// Auth State Tests
// =============================================================================

test("returns anonymous status when signed out", async () => {
  mockAuthState = { isLoaded: true, isSignedIn: false };

  const screen = await render(<TestComponent />);

  await expect
    .element(screen.getByTestId("isLoading"))
    .toHaveTextContent("false");
  await expect.element(screen.getByTestId("isPro")).toHaveTextContent("false");
  await expect
    .element(screen.getByTestId("status"))
    .toHaveTextContent("anonymous");
});

// =============================================================================
// Subscription Status Tests
// =============================================================================

test("returns free status for user without subscription", async () => {
  mockAuthState = { isLoaded: true, isSignedIn: true };
  mockQueryResult = { isPro: false, status: "free", userId: "user_123" };

  const screen = await render(<TestComponent />);

  await expect
    .element(screen.getByTestId("isLoading"))
    .toHaveTextContent("false");
  await expect.element(screen.getByTestId("isPro")).toHaveTextContent("false");
  await expect.element(screen.getByTestId("status")).toHaveTextContent("free");
});

test("returns pro status for user with active subscription", async () => {
  mockAuthState = { isLoaded: true, isSignedIn: true };
  mockQueryResult = {
    cancelAtPeriodEnd: false,
    currentPeriodEnd: 1735689600000,
    isPro: true,
    status: "active",
    userId: "user_123",
  };

  const screen = await render(<TestComponent />);

  await expect
    .element(screen.getByTestId("isLoading"))
    .toHaveTextContent("false");
  await expect.element(screen.getByTestId("isPro")).toHaveTextContent("true");
  await expect
    .element(screen.getByTestId("status"))
    .toHaveTextContent("active");
  await expect
    .element(screen.getByTestId("cancelAtPeriodEnd"))
    .toHaveTextContent("false");
  await expect
    .element(screen.getByTestId("currentPeriodEnd"))
    .toHaveTextContent("1735689600000");
});

test("returns trialing status for user in trial", async () => {
  mockAuthState = { isLoaded: true, isSignedIn: true };
  mockQueryResult = {
    isPro: true,
    status: "trialing",
    userId: "user_123",
  };

  const screen = await render(<TestComponent />);

  await expect.element(screen.getByTestId("isPro")).toHaveTextContent("true");
  await expect
    .element(screen.getByTestId("status"))
    .toHaveTextContent("trialing");
});

test("returns canceled status for canceled subscription", async () => {
  mockAuthState = { isLoaded: true, isSignedIn: true };
  mockQueryResult = {
    cancelAtPeriodEnd: true,
    isPro: false,
    status: "canceled",
    userId: "user_123",
  };

  const screen = await render(<TestComponent />);

  await expect.element(screen.getByTestId("isPro")).toHaveTextContent("false");
  await expect
    .element(screen.getByTestId("status"))
    .toHaveTextContent("canceled");
  await expect
    .element(screen.getByTestId("cancelAtPeriodEnd"))
    .toHaveTextContent("true");
});

test("returns past_due status for past due subscription", async () => {
  mockAuthState = { isLoaded: true, isSignedIn: true };
  mockQueryResult = {
    isPro: false,
    status: "past_due",
    userId: "user_123",
  };

  const screen = await render(<TestComponent />);

  await expect.element(screen.getByTestId("isPro")).toHaveTextContent("false");
  await expect
    .element(screen.getByTestId("status"))
    .toHaveTextContent("past_due");
});
