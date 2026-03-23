import type { ComponentType } from "react";
import { beforeEach, expect, test, vi } from "vitest";
import { render } from "vitest-browser-react";

import AdminRoute from "./admin";

let mockUserState = {
  isLoaded: true,
  user: {
    primaryEmailAddress: {
      emailAddress: "admin@example.com",
    },
  },
};

vi.mock("@clerk/react-router", () => ({
  SignIn: () => <div>Mock Sign In</div>,
  useUser: () => mockUserState,
}));

vi.mock("./admin/dashboard", () => ({
  AdminDashboard: () => <div>Admin Dashboard</div>,
}));

const AdminRouteComponent = AdminRoute as unknown as ComponentType<{
  loaderData: unknown;
}>;

beforeEach(() => {
  vi.clearAllMocks();
  mockUserState = {
    isLoaded: true,
    user: {
      primaryEmailAddress: {
        emailAddress: "admin@example.com",
      },
    },
  };
});

test("shows sign-in gating when the admin route is opened signed out", async () => {
  const screen = await render(
    <AdminRouteComponent
      loaderData={
        {
          adminCheck: {
            isAdmin: false,
            userTokenIdentifier: null,
          },
          initialProducts: null,
          isAuthenticated: false,
          productsData: null,
        } as never
      }
    />,
  );

  await expect.element(screen.getByRole("heading", { name: "Admin Access" })).toBeInTheDocument();
  await expect.element(screen.getByText("Sign in to access the admin panel")).toBeInTheDocument();
  await expect.element(screen.getByText("Mock Sign In")).toBeInTheDocument();
});

test("shows access denied details for signed-in non-admin users", async () => {
  const screen = await render(
    <AdminRouteComponent
      loaderData={
        {
          adminCheck: {
            isAdmin: false,
            userTokenIdentifier: "clerk|user-123",
          },
          initialProducts: null,
          isAuthenticated: true,
          productsData: null,
        } as never
      }
    />,
  );

  await expect.element(screen.getByText("Access Denied")).toBeInTheDocument();
  await expect.element(screen.getByText(/Signed in as: admin@example.com/)).toBeInTheDocument();
  await expect.element(screen.getByText(/Token ID: clerk\|user-123/)).toBeInTheDocument();
});

test("renders the admin dashboard for authorized users", async () => {
  const screen = await render(
    <AdminRouteComponent
      loaderData={
        {
          adminCheck: {
            isAdmin: true,
            userTokenIdentifier: "clerk|admin-123",
          },
          initialProducts: [],
          isAuthenticated: true,
          productsData: {
            action_needed: 0,
            auto_matched: 0,
            fallback: 0,
            manual_matched: 0,
            needs_review: 0,
            pending_approval: 0,
            total: 0,
            unmatched: 0,
          },
        } as never
      }
    />,
  );

  await expect.element(screen.getByText("Admin Dashboard")).toBeInTheDocument();
});
