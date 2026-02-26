/**
 * Browser tests for ManageSubscriptionButton component
 */

import { beforeEach, expect, test, vi } from "vitest";
import { render } from "vitest-browser-react";

import { ManageSubscriptionButton } from "./manage-subscription-button";

// Track mock state
let mockSubscription = {
  isActionLoading: false,
  isEnabled: true,
  isPro: true,
  openPortal: vi.fn(),
};

// Mock useSubscription hook
vi.mock("@/hooks/use-subscription", () => ({
  useSubscription: () => mockSubscription,
}));

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
  },
}));

beforeEach(() => {
  mockSubscription = {
    isActionLoading: false,
    isEnabled: true,
    isPro: true,
    openPortal: vi.fn().mockResolvedValue({ url: "https://stripe.com/portal" }),
  };
});

test("renders for Pro users", async () => {
  const screen = await render(<ManageSubscriptionButton />);

  await expect
    .element(screen.getByRole("button", { name: /manage subscription/i }))
    .toBeInTheDocument();
});

test("hides button for non-Pro users", async () => {
  mockSubscription.isPro = false;

  const screen = await render(<ManageSubscriptionButton />);

  // Button should not exist for free users
  const buttons = screen.container.querySelectorAll("button");

  expect(buttons).toHaveLength(0);
});

test("disables button when action is loading", async () => {
  mockSubscription.isActionLoading = true;

  const screen = await render(<ManageSubscriptionButton />);

  await expect.element(screen.getByRole("button", { name: /manage subscription/i })).toBeDisabled();
});

test("calls openPortal when clicked", async () => {
  const screen = await render(<ManageSubscriptionButton />);

  const button = screen.getByRole("button", { name: /manage subscription/i });
  await button.click();

  expect(mockSubscription.openPortal).toHaveBeenCalled();
});

test("renders custom text when provided", async () => {
  const screen = await render(<ManageSubscriptionButton text="Billing" />);

  await expect.element(screen.getByRole("button", { name: /billing/i })).toBeInTheDocument();
});
