import type { ReactNode } from "react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { render } from "vitest-browser-react";

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

afterEach(() => {
  vi.unstubAllEnvs();
});

beforeEach(() => {
  vi.clearAllMocks();
  mockShowWhen = "signed-out";
  mockAuthState = { isSignedIn: false };
});

test("renders sign-in and sign-up actions when signed out without querying admin status", async () => {
  const screen = await render(
    <MemoryRouter>
      <HeaderActions />
    </MemoryRouter>,
    {
      wrapper: ({ children }: { children: ReactNode }) => children,
    },
  );

  await expect.element(screen.getByRole("button", { name: "Sign In" })).toBeInTheDocument();
  await expect.element(screen.getByRole("button", { name: "Sign Up" })).toBeInTheDocument();
  expect(useQueryMock).not.toHaveBeenCalled();
});

test("renders alerts and upgrade actions when signed in without showing admin chrome", async () => {
  mockShowWhen = "signed-in";
  mockAuthState = { isSignedIn: true };
  vi.stubEnv("VITE_STRIPE_ENABLED", "true");

  const screen = await render(
    <MemoryRouter>
      <HeaderActions />
    </MemoryRouter>,
    {
      wrapper: ({ children }: { children: ReactNode }) => children,
    },
  );

  await expect.element(screen.getByRole("link", { name: /alerts/i })).toBeInTheDocument();
  await expect.element(screen.getByRole("button", { name: "Upgrade to Pro" })).toBeInTheDocument();
  expect(screen.container.textContent).not.toContain("Admin");
  expect(useQueryMock).not.toHaveBeenCalled();
});
