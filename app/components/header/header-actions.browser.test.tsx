import type { ReactNode } from "react";
import { MemoryRouter } from "react-router";
import { beforeEach, expect, test, vi } from "vitest";
import { render } from "vitest-browser-react";

import { FEATURE_FLAGS, type FeatureFlagValues } from "@/lib/feature-flags";
import { FeatureFlagProvider } from "@/providers/feature-flag-provider";

import { HeaderActions } from "./header-actions";

let mockShowWhen: "signed-in" | "signed-out" = "signed-out";
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

vi.mock("@/components/subscription/upgrade-button", () => ({
  UpgradeButton: () => <button type="button">Upgrade to Pro</button>,
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockShowWhen = "signed-out";
  mockAuthState = { isSignedIn: false };
});

const renderHeaderActions = (flags: FeatureFlagValues = {}) =>
  render(
    <FeatureFlagProvider flags={flags}>
      <MemoryRouter>
        <HeaderActions />
      </MemoryRouter>
    </FeatureFlagProvider>,
    {
      wrapper: ({ children }: { children: ReactNode }) => children,
    },
  );

test("renders sign-in and sign-up actions when signed out without querying admin status", async () => {
  const screen = await renderHeaderActions();

  await expect.element(screen.getByRole("button", { name: "Sign In" })).toBeInTheDocument();
  await expect.element(screen.getByRole("button", { name: "Sign Up" })).toBeInTheDocument();
  expect(useQueryMock).not.toHaveBeenCalled();
});

test("renders alerts and upgrade actions when signed in with the alerts-beta flag enabled", async () => {
  mockShowWhen = "signed-in";
  mockAuthState = { isSignedIn: true };

  const screen = await renderHeaderActions({ [FEATURE_FLAGS.ALERTS_BETA]: true });

  await expect.element(screen.getByRole("link", { name: /alerts/iu })).toBeInTheDocument();
  await expect.element(screen.getByRole("button", { name: "Upgrade to Pro" })).toBeInTheDocument();
  expect(screen.container.textContent).not.toContain("Admin");
  expect(useQueryMock).not.toHaveBeenCalled();
});

test("hides the alerts link when the alerts-beta flag is disabled", async () => {
  mockShowWhen = "signed-in";
  mockAuthState = { isSignedIn: true };

  const screen = await renderHeaderActions();

  expect(screen.container.textContent).not.toContain("Alerts");
  await expect.element(screen.getByRole("button", { name: "Upgrade to Pro" })).toBeInTheDocument();
});
