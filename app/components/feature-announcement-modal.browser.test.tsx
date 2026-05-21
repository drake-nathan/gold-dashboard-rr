import { beforeEach, expect, test, vi } from "vitest";
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

vi.mock("@clerk/react-router", () => ({
  useAuth: () => mockAuthState,
}));

vi.mock("@/features/subscription/hooks/use-subscription", () => ({
  useSubscription: () => mockSubscription,
}));

vi.mock("@/lib/feature-flags", async (importActual) => {
  const actual = await importActual<typeof FeatureFlagsModule>();
  return {
    ...actual,
    useFeatureFlag: () => mockPaidFeaturesOn,
  };
});

vi.mock("react-router", () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}));

// Helper that simulates a return visit by pre-seeding visit count to 2.
// The module's module-load increment would bump to 3 on first import, but
// vitest's module cache means we set the count before importing.
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
  localStorage.clear();
  sessionStorage.clear();
  mockAuthState = { isLoaded: true, isSignedIn: true };
  mockSubscription = { isEnabled: true, isLoading: false, isPro: false };
  mockPaidFeaturesOn = true;
  // Mark the session as counted so the module-load increment is a no-op,
  // and tests fully control the visit count.
  sessionStorage.setItem(SESSION_COUNTED_KEY, "true");
  vi.resetModules();
});

// =============================================================================
// Signed-in path
// =============================================================================

test("shows the announcement to signed-in free users with paid features enabled", async () => {
  const FeatureAnnouncementModal = await importModal();
  const screen = await render(<FeatureAnnouncementModal />);

  await expect.element(screen.getByText("Alerts are live")).toBeInTheDocument();
  await expect
    .element(screen.getByRole("link", { name: "See Alerts" }))
    .toHaveAttribute("href", "/alerts");
});

test("does not show for Pro users", async () => {
  mockSubscription.isPro = true;

  const FeatureAnnouncementModal = await importModal();
  await render(<FeatureAnnouncementModal />);

  expect(document.body.textContent).not.toContain("Alerts are live");
});

test("does not show for signed-in users when paid features are not enabled", async () => {
  // isEnabled=false covers both env-level Stripe-off and paid-features flag-off.
  mockSubscription.isEnabled = false;

  const FeatureAnnouncementModal = await importModal();
  await render(<FeatureAnnouncementModal />);

  expect(document.body.textContent).not.toContain("Alerts are live");
});

// =============================================================================
// Anonymous path
// =============================================================================

test("does not show for anonymous first-time visitors", async () => {
  mockAuthState = { isLoaded: true, isSignedIn: false };
  seedFirstVisit();

  const FeatureAnnouncementModal = await importModal();
  await render(<FeatureAnnouncementModal />);

  expect(document.body.textContent).not.toContain("Alerts are live");
});

test("shows for anonymous return visitors when paid-features is on", async () => {
  mockAuthState = { isLoaded: true, isSignedIn: false };
  seedReturnVisit();

  const FeatureAnnouncementModal = await importModal();
  const screen = await render(<FeatureAnnouncementModal />);

  await expect.element(screen.getByText("Alerts are live")).toBeInTheDocument();
});

test("does not show for anonymous return visitors when paid-features is off", async () => {
  mockAuthState = { isLoaded: true, isSignedIn: false };
  mockPaidFeaturesOn = false;
  seedReturnVisit();

  const FeatureAnnouncementModal = await importModal();
  await render(<FeatureAnnouncementModal />);

  expect(document.body.textContent).not.toContain("Alerts are live");
});

// =============================================================================
// Shared
// =============================================================================

test("does not show after the user has dismissed it", async () => {
  localStorage.setItem(DISMISSED_KEY, "true");

  const FeatureAnnouncementModal = await importModal();
  await render(<FeatureAnnouncementModal />);

  expect(document.body.textContent).not.toContain("Alerts are live");
});

test("immediately closes when Maybe Later is clicked and persists the dismissal", async () => {
  // Regression: a previous refactor dropped the in-memory dismissed state,
  // so clicking Maybe Later wrote to localStorage but didn't trigger a
  // re-render — the modal stayed visible until the next mount. Guard against
  // it by asserting the modal text is gone after the click.
  //
  // We click the raw HTMLButtonElement (not a Locator) because Base UI's
  // dialog overlay intercepts playwright pointer events; raw .click() bypasses
  // that. Same pattern as `app/components/ui/dialog.browser.test.tsx`.
  const FeatureAnnouncementModal = await importModal();
  const screen = await render(<FeatureAnnouncementModal />);

  await expect.element(screen.getByText("Alerts are live")).toBeInTheDocument();

  const dismissButton = [...document.querySelectorAll("button")].find((button) =>
    button.textContent.includes("Maybe Later"),
  );

  if (!dismissButton) {
    throw new Error("Maybe Later button not found");
  }

  dismissButton.click();

  await expect.poll(() => document.body.textContent).not.toContain("Alerts are live");
  expect(localStorage.getItem(DISMISSED_KEY)).toBe("true");
});
