/**
 * Browser tests for useSubscription hook
 *
 * Tests loading states, auth states, and subscription statuses.
 */

import { beforeEach, expect, test, vi } from "vitest";
import { render } from "vitest-browser-react";

import { FEATURE_FLAGS, type FeatureFlagValues } from "@/lib/feature-flags";
import { FeatureFlagProvider } from "@/providers/feature-flag-provider";

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
    if (args === "skip") return;
    return mockQueryResult;
  },
}));

// Mock the environment variable for Stripe enabled
vi.stubEnv("VITE_STRIPE_ENABLED", "true");

const flagsOn: FeatureFlagValues = { [FEATURE_FLAGS.PAID_FEATURES]: true };

const renderWithFlags = (ui: React.ReactElement, flags: FeatureFlagValues = flagsOn) =>
  render(<FeatureFlagProvider flags={flags}>{ui}</FeatureFlagProvider>);

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
      <div data-testid="canCreateAlerts">
        {String(subscription.alertEntitlements.canCreateAlerts)}
      </div>
      <div data-testid="canManageAlerts">
        {String(subscription.alertEntitlements.canManageAlerts)}
      </div>
      <div data-testid="canSendAlerts">{String(subscription.alertEntitlements.canSendAlerts)}</div>
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

  const screen = await renderWithFlags(<TestComponent />);

  await expect.element(screen.getByTestId("isLoading")).toHaveTextContent("true");
});

test("shows loading when signed in but query is pending", async () => {
  mockAuthState = { isLoaded: true, isSignedIn: true };
  mockQueryResult = undefined;

  const screen = await renderWithFlags(<TestComponent />);

  await expect.element(screen.getByTestId("isLoading")).toHaveTextContent("true");
});

test("not loading when auth loaded and signed out", async () => {
  mockAuthState = { isLoaded: true, isSignedIn: false };

  const screen = await renderWithFlags(<TestComponent />);

  await expect.element(screen.getByTestId("isLoading")).toHaveTextContent("false");
});

// =============================================================================
// Auth State Tests
// =============================================================================

test("returns anonymous status when signed out", async () => {
  mockAuthState = { isLoaded: true, isSignedIn: false };

  const screen = await renderWithFlags(<TestComponent />);

  await expect.element(screen.getByTestId("isLoading")).toHaveTextContent("false");
  await expect.element(screen.getByTestId("isPro")).toHaveTextContent("false");
  await expect.element(screen.getByTestId("status")).toHaveTextContent("anonymous");
});

// =============================================================================
// Feature Gating Tests
// =============================================================================

test("returns disabled state when the paid-features flag is off", async () => {
  mockAuthState = { isLoaded: true, isSignedIn: true };
  // Even with a subscription query result, flag-off must force the disabled state.
  mockQueryResult = { isPro: true, status: "active", userId: "user_123" };

  const screen = await renderWithFlags(<TestComponent />, {
    [FEATURE_FLAGS.PAID_FEATURES]: false,
  });

  // Disabled-state shape: anonymous, not pro, not loading, no entitlements.
  await expect.element(screen.getByTestId("status")).toHaveTextContent("anonymous");
  await expect.element(screen.getByTestId("isPro")).toHaveTextContent("false");
  await expect.element(screen.getByTestId("isLoading")).toHaveTextContent("false");
  await expect.element(screen.getByTestId("canManageAlerts")).toHaveTextContent("false");
});

// =============================================================================
// Subscription Status Tests
// =============================================================================

test("returns free status for user without subscription", async () => {
  mockAuthState = { isLoaded: true, isSignedIn: true };
  mockQueryResult = { isPro: false, status: "free", userId: "user_123" };

  const screen = await renderWithFlags(<TestComponent />);

  await expect.element(screen.getByTestId("isLoading")).toHaveTextContent("false");
  await expect.element(screen.getByTestId("isPro")).toHaveTextContent("false");
  await expect.element(screen.getByTestId("status")).toHaveTextContent("free");
  await expect.element(screen.getByTestId("canManageAlerts")).toHaveTextContent("true");
});

test("uses alert entitlements returned by subscription query", async () => {
  mockAuthState = { isLoaded: true, isSignedIn: true };
  mockQueryResult = {
    alertEntitlements: {
      canCreateAlerts: true,
      canEnableAlerts: true,
      canManageAlerts: true,
      canSendAlerts: true,
      shouldPauseEnabledAlerts: false,
    },
    isPro: true,
    status: "active",
    userId: "user_123",
  };

  const screen = await renderWithFlags(<TestComponent />);

  await expect.element(screen.getByTestId("canCreateAlerts")).toHaveTextContent("true");
  await expect.element(screen.getByTestId("canSendAlerts")).toHaveTextContent("true");
});

