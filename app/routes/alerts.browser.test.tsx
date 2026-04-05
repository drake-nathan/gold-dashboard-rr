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
const useQueryMock = vi.fn();

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
    useQueryMock(ref, args);

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
  expect(useQueryMock).not.toHaveBeenCalledWith("getAlerts", expect.anything());
  expect(useQueryMock).not.toHaveBeenCalledWith("getProductOptions", expect.anything());
});

test("prefills the form from search params and creates a threshold alert when signed in", async () => {
  mockAuthState = { isLoaded: true, isSignedIn: true };

  const screen = await renderAlertsRoute("/alerts?name=Deal%20Watcher&type=threshold");
  const dialog = document.querySelector('[role="dialog"]');

  await expect.element(screen.getByRole("textbox", { name: "Name" })).toHaveValue("Deal Watcher");

  await screen.getByRole("spinbutton", { name: "Max Markup (%)" }).fill("3");

  const createAlertButton = dialog
    ? [...dialog.querySelectorAll("button")].find((button) =>
        button.textContent.includes("Create Alert"),
      )
    : null;

  if (!createAlertButton) {
    throw new Error("Create Alert button not found");
  }

  createAlertButton.click();

  expect(createAlertMock).toHaveBeenCalledWith({
    aboveSpotThreshold: 3,
    cooldownMinutes: 60,
    enabled: true,
    name: "Deal Watcher",
    triggerOn: "threshold_met",
    type: "threshold",
  });
  await expect.poll(() => toastSuccessMock.mock.calls[0]?.[0]).toBe("Alert created");
});

test("filters product options in the create alert combobox", async () => {
  mockAuthState = { isLoaded: true, isSignedIn: true };
  mockProductOptions = [
    { metalType: "gold", name: "American Buffalo", productId: "buffalo" },
    { metalType: "silver", name: "Canadian Maple Leaf", productId: "maple" },
    { metalType: "gold", name: "South African Krugerrand", productId: "krugerrand" },
  ];

  const screen = await renderAlertsRoute("/alerts?type=sku");
  const productInput = screen.getByRole("combobox", { name: "Product" });

  await productInput.fill("buffalo");

  await expect
    .poll(() =>
      [...document.querySelectorAll('[data-slot="combobox-item"]:not([hidden])')].map((item) =>
        item.textContent.trim(),
      ),
    )
    .toEqual(["American Buffalo (gold)"]);
});
