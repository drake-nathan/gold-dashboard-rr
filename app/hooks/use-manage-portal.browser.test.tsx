/**
 * Browser tests for useManagePortal hook
 *
 * Tests portal opening, error handling, and state pass-through.
 */

import { beforeEach, expect, test, vi } from "vitest";
import { render } from "vitest-browser-react";

import { useManagePortal } from "./use-manage-portal";

// =============================================================================
// Mock Setup
// =============================================================================

// Track mock state
let mockSubscription = {
  isActionLoading: false,
  isEnabled: true,
  isLoading: false,
  isPro: true,
  openPortal: vi.fn(),
};

// Mock useSubscription
vi.mock("@/hooks/use-subscription", () => ({
  useSubscription: () => mockSubscription,
}));

// Mock sonner toast - inline to avoid hoisting issues
vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockSubscription = {
    isActionLoading: false,
    isEnabled: true,
    isLoading: false,
    isPro: true,
    openPortal: vi.fn().mockResolvedValue({}),
  };
});

// Test component that uses the hook
const TestComponent = () => {
  const { handleManagePortal, isActionLoading, isEnabled, isLoading, isPro } = useManagePortal();

  return (
    <div>
      <button data-testid="manage-button" onClick={() => void handleManagePortal()} type="button">
        Manage
      </button>
      <div data-testid="isActionLoading">{String(isActionLoading)}</div>
      <div data-testid="isEnabled">{String(isEnabled)}</div>
      <div data-testid="isLoading">{String(isLoading)}</div>
      <div data-testid="isPro">{String(isPro)}</div>
    </div>
  );
};

// =============================================================================
// Error Handling Tests
// =============================================================================

test("shows error toast when openPortal returns error", async () => {
  const { toast } = await import("sonner");
  mockSubscription.openPortal = vi.fn().mockResolvedValue({ error: "Something went wrong" });

  const screen = await render(<TestComponent />);
  await screen.getByTestId("manage-button").click();

  expect(toast.error).toHaveBeenCalledWith("Something went wrong");
});

test("shows fallback error when no URL and no error returned", async () => {
  const { toast } = await import("sonner");
  mockSubscription.openPortal = vi.fn().mockResolvedValue({});

  const screen = await render(<TestComponent />);
  await screen.getByTestId("manage-button").click();

  expect(toast.error).toHaveBeenCalledWith("An unexpected error occurred. Please try again.");
});

// =============================================================================
// Success Tests
// =============================================================================

test("does not show error toast on successful URL response", async () => {
  const { toast } = await import("sonner");
  mockSubscription.openPortal = vi
    .fn()
    .mockResolvedValue({ url: "https://billing.stripe.com/portal/123" });

  const screen = await render(<TestComponent />);
  await screen.getByTestId("manage-button").click();

  expect(toast.error).not.toHaveBeenCalled();
});

// =============================================================================
// Pass-through State Tests
// =============================================================================

test("passes through isActionLoading from useSubscription", async () => {
  const screen = await render(<TestComponent />);

  await expect.element(screen.getByTestId("isActionLoading")).toHaveTextContent("false");
});

test("passes through isEnabled from useSubscription", async () => {
  const screen = await render(<TestComponent />);

  await expect.element(screen.getByTestId("isEnabled")).toHaveTextContent("true");
});

test("passes through isLoading from useSubscription", async () => {
  const screen = await render(<TestComponent />);

  await expect.element(screen.getByTestId("isLoading")).toHaveTextContent("false");
});

test("passes through isPro from useSubscription", async () => {
  const screen = await render(<TestComponent />);

  await expect.element(screen.getByTestId("isPro")).toHaveTextContent("true");
});