test("returns pro status for user with active subscription", async () => {
  mockAuthState = { isLoaded: true, isSignedIn: true };
  mockQueryResult = {
    cancelAtPeriodEnd: false,
    currentPeriodEnd: 1_735_689_600_000,
    isPro: true,
    status: "active",
    userId: "user_123",
  };

  const screen = await renderWithFlags(<TestComponent />);

  await expect.element(screen.getByTestId("isLoading")).toHaveTextContent("false");
  await expect.element(screen.getByTestId("isPro")).toHaveTextContent("true");
  await expect.element(screen.getByTestId("status")).toHaveTextContent("active");
  await expect.element(screen.getByTestId("cancelAtPeriodEnd")).toHaveTextContent("false");
  await expect.element(screen.getByTestId("currentPeriodEnd")).toHaveTextContent("1735689600000");
});

test("returns trialing status for user in trial", async () => {
  mockAuthState = { isLoaded: true, isSignedIn: true };
  mockQueryResult = {
    isPro: true,
    status: "trialing",
    userId: "user_123",
  };

  const screen = await renderWithFlags(<TestComponent />);

  await expect.element(screen.getByTestId("isPro")).toHaveTextContent("true");
  await expect.element(screen.getByTestId("status")).toHaveTextContent("trialing");
});

test("returns canceled status for canceled subscription", async () => {
  mockAuthState = { isLoaded: true, isSignedIn: true };
  mockQueryResult = {
    cancelAtPeriodEnd: true,
    isPro: false,
    status: "canceled",
    userId: "user_123",
  };

  const screen = await renderWithFlags(<TestComponent />);

  await expect.element(screen.getByTestId("isPro")).toHaveTextContent("false");
  await expect.element(screen.getByTestId("status")).toHaveTextContent("canceled");
  await expect.element(screen.getByTestId("cancelAtPeriodEnd")).toHaveTextContent("true");
});

test("returns past_due status for past due subscription", async () => {
  mockAuthState = { isLoaded: true, isSignedIn: true };
  mockQueryResult = {
    isPro: false,
    status: "past_due",
    userId: "user_123",
  };

  const screen = await renderWithFlags(<TestComponent />);

  await expect.element(screen.getByTestId("isPro")).toHaveTextContent("false");
  await expect.element(screen.getByTestId("status")).toHaveTextContent("past_due");
});

// =============================================================================
// Action Loading State Tests
// =============================================================================

// Test component that can trigger createCheckout
const TestComponentWithActions = ({ returnPath }: { returnPath?: string }) => {
  const { createCheckout, isActionLoading, isLoading, isPro, subscription } = useSubscription();

  const handleCheckout = async () => {
    await createCheckout(returnPath);
  };

  return (
    <div>
      <div data-testid="isLoading">{String(isLoading)}</div>
      <div data-testid="isPro">{String(isPro)}</div>
      <div data-testid="status">{subscription.status}</div>
      <div data-testid="isActionLoading">{String(isActionLoading)}</div>
      <button data-testid="checkout-button" onClick={() => void handleCheckout()} type="button">
        Checkout
      </button>
    </div>
  );
};

test("isActionLoading stays false when priceId is missing", async () => {
  // Clear the price ID to test the early return
  vi.stubEnv("VITE_STRIPE_PRICE_ID", "");
  mockAuthState = { isLoaded: true, isSignedIn: true };
  mockQueryResult = { isPro: false, status: "free", userId: "user_123" };

  const screen = await renderWithFlags(<TestComponentWithActions />);

  // Verify initial state
  await expect.element(screen.getByTestId("isActionLoading")).toHaveTextContent("false");

  // Click checkout button
  await screen.getByTestId("checkout-button").click();

  // isActionLoading should still be false (validation failed before loading state set)
  await expect.element(screen.getByTestId("isActionLoading")).toHaveTextContent("false");

  // Restore price ID for other tests
  vi.stubEnv("VITE_STRIPE_PRICE_ID", "price_test");
});

test("createCheckout forwards the return path to the checkout action", async () => {
  vi.stubEnv("VITE_STRIPE_PRICE_ID", "price_test");
  mockAuthState = { isLoaded: true, isSignedIn: true };
  mockQueryResult = { isPro: false, status: "free", userId: "user_123" };
  mockActionFn = vi.fn().mockResolvedValue({ url: "https://stripe.com/session" });

  const screen = await renderWithFlags(<TestComponentWithActions returnPath="/alerts?type=sku" />);

  await screen.getByTestId("checkout-button").click();

  expect(mockActionFn).toHaveBeenCalledWith({
    priceId: "price_test",
    returnPath: "/alerts?type=sku",
  });
});
