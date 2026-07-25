import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { render } from "vitest-browser-react";

import type * as FeatureFlagsModule from "@/lib/feature-flags";

const DISMISSED_KEY = "announcement-alerts-launch-dismissed";
const VISIT_COUNT_KEY = "site-visit-count";
const SESSION_COUNTED_KEY = "site-visit-session-counted";

let mockAuthState: { isLoaded: boolean; isSignedIn: boolean } = {
  isLoaded: true,
  isSignedIn: true,
};
let mockSubscription = {
  isEnabled: true,
  isLoading: false,
  isPro: false,
};
let mockPaidFeaturesOn = true;

const captureMock = vi.fn();
const openUpgradeFlowMock = vi.fn();

vi.mock("@clerk/react-router", () => ({
  useAuth: () => mockAuthState,
}));

vi.mock("@/features/subscription/hooks/use-subscription", () => ({
  useSubscription: () => mockSubscription,
}));

vi.mock("@/features/subscription/use-upgrade-flow", () => ({
  useUpgradeFlow: () => ({ open: openUpgradeFlowMock }),
}));

vi.mock("@/lib/feature-flags", async (importActual) => {
  const actual = await importActual<typeof FeatureFlagsModule>();
  return {
    ...actual,
    useFeatureFlag: () => mockPaidFeaturesOn,
  };
});

vi.mock("posthog-js/react", () => ({
  usePostHog: () => ({ capture: captureMock }),
}));

vi.mock("react-router", () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}));

const seedReturnVisit = () => {
  localStorage.setItem(VISIT_COUNT_KEY, "2");
  sessionStorage.setItem(SESSION_COUNTED_KEY, "true");
};

const seedFirstVisit = () => {
  localStorage.setItem(VISIT_COUNT_KEY, "1");
  sessionStorage.setItem(SESSION_COUNTED_KEY, "true");
};

const importModal = async () => {
  const mod = await import("./feature-announcement-modal");
  return mod.FeatureAnnouncementModal;
};

beforeEach(() => {
  // The modal self-expires at EXPIRATION_DATE (2026-07-01), so these tests must
  // pin the clock inside the announcement window or they start failing once
  // that date passes. Fake only Date — browser-mode element polling needs real
  // timers to make progress.
  vi.useFakeTimers({ now: new Date("2026-06-01T12:00:00"), toFake: ["Date"] });
  localStorage.clear();
  sessionStorage.clear();
  mockAuthState = { isLoaded: true, isSignedIn: true };
  mockSubscription = { isEnabled: true, isLoading: false, isPro: false };
  mockPaidFeaturesOn = true;
  // Mark the session as counted so the module-load increment is a no-op,
  // and tests fully control the visit count.
  sessionStorage.setItem(SESSION_COUNTED_KEY, "true");
  captureMock.mockClear();
  openUpgradeFlowMock.mockClear();
  vi.resetModules();
});

afterEach(() => {
  vi.useRealTimers();
});

// =============================================================================
// Signed-in path
// =============================================================================

test("shows the upgrade-flavored pitch to signed-in free users", async () => {
  const FeatureAnnouncementModal = await importModal();
  const screen = await render(<FeatureAnnouncementModal />);

  await expect.element(screen.getByText("Never miss a Costco gold deal")).toBeInTheDocument();
  await expect
    .element(screen.getByRole("button", { name: /upgrade to pro.*\$8\/mo/iu }))
    .toBeInTheDocument();
  await expect
    .element(screen.getByRole("link", { name: "See Alerts" }))
    .toHaveAttribute("href", "/alerts");
});

test("fires announcement_modal_shown with the signed-in audience", async () => {
  const FeatureAnnouncementModal = await importModal();
  await render(<FeatureAnnouncementModal />);

  await expect
    .poll(() => captureMock.mock.calls)
    .toContainEqual(["announcement_modal_shown", { audience: "signed_in_free" }]);
});

