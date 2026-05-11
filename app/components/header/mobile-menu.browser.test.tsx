import type { ReactNode } from "react";
import { MemoryRouter } from "react-router";
import { beforeEach, expect, test, vi } from "vitest";
import { render } from "vitest-browser-react";

import { FEATURE_FLAGS, type FeatureFlagValues } from "@/lib/feature-flags";
import { FeatureFlagProvider } from "@/providers/feature-flag-provider";

import { MobileMenu } from "./mobile-menu";

let mockShowWhen: "signed-in" | "signed-out" = "signed-out";
let mockSubscription = { isPro: false };
let mockAuthState = { isSignedIn: false };
const openSignInMock = vi.fn();
const openSignUpMock = vi.fn();
const useQueryMock = vi.fn();

vi.mock("@clerk/react-router", () => ({
  Show: ({ children, when }: { children: ReactNode; when: "signed-in" | "signed-out" }) =>
    when === mockShowWhen ? children : null,
  useAuth: () => mockAuthState,
  useClerk: () => ({
    openSignIn: openSignInMock,
    openSignUp: openSignUpMock,
  }),
}));

vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => useQueryMock(...args),
}));

vi.mock("@/features/subscription/hooks/use-subscription", () => ({
  useSubscription: () => mockSubscription,
}));

vi.mock("./user-button-with-pro", () => ({
  UserButtonWithPro: () => <div>Account Avatar</div>,
}));

vi.mock("./theme-toggle", () => ({
  ThemeMenuItems: () => <div>Theme Items</div>,
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockShowWhen = "signed-out";
  mockAuthState = { isSignedIn: false };
  mockSubscription = { isPro: false };
});

const renderMobileMenu = (flags: FeatureFlagValues = {}) =>
  render(
    <FeatureFlagProvider flags={flags}>
      <MemoryRouter>
        <MobileMenu />
      </MemoryRouter>
    </FeatureFlagProvider>,
  );

test("shows signed-out auth actions without querying admin status", async () => {
  const screen = await renderMobileMenu();

  await screen.getByRole("button", { name: "Open menu" }).click();

  await expect.element(screen.getByText("Theme Items")).toBeInTheDocument();
  await expect.element(screen.getByText("Sign In")).toBeInTheDocument();
  await expect.element(screen.getByText("Sign Up")).toBeInTheDocument();
  expect(screen.container.textContent).not.toContain("Admin");
  expect(useQueryMock).not.toHaveBeenCalled();
});

test("shows alerts and account actions when alerts-beta flag is enabled", async () => {
  mockShowWhen = "signed-in";
  mockAuthState = { isSignedIn: true };
  mockSubscription = { isPro: true };

  const screen = await renderMobileMenu({ [FEATURE_FLAGS.ALERTS_BETA]: true });

  await screen.getByRole("button", { name: "Open menu" }).click();

  await expect.element(screen.getByText("Alerts")).toBeInTheDocument();
  await expect.element(screen.getByText("Account Avatar")).toBeInTheDocument();
  await expect.element(screen.getByText(/^Pro$/u)).toBeInTheDocument();
  expect(document.body.textContent).not.toContain("Admin");
  expect(useQueryMock).not.toHaveBeenCalled();
});

test("hides the alerts entry when the alerts-beta flag is disabled", async () => {
  mockShowWhen = "signed-in";
  mockAuthState = { isSignedIn: true };
  mockSubscription = { isPro: true };

  const screen = await renderMobileMenu();

  await screen.getByRole("button", { name: "Open menu" }).click();

  await expect.element(screen.getByText("Account Avatar")).toBeInTheDocument();
  expect(document.body.textContent).not.toContain("Alerts");
});
