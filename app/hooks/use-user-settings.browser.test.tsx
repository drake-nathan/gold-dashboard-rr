/**
 * Browser tests for useUserSettings hook
 *
 * These tests verify the settings management works correctly
 * for anonymous users (React state-based, not persisted).
 */

import { useEffect } from "react";
import { expect, test, vi } from "vitest";
import { render } from "vitest-browser-react";

import { useUserSettings } from "./use-user-settings";

// Mock Clerk auth - anonymous user (not signed in)
vi.mock("@clerk/react-router", () => ({
  useAuth: () => ({
    isLoaded: true,
    isSignedIn: false,
  }),
}));

// Mock Convex - return undefined for all queries since user is not signed in
vi.mock("convex/react", () => ({
  useMutation: () => vi.fn(),
  useQuery: () => undefined,
}));

// Test component that exposes the hook's state and actions
const TestComponent = ({
  onReady,
}: {
  onReady: (actions: {
    getCostcoEnabled: () => boolean;
    setCostcoMembershipEnabled: (enabled: boolean) => Promise<void>;
  }) => void;
}) => {
  const { costcoMembershipEnabled, isLoading, setCostcoMembershipEnabled } = useUserSettings();

  useEffect(() => {
    if (!isLoading) {
      onReady({
        getCostcoEnabled: () => costcoMembershipEnabled,
        setCostcoMembershipEnabled,
      });
    }
  }, [isLoading, costcoMembershipEnabled, setCostcoMembershipEnabled, onReady]);

  return (
    <div>
      <div data-testid="loading">{isLoading ? "loading" : "ready"}</div>
      <div data-testid="costco-enabled">{costcoMembershipEnabled ? "enabled" : "disabled"}</div>
    </div>
  );
};

test("defaults to costco membership enabled (true)", async () => {
  const screen = await render(<TestComponent onReady={() => undefined} />);

  // Wait for hook to initialize
  await expect.element(screen.getByText("ready")).toBeInTheDocument();

  // Verify default is enabled
  await expect.element(screen.getByText("enabled")).toBeInTheDocument();
});

test("setCostcoMembershipEnabled toggles the value", async () => {
  interface Actions {
    getCostcoEnabled: () => boolean;
    setCostcoMembershipEnabled: (enabled: boolean) => Promise<void>;
  }
  let actions: Actions | null = null;

  const screen = await render(<TestComponent onReady={(a) => (actions = a)} />);

  await expect.element(screen.getByText("ready")).toBeInTheDocument();
  await expect.poll(() => actions !== null).toBe(true);

  const verifiedActions = actions as unknown as Actions;

  // Verify initial state is enabled
  await expect.element(screen.getByText("enabled")).toBeInTheDocument();

  // Disable it
  await verifiedActions.setCostcoMembershipEnabled(false);

  // Verify it's now disabled
  await expect.element(screen.getByText("disabled")).toBeInTheDocument();

  // Enable it again
  await verifiedActions.setCostcoMembershipEnabled(true);

  // Verify it's enabled again
  await expect.element(screen.getByText("enabled")).toBeInTheDocument();
});

test("isLoading is false for anonymous users", async () => {
  const screen = await render(<TestComponent onReady={() => undefined} />);

  // Should immediately show ready (not loading) for anonymous users
  await expect.element(screen.getByText("ready")).toBeInTheDocument();
});
