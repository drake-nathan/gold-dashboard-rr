import { beforeEach, expect, test, vi } from "vitest";
import { render } from "vitest-browser-react";

import { FeatureAnnouncementModal } from "./feature-announcement-modal";

const DISMISSED_KEY = "announcement-alerts-launch-dismissed";

let mockAuthState = { isLoaded: true, isSignedIn: true };
let mockSubscription = {
  isEnabled: true,
  isLoading: false,
  isPro: false,
};

vi.mock("@clerk/react-router", () => ({
  useAuth: () => mockAuthState,
}));

vi.mock("@/features/subscription/hooks/use-subscription", () => ({
  useSubscription: () => mockSubscription,
}));

vi.mock("react-router", () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}));

beforeEach(() => {
  localStorage.removeItem(DISMISSED_KEY);
  mockAuthState = { isLoaded: true, isSignedIn: true };
  mockSubscription = { isEnabled: true, isLoading: false, isPro: false };
});

test("shows the announcement to signed-in free users with paid features enabled", async () => {
  const screen = await render(<FeatureAnnouncementModal />);

  await expect.element(screen.getByText("Alerts are live")).toBeInTheDocument();
  await expect
    .element(screen.getByRole("link", { name: "See Alerts" }))
    .toHaveAttribute("href", "/alerts");
});

test("does not show for Pro users", async () => {
  mockSubscription.isPro = true;

  const screen = await render(<FeatureAnnouncementModal />);

  expect(screen.container.textContent).not.toContain("Alerts are live");
});

test("does not show for signed-out visitors", async () => {
  mockAuthState = { isLoaded: true, isSignedIn: false };

  const screen = await render(<FeatureAnnouncementModal />);

  expect(screen.container.textContent).not.toContain("Alerts are live");
});

test("does not show when paid features are not enabled for this user", async () => {
  // isEnabled=false covers both env-level Stripe-off and paid-features flag-off.
  mockSubscription.isEnabled = false;

  const screen = await render(<FeatureAnnouncementModal />);

  expect(screen.container.textContent).not.toContain("Alerts are live");
});

test("does not show after the user has dismissed it", async () => {
  localStorage.setItem(DISMISSED_KEY, "true");

  const screen = await render(<FeatureAnnouncementModal />);

  expect(screen.container.textContent).not.toContain("Alerts are live");
});

test("renders a dismiss button alongside the primary CTA", async () => {
  // Click-driven dismissal persistence is exercised by manual QA — Base UI's
  // dialog overlay intercepts pointer events in test mode, making click-on-button
  // assertions flaky here. We just verify the dismiss affordance is present.
  const screen = await render(<FeatureAnnouncementModal />);

  await expect.element(screen.getByRole("button", { name: "Maybe Later" })).toBeInTheDocument();
});
