import type { ComponentType, ReactNode } from "react";
import { createMemoryRouter, RouterProvider, useLocation } from "react-router";
import { beforeEach, expect, test, vi } from "vitest";
import { render } from "vitest-browser-react";

import DashboardRoute from "./dashboard";

const mockToastLoading = vi.fn();
const mockToastSuccess = vi.fn();
const mockPostHogCapture = vi.fn();

vi.mock("convex/react", () => ({
  usePreloadedQuery: (value: unknown) => value,
}));

vi.mock("sonner", () => ({
  toast: {
    loading: (...args: unknown[]) => mockToastLoading(...args),
    success: (...args: unknown[]) => mockToastSuccess(...args),
  },
}));

vi.mock("usehooks-ts", () => ({
  useDebounceCallback: <T extends (...args: never[]) => unknown>(fn: T) => fn,
  useIsClient: () => true,
}));

vi.mock("posthog-js/react", () => ({
  usePostHog: () => ({
    capture: (...args: unknown[]) => mockPostHogCapture(...args),
  }),
}));

vi.mock("./dashboard/hooks/use-calculator-settings", () => ({
  useCalculatorSettings: () => ({
    availableCards: [],
    calculatorSettings: {
      costcoMembershipEnabled: true,
      creditCard: null,
      pureFeeTier: null,
      quantity: 1,
    },
    handleCardsChange: vi.fn(),
    handleResetAll: vi.fn(),
    isMigrating: false,
    totalCashbackPercentage: 0,
    updateCalculatorSettings: vi.fn(),
  }),
}));

vi.mock("@/components/header", () => ({
  Header: () => <div>Header</div>,
}));

vi.mock("@/components/footer", () => ({
  Footer: () => <div>Footer</div>,
}));

vi.mock("@/components/ui/error-boundary", () => ({
  ErrorBoundary: ({ children }: { children: ReactNode }) => children,
}));

vi.mock("./dashboard/stats/stats", () => ({
  Stats: () => <div>Stats</div>,
}));

vi.mock("./dashboard/filters/filters", () => ({
  Filters: ({
    metalFilter,
    setMetalFilter,
    setShowOutOfStock,
    setSortOption,
    showOutOfStock,
    sortOption,
  }: {
    metalFilter: string;
    setMetalFilter: (value: "all" | "gold" | "silver") => void;
    setShowOutOfStock: (value: boolean) => void;
    setSortOption: (value: string) => void;
    showOutOfStock: boolean;
    sortOption: string;
  }) => (
    <div>
      <div data-testid="metal-filter">{metalFilter}</div>
      <div data-testid="show-oos">{String(showOutOfStock)}</div>
      <div data-testid="sort-option">{sortOption}</div>
      <button
        onClick={() => {
          setMetalFilter("gold");
        }}
        type="button"
      >
        Set gold
      </button>
      <button
        onClick={() => {
          setShowOutOfStock(true);
        }}
        type="button"
      >
        Show out of stock
      </button>
      <button
        onClick={() => {
          setSortOption("price-desc");
        }}
        type="button"
      >
        Sort price desc
      </button>
    </div>
  ),
}));

vi.mock("./dashboard/products/product-card", () => ({
  ProductCard: ({ product }: { product: { productId: string } }) => (
    <div data-testid="product-card">{product.productId}</div>
  ),
}));

vi.mock("./dashboard/calculator/calculator-settings-drawer", () => ({
  CalculatorSettingsDrawer: () => null,
}));

vi.mock("./dashboard/cards/card-manager-drawer", () => ({
  CardManagerDrawer: () => null,
}));

vi.mock("@/components/feature-announcement-modal", () => ({
  FeatureAnnouncementModal: () => null,
}));

const baseLoaderData = {
  preloadedProducts: {
    goldProducts: [
      {
        currentInStock: true,
        currentPrice: 100,
        lastInStockAt: null,
        productId: "gold-in-stock",
        pureBidPrice: 95,
        pureSpreadPercentage: 5,
      },
      {
        currentInStock: false,
        currentPrice: 110,
        lastInStockAt: 250,
        productId: "gold-out-of-stock",
        pureBidPrice: 100,
        pureSpreadPercentage: 10,
      },
    ],
    silverProducts: [
      {
        currentInStock: false,
        currentPrice: 50,
        lastInStockAt: 500,
        productId: "silver-out-of-stock",
        pureBidPrice: 45,
        pureSpreadPercentage: 8,
      },
    ],
  },
  preloadedSummary: {
    goldProducts: {
      inStock: 1,
    },
    lastFetch: null,
    marketPrices: [],
    silverProducts: {
      inStock: 0,
    },
  },
};

const DashboardRouteComponent = DashboardRoute as unknown as ComponentType<{
  loaderData: typeof baseLoaderData;
}>;

const LocationProbe = () => {
  const location = useLocation();

  return <div data-testid="location-search">{location.search}</div>;
};

const renderDashboardRoute = async (
  initialEntry: string,
  loaderData: typeof baseLoaderData = baseLoaderData,
) => {
  const router = createMemoryRouter(
    [
      {
        element: (
          <>
            <DashboardRouteComponent loaderData={loaderData} />
            <LocationProbe />
          </>
        ),
        path: "/dashboard",
      },
    ],
    { initialEntries: [initialEntry] },
  );

  return render(<RouterProvider router={router} />);
};

beforeEach(() => {
  vi.clearAllMocks();
});

test("auto-flips to out-of-stock params when no products are in stock", async () => {
  const screen = await renderDashboardRoute("/dashboard", {
    ...baseLoaderData,
    preloadedSummary: {
      ...baseLoaderData.preloadedSummary,
      goldProducts: { inStock: 0 },
      silverProducts: { inStock: 0 },
    },
  });

  await expect
    .element(screen.getByTestId("location-search"))
    .toHaveTextContent("?showOOS=true&sort=last-in-stock");
  await expect.element(screen.getByTestId("show-oos")).toHaveTextContent("true");
  await expect.element(screen.getByTestId("sort-option")).toHaveTextContent("last-in-stock");
});

test("captures dashboard_viewed after the auto-flip settles", async () => {
  const screen = await renderDashboardRoute("/dashboard", {
    ...baseLoaderData,
    preloadedSummary: {
      ...baseLoaderData.preloadedSummary,
      goldProducts: { inStock: 0 },
      silverProducts: { inStock: 0 },
    },
  });

  await expect
    .element(screen.getByTestId("location-search"))
    .toHaveTextContent("?showOOS=true&sort=last-in-stock");

  await vi.waitFor(() => {
    const dashboardViewedCalls = mockPostHogCapture.mock.calls.filter(
      ([eventName]) => eventName === "dashboard_viewed",
    );

    expect(dashboardViewedCalls).toHaveLength(1);
    expect(dashboardViewedCalls[0]?.[1]).toStrictEqual(
      expect.objectContaining({
        show_out_of_stock: true,
        sort_option: "last-in-stock",
        visible_products: 3,
      }),
    );
  });
});

test("updates filter params without dropping unrelated search params", async () => {
  const screen = await renderDashboardRoute("/dashboard?foo=bar");

  await screen.getByRole("button", { name: "Set gold" }).click();
  await screen.getByRole("button", { name: "Show out of stock" }).click();
  await screen.getByRole("button", { name: "Sort price desc" }).click();

  await expect
    .element(screen.getByTestId("location-search"))
    .toHaveTextContent("?foo=bar&metal=gold&showOOS=true&sort=price-desc");
  await expect.element(screen.getByTestId("metal-filter")).toHaveTextContent("gold");
});
