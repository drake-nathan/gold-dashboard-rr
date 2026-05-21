/**
 * Browser tests for UpgradeButton component
 */

import { beforeEach, expect, test, vi } from "vitest";
import { render } from "vitest-browser-react";

import { UpgradeFlowProvider } from "@/features/subscription/upgrade-flow-provider";
import { FEATURE_FLAGS, type FeatureFlagValues } from "@/lib/feature-flags";
import { FeatureFlagProvider } from "@/providers/feature-flag-provider";

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
const captureMock = vi.fn();

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

vi.mock("posthog-js/react", () => ({
  usePostHog: () => ({ capture: captureMock }),
}));

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
  },
}));

const flagsOn: FeatureFlagValues = { [FEATURE_FLAGS.PAID_FEATURES]: true };

const renderUpgradeButton = (
  ui: React.ReactElement = <UpgradeButton />,
  flags: FeatureFlagValues = flagsOn,
) =>
  render(
    <FeatureFlagProvider flags={flags}>
      <UpgradeFlowProvider>{ui}</UpgradeFlowProvider>
    </FeatureFlagProvider>,
  );

beforeEach(() => {
  mockAuthState = { isSignedIn: true };
  mockSubscription = {
    createCheckout: vi.fn().mockResolvedValue({ url: "https://stripe.com" }),
    isActionLoading: false,
    isEnabled: true,
    isLoading: false,
    isPro: false,
  };
  captureMock.mockClear();
});

test("renders upgrade button for free users", async () => {
  const screen = await renderUpgradeButton();

  await expect
    .element(screen.getByRole("button", { name: /upgrade to pro/iu }))
    .toBeInTheDocument();
});

test("hides button while subscription is loading", async () => {
  mockSubscription.isLoading = true;

  const screen = await renderUpgradeButton();

  const buttons = screen.container.querySelectorAll("button");

  expect(buttons).toHaveLength(0);
});

test("hides button for Pro users", async () => {
  mockSubscription.isPro = true;

  const screen = await renderUpgradeButton();

  const buttons = screen.container.querySelectorAll("button");

  expect(buttons).toHaveLength(0);
});

test("disables button when action is loading", async () => {
  mockSubscription.isActionLoading = true;

  const screen = await renderUpgradeButton();

  await expect.element(screen.getByRole("button", { name: /upgrade to pro/iu })).toBeDisabled();
});

test("disables button when user is not signed in", async () => {
  mockAuthState.isSignedIn = false;

  const screen = await renderUpgradeButton();

  await expect.element(screen.getByRole("button", { name: /upgrade to pro/iu })).toBeDisabled();
});

test("opens upgrade dialog and fires upgrade_checkout_started when continuing", async () => {
  // Return no URL to prevent window.location.assign which kills the Vitest iframe
  vi.spyOn(mockSubscription, "createCheckout").mockResolvedValue({});

  const screen = await renderUpgradeButton();

  const button = screen.getByRole("button", { name: /upgrade to pro/iu });
  await button.click();

  await expect
    .element(screen.getByRole("heading", { name: /alerts require a pro subscription/iu }))
    .toBeInTheDocument();
  expect(captureMock).toHaveBeenCalledWith("upgrade_dialog_opened", { source: "header" });
  expect(mockSubscription.createCheckout).not.toHaveBeenCalled();

  const continueButton = [...document.querySelectorAll("button")].find((candidate) =>
    candidate.textContent.includes("Continue to Stripe"),
  );

  if (!continueButton) {
    throw new Error("Continue to Stripe button not found");
  }

  continueButton.click();

  expect(mockSubscription.createCheckout).toHaveBeenCalledWith("/alerts?type=sku");
  expect(captureMock).toHaveBeenCalledWith("upgrade_checkout_started");
});

test("renders custom text when provided", async () => {
  const screen = await renderUpgradeButton(<UpgradeButton text="Go Pro Now" />);

  await expect.element(screen.getByRole("button", { name: /go pro now/iu })).toBeInTheDocument();
});

test("hides button when paid features are not enabled for this user", async () => {
  // isEnabled collapses both gates (env-level Stripe wiring + paid-features flag)
  // into a single signal from useSubscription. The button trusts that.
  mockSubscription.isEnabled = false;

  const screen = await renderUpgradeButton();

  const buttons = screen.container.querySelectorAll("button");

  expect(buttons).toHaveLength(0);
});
