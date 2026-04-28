import { beforeEach, expect, test, vi } from "vitest";
import { render } from "vitest-browser-react";

import { ObservabilitySync } from "./observability-sync";

let mockAuthState: { isLoaded: boolean; isSignedIn: boolean; userId: null | string } = {
  isLoaded: true,
  isSignedIn: false,
  userId: null,
};
let mockUserState: { user: null | { primaryEmailAddress: null | { emailAddress: string } } } = {
  user: null,
};
let mockSubscription: {
  isLoading: boolean;
  isPro: boolean;
  subscription: { status: string };
} = {
  isLoading: false,
  isPro: false,
  subscription: { status: "anonymous" },
};
let mockAdmin: { isAdmin: boolean; isLoading: boolean } = {
  isAdmin: false,
  isLoading: false,
};

const mockPostHog = {
  identify: vi.fn(),
  register: vi.fn(),
  reset: vi.fn(),
};

vi.mock("@clerk/react-router", () => ({
  useAuth: () => mockAuthState,
  useUser: () => mockUserState,
}));

vi.mock("posthog-js/react", () => ({
  usePostHog: () => mockPostHog,
}));

vi.mock("@/features/subscription/hooks/use-subscription", () => ({
  useSubscription: () => mockSubscription,
}));

vi.mock("@/features/admin/hooks/use-is-admin", () => ({
  useIsAdmin: () => mockAdmin,
}));

vi.mock("./anonymous-id", () => ({
  getOrCreateAnonymousId: () => "anon_123",
}));

beforeEach(() => {
  mockAuthState = { isLoaded: true, isSignedIn: false, userId: null };
  mockUserState = { user: null };
  mockSubscription = {
    isLoading: false,
    isPro: false,
    subscription: { status: "anonymous" },
  };
  mockAdmin = { isAdmin: false, isLoading: false };
  mockPostHog.identify.mockClear();
  mockPostHog.register.mockClear();
  mockPostHog.reset.mockClear();
  vi.stubEnv("VITE_APP_RELEASE", "abc123");
  vi.stubEnv("VITE_APP_ENVIRONMENT", "develop");
});

test("resets PostHog identity on logout and restores the anonymous identity", async () => {
  mockAuthState = { isLoaded: true, isSignedIn: true, userId: "user_123" };

  const screen = await render(<ObservabilitySync />);

  await vi.waitFor(() => {
    expect(mockPostHog.identify).toHaveBeenCalledWith(
      "user_123",
      expect.objectContaining({
        anonymous_id: "anon_123",
        auth_state: "authenticated",
        environment: "develop",
        release: "abc123",
        user_id: "user_123",
      }),
    );
  });

  mockAuthState = { isLoaded: true, isSignedIn: false, userId: null };
  await screen.rerender(<ObservabilitySync />);

  await vi.waitFor(() => {
    expect(mockPostHog.reset).toHaveBeenCalledTimes(1);
  });

  await vi.waitFor(() => {
    expect(mockPostHog.identify).toHaveBeenLastCalledWith(
      "anon_123",
      expect.objectContaining({
        anonymous_id: "anon_123",
        auth_state: "anonymous",
        environment: "develop",
        release: "abc123",
        signed_in: false,
      }),
    );
  });
});

test("identifies signed-in admins with email, subscription, and admin state", async () => {
  mockAuthState = { isLoaded: true, isSignedIn: true, userId: "user_admin" };
  mockUserState = {
    user: { primaryEmailAddress: { emailAddress: "admin@example.com" } },
  };
  mockSubscription = {
    isLoading: false,
    isPro: true,
    subscription: { status: "active" },
  };
  mockAdmin = { isAdmin: true, isLoading: false };

  await render(<ObservabilitySync />);

  await vi.waitFor(() => {
    expect(mockPostHog.identify).toHaveBeenCalledWith(
      "user_admin",
      expect.objectContaining({
        email: "admin@example.com",
        is_admin: true,
        is_pro: true,
        subscription_status: "active",
        user_id: "user_admin",
      }),
    );
  });
});

test("re-identifies once admin and subscription queries resolve so person props reach PostHog", async () => {
  mockAuthState = { isLoaded: true, isSignedIn: true, userId: "user_late" };
  mockUserState = {
    user: { primaryEmailAddress: { emailAddress: "late@example.com" } },
  };
  mockSubscription = {
    isLoading: true,
    isPro: false,
    subscription: { status: "free" },
  };
  mockAdmin = { isAdmin: false, isLoading: true };

  const screen = await render(<ObservabilitySync />);

  await vi.waitFor(() => {
    expect(mockPostHog.identify).toHaveBeenCalled();
  });

  const initialProps = mockPostHog.identify.mock.calls.at(-1)?.[1];
  expect(initialProps).not.toHaveProperty("is_admin");
  expect(initialProps).not.toHaveProperty("is_pro");

  // Async queries resolve — admin true, subscription active.
  mockSubscription = {
    isLoading: false,
    isPro: true,
    subscription: { status: "active" },
  };
  mockAdmin = { isAdmin: true, isLoading: false };
  await screen.rerender(<ObservabilitySync />);

  await vi.waitFor(() => {
    const lastProps = mockPostHog.identify.mock.calls.at(-1)?.[1];
    expect(lastProps).toMatchObject({
      is_admin: true,
      is_pro: true,
      subscription_status: "active",
    });
  });

  expect(mockPostHog.identify.mock.calls.length).toBeGreaterThanOrEqual(2);
});

test("omits subscription and admin state while either query is still loading", async () => {
  mockAuthState = { isLoaded: true, isSignedIn: true, userId: "user_loading" };
  mockUserState = {
    user: { primaryEmailAddress: { emailAddress: "user@example.com" } },
  };
  mockSubscription = {
    isLoading: true,
    isPro: false,
    subscription: { status: "free" },
  };
  mockAdmin = { isAdmin: false, isLoading: true };

  await render(<ObservabilitySync />);

  await vi.waitFor(() => {
    expect(mockPostHog.identify).toHaveBeenCalled();
  });

  const lastCallProps = mockPostHog.identify.mock.calls.at(-1)?.[1];
  expect(lastCallProps).not.toHaveProperty("is_pro");
  expect(lastCallProps).not.toHaveProperty("subscription_status");
  expect(lastCallProps).not.toHaveProperty("is_admin");
  expect(lastCallProps).toMatchObject({ email: "user@example.com" });
});
