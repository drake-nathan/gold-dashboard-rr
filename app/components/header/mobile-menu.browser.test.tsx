import type { ReactNode } from "react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { render } from "vitest-browser-react";

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

vi.mock("@/components/subscription/upgrade-button", () => ({
  UpgradeButton: () => <button type="button">Upgrade to Pro</button>,
}));

vi.mock("./user-button-with-pro", () => ({
  UserButtonWithPro: () => <div>Account Avatar</div>,
}));

vi.mock("./theme-toggle", () => ({
  ThemeMenuItems: () => <div>Theme Items</div>,
}));

afterEach(() => {
  vi.unstubAllEnvs();
});

beforeEach(() => {
  vi.clearAllMocks();
  mockShowWhen = "signed-out";
  mockAuthState = { isSignedIn: false };
  mockSubscription = { isPro: false };
});

test("shows signed-out auth actions without querying admin status", async () => {
  const screen = await render(
    <MemoryRouter>
      <MobileMenu />
    </MemoryRouter>,
  );

  await screen.getByRole("button", { name: "Open menu" }).click();

  await expect.element(screen.getByText("Theme Items")).toBeInTheDocument();
  await expect.element(screen.getByText("Sign In")).toBeInTheDocument();
  await expect.element(screen.getByText("Sign Up")).toBeInTheDocument();
  expect(screen.container.textContent).not.toContain("Admin");
  expect(useQueryMock).not.toHaveBeenCalled();
});

test("shows signed-in alerts and account actions without admin chrome", async () => {
  mockShowWhen = "signed-in";
  mockAuthState = { isSignedIn: true };
  mockSubscription = { isPro: true };
  vi.stubEnv("VITE_STRIPE_ENABLED", "true");

  const screen = await render(
    <MemoryRouter>
      <MobileMenu />
    </MemoryRouter>,
  );

  await screen.getByRole("button", { name: "Open menu" }).click();

  await expect.element(screen.getByText("Alerts")).toBeInTheDocument();
  await expect.element(screen.getByRole("button", { name: "Upgrade to Pro" })).toBeInTheDocument();
  await expect.element(screen.getByText("Account Avatar")).toBeInTheDocument();
  await expect.element(screen.getByText(/^Pro$/)).toBeInTheDocument();
  expect(document.body.textContent).not.toContain("Admin");
  expect(useQueryMock).not.toHaveBeenCalled();
});
