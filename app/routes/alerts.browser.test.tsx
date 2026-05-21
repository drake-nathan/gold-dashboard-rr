import { MemoryRouter } from "react-router";
import { beforeEach, expect, test, vi } from "vitest";
import { render } from "vitest-browser-react";

import AlertsRoute from "./alerts";

let mockAuthState = { isLoaded: true, isSignedIn: false };
interface MockAlert {
  _id: string;
  cooldownMinutes: number;
  enabled: boolean;
  name: string;
  pauseReason?: "billing_hold" | "inactive_subscription";
  triggerOn: "in_stock" | "price_drop" | "threshold_met";
  type: "category" | "sku" | "threshold";
}
let mockAlerts: MockAlert[] | undefined = [];
let mockBrandOptions: string[] = [];
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
      getBrandOptions: "getBrandOptions",
      getProductOptions: "getProductOptions",
      updateAlert: "updateAlert",
    },
    digests: {
      sendPreviewDigest: "sendPreviewDigest",
    },
    userSettings: {
      getSettings: "getSettings",
      updateDigestPreferences: "updateDigestPreferences",
    },
  },
}));

// Server-only module — stub it so the browser bundler doesn't pull posthog-node.
vi.mock("@/lib/feature-flags.server", () => ({
  evaluateFeatureFlags: vi.fn(),
}));

vi.mock("@clerk/react-router/server", () => ({
  getAuth: vi.fn(),
}));

vi.mock("@clerk/react-router", () => ({
  SignIn: () => <div>Mock Sign In</div>,
  useAuth: () => mockAuthState,
}));

vi.mock("convex/react", () => ({
  useAction: () => vi.fn(),
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

    if (ref === "getBrandOptions") {
      return mockBrandOptions;
    }

    if (ref === "getProductOptions") {
      return mockProductOptions;
    }

    if (ref === "getSettings") {
      return null;
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
  mockBrandOptions = [];
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

test("shows the empty state with a create CTA when signed in with no alerts", async () => {
  mockAuthState = { isLoaded: true, isSignedIn: true };
  mockAlerts = [];

  const screen = await renderAlertsRoute("/alerts");

  await expect.element(screen.getByText("No alerts yet")).toBeInTheDocument();
  await expect
    .element(screen.getByText("Create your first alert to get notified about deals and restocks."))
    .toBeInTheDocument();
  // The empty state surfaces a second Create Alert CTA inside the empty card,
  // alongside the persistent header CTA.
  const createAlertButtons = screen.getByRole("button", { name: "Create Alert" }).elements();
  expect(createAlertButtons).toHaveLength(2);
});

test("shows the loading state while the alerts query is pending", async () => {
  mockAuthState = { isLoaded: true, isSignedIn: true };
  mockAlerts = undefined;

  const screen = await renderAlertsRoute("/alerts");

  await expect.element(screen.getByText("Loading alerts...")).toBeInTheDocument();
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
    metalType: null,
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

test("category dialog starts with gold selected and treats any brand as a real value", async () => {
  mockAuthState = { isLoaded: true, isSignedIn: true };

  const screen = await renderAlertsRoute("/alerts?type=category");

  const goldButton = document.querySelector('[data-slot="toggle-group-item"][aria-label="Gold"]');

  if (!(goldButton instanceof HTMLButtonElement)) {
    throw new Error("Gold toggle button not found");
  }

  await expect.element(goldButton).toHaveAttribute("data-pressed");
  await expect
    .element(screen.getByRole("combobox", { name: "Brand" }))
    .toHaveTextContent("Any brand");
  await expect.element(screen.getByRole("button", { name: "Create Alert" })).not.toBeDisabled();
});

test("creates a category restock alert with segmented metal controls", async () => {
  mockAuthState = { isLoaded: true, isSignedIn: true };
  mockBrandOptions = ["Argor-Heraeus", "PAMP", "Valcambi"];

  const screen = await renderAlertsRoute("/alerts?type=category");
  const dialog = document.querySelector('[role="dialog"]');

  const goldButton = document.querySelector('[data-slot="toggle-group-item"][aria-label="Gold"]');

  if (!(goldButton instanceof HTMLButtonElement)) {
    throw new Error("Category metal toggle button not found");
  }

  goldButton.click();
  const weightButton = document.querySelector('[data-slot="toggle-group-item"][aria-label="1 oz"]');

  if (!(weightButton instanceof HTMLButtonElement)) {
    throw new Error("Category weight toggle button not found");
  }

  weightButton.click();
  await expect
    .element(screen.getByRole("textbox", { name: "Name" }))
    .toHaveValue("Gold 1 oz restock");

  const createAlertButton = dialog
    ? [...dialog.querySelectorAll("button")].find((button) =>
        button.textContent.includes("Create Alert"),
      )
    : null;

  if (!createAlertButton) {
    throw new Error("Create Alert button not found");
  }

  createAlertButton.click();

  await expect
    .poll(() => createAlertMock.mock.calls[0]?.[0])
    .toMatchObject({
      cooldownMinutes: 60,
      enabled: true,
      metalType: "gold",
      name: "Gold 1 oz restock",
      triggerOn: "in_stock",
      type: "category",
      weightGroup: "1oz",
    });
});

test("prevents enabling an alert when the subscription cannot enable alerts", async () => {
  mockAuthState = { isLoaded: true, isSignedIn: true };
  mockSubscription = {
    alertEntitlements: {
      canCreateAlerts: false,
      canEnableAlerts: false,
      canManageAlerts: true,
      canSendAlerts: false,
      shouldPauseEnabledAlerts: true,
    },
    isLoading: false,
  };
  mockAlerts = [
    {
      _id: "alert-1",
      cooldownMinutes: 60,
      enabled: false,
      name: "Paused alert",
      pauseReason: "inactive_subscription",
      triggerOn: "in_stock",
      type: "sku",
    },
  ];

  await renderAlertsRoute("/alerts");

  const alertSwitch = document.querySelector('[data-slot="switch"]');

  if (!(alertSwitch instanceof HTMLElement)) {
    throw new Error("Alert switch not found");
  }

  alertSwitch.click();

  expect(updateAlertMock).not.toHaveBeenCalled();
  await expect
    .poll(() => toastErrorMock.mock.calls[0]?.[0])
    .toBe("An active subscription is required to enable alerts.");
});