test("primary CTA opens the upgrade flow and persists dismissal", async () => {
  const FeatureAnnouncementModal = await importModal();
  await render(<FeatureAnnouncementModal />);

  const upgradeButton = [...document.querySelectorAll("button")].find((b) =>
    b.textContent.includes("Upgrade to Pro"),
  );

  if (!upgradeButton) throw new Error("Upgrade button not found");

  upgradeButton.click();

  expect(openUpgradeFlowMock).toHaveBeenCalledWith("announcement_modal");
  expect(captureMock).toHaveBeenCalledWith("announcement_modal_cta_clicked", {
    audience: "signed_in_free",
    cta: "upgrade",
  });
  expect(localStorage.getItem(DISMISSED_KEY)).toBe("true");
  await expect.poll(() => document.body.textContent).not.toContain("Never miss a Costco gold deal");
});

test("does not show for Pro users", async () => {
  mockSubscription.isPro = true;

  const FeatureAnnouncementModal = await importModal();
  await render(<FeatureAnnouncementModal />);

  expect(document.body.textContent).not.toContain("Never miss a Costco gold deal");
});

test("does not show for signed-in users when paid features are not enabled", async () => {
  mockSubscription.isEnabled = false;

  const FeatureAnnouncementModal = await importModal();
  await render(<FeatureAnnouncementModal />);

  expect(document.body.textContent).not.toContain("Never miss a Costco gold deal");
});

// =============================================================================
// Anonymous path
// =============================================================================

test("does not show for anonymous first-time visitors", async () => {
  mockAuthState = { isLoaded: true, isSignedIn: false };
  seedFirstVisit();

  const FeatureAnnouncementModal = await importModal();
  await render(<FeatureAnnouncementModal />);

  expect(document.body.textContent).not.toContain("Never miss a Costco gold deal");
});

test("shows for anonymous return visitors when paid-features is on", async () => {
  mockAuthState = { isLoaded: true, isSignedIn: false };
  seedReturnVisit();

  const FeatureAnnouncementModal = await importModal();
  const screen = await render(<FeatureAnnouncementModal />);

  await expect.element(screen.getByText("Never miss a Costco gold deal")).toBeInTheDocument();
  await expect
    .element(screen.getByRole("link", { name: "Get Alerts" }))
    .toHaveAttribute("href", "/alerts");
  // Anonymous variant does NOT show the upgrade button — that pitch happens
  // on the /alerts page after signup.
  expect(document.body.textContent).not.toContain("Upgrade to Pro");
});

test("does not show for anonymous return visitors when paid-features is off", async () => {
  mockAuthState = { isLoaded: true, isSignedIn: false };
  mockPaidFeaturesOn = false;
  seedReturnVisit();

  const FeatureAnnouncementModal = await importModal();
  await render(<FeatureAnnouncementModal />);

  expect(document.body.textContent).not.toContain("Never miss a Costco gold deal");
});

// =============================================================================
// Shared
// =============================================================================

test("does not show after the user has dismissed it", async () => {
  localStorage.setItem(DISMISSED_KEY, "true");

  const FeatureAnnouncementModal = await importModal();
  await render(<FeatureAnnouncementModal />);

  expect(document.body.textContent).not.toContain("Never miss a Costco gold deal");
});

test("maybe Later closes the modal, persists, and emits a dismissed event", async () => {
  const FeatureAnnouncementModal = await importModal();
  const screen = await render(<FeatureAnnouncementModal />);

  await expect.element(screen.getByText("Never miss a Costco gold deal")).toBeInTheDocument();

  const dismissButton = [...document.querySelectorAll("button")].find((button) =>
    button.textContent.includes("Maybe Later"),
  );

  if (!dismissButton) {
    throw new Error("Maybe Later button not found");
  }

  dismissButton.click();

  await expect.poll(() => document.body.textContent).not.toContain("Never miss a Costco gold deal");
  expect(localStorage.getItem(DISMISSED_KEY)).toBe("true");
  expect(captureMock).toHaveBeenCalledWith("announcement_modal_dismissed", {
    audience: "signed_in_free",
    method: "maybe_later",
  });
});
