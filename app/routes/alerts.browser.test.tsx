import { MemoryRouter } from "react-router";
import { beforeEach, expect, test, vi } from "vitest";
import { render } from "vitest-browser-react";

import AlertsRoute from "./alerts";

let mockAuthState = { isLoaded: true, isSignedIn: false };
let mockAlerts: {
  _id: string;
  cooldownMinutes: number;
  enabled: boolean;
  name: string;
  triggerOn: "in_stock" | "price_drop" | "threshold_met";
  type: "category" | "sku" | "threshold";
}[] = [];
let mockProductOptions: { metalType: string; name: string; productId: string }[] = [];
let mockSubscription = {
  alertEntitlements: {
    canCreateAlerts: true,
    canEnableAlerts: true,
    canManageAlerts: true,
    canSendAlerts: true,
    shouldPauseEnabledAlerts: false,
  },
  isLoading: false,
};

const createAlertMock = vi.fn();
const updateAlertMock = vi.fn();
const deleteAlertMock = vi.fn();
const toastSuccessMock = vi.fn();
const toastErrorMock = vi.fn();

vi.mock("convex/_generated/api", () => ({
  api: {
    alerts: {
      createAlert: "createAlert",
      deleteAlert: "deleteAlert",
      getAlerts: "getAlerts",
      getProductOptions: "getProductOptions",
      updateAlert: "updateAlert",
    },
  },
}));

vi.mock("@clerk/react-router", () => ({
  SignIn: () => <div>Mock Sign In</div>,
  useAuth: () => mockAuthState,
}));

vi.mock("convex/react", () => ({
  useMutation: (ref: string) => {
    if (ref === "createAlert") return createAlertMock;
    if (ref === "updateAlert") return updateAlertMock;
    if (ref === "deleteAlert") return deleteAlertMock;
    return vi.fn();
  },
  useQuery: (ref: string, args: unknown) => {
    if (args === "skip") {
      return undefined;
    }

    if (ref === "getAlerts") {
      return mockAlerts;
    }

    if (ref === "getProductOptions") {
      return mockProductOptions;
    }

    return undefined;
  },
}));

vi.mock("@/features/subscription/hooks/use-subscription", () => ({
  useSubscription: () => mockSubscription,
}));

vi.mock("sonner", () => ({
  toast: {
    error: (...args: unknown[]) => toastErrorMock(...args),
    success: (...args: unknown[]) => toastSuccessMock(...args),
  },
}));

vi.mock("@/components/header", () => ({
  Header: () => <div>Header</div>,
}));

vi.mock("@/components/footer", () => ({
  Footer: () => <div>Footer</div>,
}));

vi.mock("@/components/subscription/upgrade-button", () => ({
  UpgradeButton: () => <button type="button">Upgrade</button>,
}));

const renderAlertsRoute = async (initialEntry: string) =>
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <AlertsRoute />
    </MemoryRouter>,
  );

beforeEach(() => {
  vi.clearAllMocks();
  mockAuthState = { isLoaded: true, isSignedIn: false };
  mockAlerts = [];
  mockProductOptions = [];
  mockSubscription = {
    alertEntitlements: {
      canCreateAlerts: true,
      canEnableAlerts: true,
      canManageAlerts: true,
      canSendAlerts: true,
      shouldPauseEnabledAlerts: false,
    },
    isLoading: false,
  };
  createAlertMock.mockResolvedValue({});
  updateAlertMock.mockResolvedValue({});
  deleteAlertMock.mockResolvedValue({});
});

test("shows sign-in gating when the alerts route is opened signed out", async () => {
  const screen = await renderAlertsRoute("/alerts");

  await expect.element(screen.getByRole("heading", { name: "Alerts" })).toBeInTheDocument();
  await expect.element(screen.getByText("Sign in to manage your alerts")).toBeInTheDocument();
  await expect.element(screen.getByText("Mock Sign In")).toBeInTheDocument();
});

test("prefills the form from search params and creates a threshold alert when signed in", async () => {
  mockAuthState = { isLoaded: true, isSignedIn: true };

  const screen = await renderAlertsRoute("/alerts?name=Deal%20Watcher");

  await expect.element(screen.getByRole("textbox", { name: "Name" })).toHaveValue("Deal Watcher");

  await screen.getByRole("spinbutton", { name: "Profit Threshold (USD)" }).fill("25");
  await screen.getByRole("button", { name: "Create Alert" }).click();

  expect(createAlertMock).toHaveBeenCalledWith({
    cooldownMinutes: 60,
    enabled: true,
    name: "Deal Watcher",
    profitThreshold: 25,
    triggerOn: "threshold_met",
    type: "threshold",
  });
  expect(toastSuccessMock).toHaveBeenCalledWith("Alert created");
});
