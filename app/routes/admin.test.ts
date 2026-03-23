import { expect, test, vi } from "vitest";

import type { Route } from "./+types/admin";

const getAuthMock = vi.fn();
const fetchQueryMock = vi.fn();

vi.mock("@clerk/react-router/server", () => ({
  getAuth: getAuthMock,
}));

vi.mock("convex/nextjs", () => ({
  fetchQuery: fetchQueryMock,
}));

const createLoaderArgs = (): Route.LoaderArgs => ({
  context: new Map(),
  params: {},
  request: new Request("http://localhost/admin"),
  unstable_pattern: "/admin",
});

const resetAdminRouteMocks = () => {
  vi.clearAllMocks();
  vi.stubEnv("VITE_CONVEX_URL", "https://example.convex.cloud");
};

test("requests the Convex Clerk token template for protected admin queries", async () => {
  resetAdminRouteMocks();
  const getTokenMock = vi.fn().mockResolvedValue("convex-jwt");
  getAuthMock.mockResolvedValue({
    getToken: getTokenMock,
  });
  fetchQueryMock
    .mockResolvedValueOnce({
      isAdmin: true,
      userTokenIdentifier: "clerk|admin-user",
    })
    .mockResolvedValueOnce({
      auto_matched: [],
      counts: {
        auto_matched: 0,
        fallback: 0,
        manual_matched: 0,
        needs_review: 0,
        pending_approval: 0,
        total: 0,
        unmatched: 0,
      },
      fallback: [],
      manual_matched: [],
      needs_review: [],
      pending_approval: [],
      unmatched: [],
    });

  const { loader } = await import("./admin");

  const result = await loader(createLoaderArgs());

  expect(getTokenMock).toHaveBeenCalledWith({ template: "convex" });
  expect(fetchQueryMock).toHaveBeenNthCalledWith(
    1,
    expect.anything(),
    {},
    {
      token: "convex-jwt",
      url: "https://example.convex.cloud",
    },
  );
  expect(fetchQueryMock).toHaveBeenNthCalledWith(
    2,
    expect.anything(),
    {},
    {
      token: "convex-jwt",
      url: "https://example.convex.cloud",
    },
  );
  expect(result).toMatchObject({
    adminCheck: {
      isAdmin: true,
      userTokenIdentifier: "clerk|admin-user",
    },
    isAuthenticated: true,
  });
});

test("returns signed-out loader data when no Convex token is available", async () => {
  resetAdminRouteMocks();
  const getTokenMock = vi.fn().mockResolvedValue(null);
  getAuthMock.mockResolvedValue({
    getToken: getTokenMock,
  });

  const { loader } = await import("./admin");

  const result = await loader(createLoaderArgs());

  expect(getTokenMock).toHaveBeenCalledWith({ template: "convex" });
  expect(fetchQueryMock).not.toHaveBeenCalled();
  expect(result).toStrictEqual({
    adminCheck: {
      isAdmin: false,
      userTokenIdentifier: null,
    },
    isAuthenticated: false,
    productsData: null,
  });
});
