/**
 * Browser tests for UpgradeButton component
 */

import { beforeEach, expect, test, vi } from "vitest";
import { render } from "vitest-browser-react";

import { UpgradeButton } from "./upgrade-button";

// Track mock state
let mockAuthState = { isSignedIn: true };
let mockSubscription = {
  createCheckout: vi.fn(),
  isActionLoading: false,
  isEnabled: true,
  isLoading: false,
  isPro: false,
};

// Mock Clerk
vi.mock("@clerk/react-router", () => ({
  useAuth: () => mockAuthState,
}));

vi.mock("react-router", () => ({
  useLocation: () => ({
    hash: "",
    pathname: "/alerts",
    search: "?type=sku",
  }),
}));

// Mock useSubscription hook
vi.mock("@/features/subscription/hooks/use-subscription", () => ({
  useSubscription: () => mockSubscription,
}));

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
  },
}));

beforeEach(() => {
  mockAuthState = { isSignedIn: true };
  mockSubscription = {
    createCheckout: vi.fn().mockResolvedValue({ url: "https://stripe.com" }),
    isActionLoading: false,
    isEnabled: true,
    isLoading: false,
    isPro: false,
  };
});

test("renders upgrade button for free users", async () => {
  const screen = await render(<UpgradeButton />);

  await expect.element(screen.getByRole("button", { name: /upgrade to pro/i })).toBeInTheDocument();
});

test("hides button while subscription is loading", async () => {
  mockSubscription.isLoading = true;

  const screen = await render(<UpgradeButton />);

  const buttons = screen.container.querySelectorAll("button");

  expect(buttons).toHaveLength(0);
});

test("hides button for Pro users", async () => {
  mockSubscription.isPro = true;

  const screen = await render(<UpgradeButton />);

  // Button should not exist for Pro users
  const buttons = screen.container.querySelectorAll("button");

  expect(buttons).toHaveLength(0);
});

test("disables button when action is loading", async () => {
  mockSubscription.isActionLoading = true;

  const screen = await render(<UpgradeButton />);

  await expect.element(screen.getByRole("button", { name: /upgrade to pro/i })).toBeDisabled();
});

test("disables button when user is not signed in", async () => {
  mockAuthState.isSignedIn = false;

  const screen = await render(<UpgradeButton />);

  await expect.element(screen.getByRole("button", { name: /upgrade to pro/i })).toBeDisabled();
});

test("calls createCheckout when clicked", async () => {
  // Return no URL to prevent window.location.href navigation which kills the Vitest iframe
  mockSubscription.createCheckout = vi.fn().mockResolvedValue({});

  const screen = await render(<UpgradeButton />);

  const button = screen.getByRole("button", { name: /upgrade to pro/i });
  await button.click();

  await expect
    .element(screen.getByRole("heading", { name: /alerts require a pro subscription/i }))
    .toBeInTheDocument();
  expect(mockSubscription.createCheckout).not.toHaveBeenCalled();

  const continueButton = [...document.querySelectorAll("button")].find((candidate) =>
    candidate.textContent.includes("Continue to Stripe"),
  );

  if (!continueButton) {
    throw new Error("Continue to Stripe button not found");
  }

  continueButton.click();

  expect(mockSubscription.createCheckout).toHaveBeenCalledWith("/alerts?type=sku");
});

test("renders custom text when provided", async () => {
  const screen = await render(<UpgradeButton text="Go Pro Now" />);

  await expect.element(screen.getByRole("button", { name: /go pro now/i })).toBeInTheDocument();
});

test("hides button when Stripe is disabled", async () => {
  mockSubscription.isEnabled = false;

  const screen = await render(<UpgradeButton />);

  // Button should not exist when Stripe is disabled
  const buttons = screen.container.querySelectorAll("button");

  expect(buttons).toHaveLength(0);
});
