import { beforeEach, expect, test, vi } from "vitest";
import { render } from "vitest-browser-react";

import { ObservabilitySync } from "./observability-sync";

let mockAuthState: { isLoaded: boolean; isSignedIn: boolean; userId: null | string } = {
  isLoaded: true,
  isSignedIn: false,
  userId: null,
};

const mockPostHog = {
  identify: vi.fn(),
  register: vi.fn(),
  reset: vi.fn(),
};

vi.mock("@clerk/react-router", () => ({
  useAuth: () => mockAuthState,
}));

vi.mock("posthog-js/react", () => ({
  usePostHog: () => mockPostHog,
}));

vi.mock("./anonymous-id", () => ({
  getOrCreateAnonymousId: () => "anon_123",
}));

beforeEach(() => {
  mockAuthState = { isLoaded: true, isSignedIn: false, userId: null };
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
