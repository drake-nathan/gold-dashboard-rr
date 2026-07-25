import type { LoaderFunctionArgs } from "react-router";
import { expect, test, vi } from "vitest";

import { FEATURE_FLAGS } from "@/lib/feature-flags";

const getAuthMock = vi.fn();
const evaluateFeatureFlagsMock = vi.fn();

vi.mock("@clerk/react-router/server", () => ({
  getAuth: getAuthMock,
}));

vi.mock("@/lib/feature-flags.server", () => ({
  evaluateFeatureFlags: evaluateFeatureFlagsMock,
}));

const createLoaderArgs = (): LoaderFunctionArgs => ({
  context: new Map(),
  params: {},
  pattern: "/alerts",
  request: new Request("http://localhost/alerts"),
  url: new URL("http://localhost/alerts"),
});

const resetMocks = () => {
  vi.clearAllMocks();
};

test("allows signed-out visitors through so the in-page sign-in renders", async () => {
  resetMocks();
  getAuthMock.mockResolvedValue({ userId: null });

  const { loader } = await import("./alerts");

  const result = await loader(createLoaderArgs());

  expect(result).toBeNull();
  expect(evaluateFeatureFlagsMock).not.toHaveBeenCalled();
});

test("redirects signed-in users to / when the paid-features flag is off", async () => {
  resetMocks();
  getAuthMock.mockResolvedValue({ userId: "user_123" });
  evaluateFeatureFlagsMock.mockResolvedValue({ [FEATURE_FLAGS.PAID_FEATURES]: false });

  const { loader } = await import("./alerts");

  await expect(loader(createLoaderArgs())).rejects.toMatchObject({
    headers: expect.any(Headers),
    status: 302,
  });

  expect(evaluateFeatureFlagsMock).toHaveBeenCalledWith("user_123");
});

test("permits signed-in users when the paid-features flag is on", async () => {
  resetMocks();
  getAuthMock.mockResolvedValue({ userId: "user_admin" });
  evaluateFeatureFlagsMock.mockResolvedValue({ [FEATURE_FLAGS.PAID_FEATURES]: true });

  const { loader } = await import("./alerts");

  const result = await loader(createLoaderArgs());

  expect(result).toBeNull();
  expect(evaluateFeatureFlagsMock).toHaveBeenCalledWith("user_admin");
});
