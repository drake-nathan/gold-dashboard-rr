import * as Sentry from "@sentry/react-router";
import { api } from "convex/_generated/api";
import { preloadQuery } from "convex/nextjs";
import { usePreloadedQuery } from "convex/react";
import { AlertTriangle, Home as HomeIcon, RefreshCw } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { isRouteErrorResponse, Link, useRouteError, useSearchParams } from "react-router";
import { toast } from "sonner";
import { useDebounceCallback, useIsClient } from "usehooks-ts";

import { FeatureAnnouncementModal } from "@/components/feature-announcement-modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorBoundary as UIErrorBoundary } from "@/components/ui/error-boundary";

import type { Route } from "./+types/index";
import { CalculatorSettingsDrawer } from "./calculator/calculator-settings-drawer";
import { CardManagerDrawer } from "./cards/card-manager-drawer";
import type { MetalFilter, SortOption } from "./filters/filter-types";
import { Filters } from "./filters/filters";
import {
  filterProducts,
  shouldAutoFlipToOutOfStock,
  sortProducts,
} from "./filters/product-filters";
import { useCalculatorSettings } from "./hooks/use-calculator-settings";
import { ProductCard } from "./products/product-card";
import { Stats } from "./stats/stats";
import { type DashboardStats, type DashboardMarketPrice, type ProductCardData } from "./types";
export type { DashboardMarketPrice, DashboardStats, ProductCardData } from "./types";

export const meta = () => {
  const title = "Dashboard.Gold - Precious Metals Price Comparison";
  const description =
    "Real-time price comparison for Costco gold and silver products vs Collect Pure bids. Calculate your profit with cashback rewards. Updated every 5 minutes.";
  const url = "https://gold-dashboard-rr-production.up.railway.app";
  const imageUrl = `${url}/og-image.png`;

  return [
    { title },
    { content: description, name: "description" },
    {
      content:
        "costco gold, costco silver, precious metals, gold price comparison, collect pure, gold arbitrage, costco bullion",
      name: "keywords",
    },
    { content: "website", property: "og:type" },
    { content: url, property: "og:url" },
    { content: title, property: "og:title" },
    { content: description, property: "og:description" },
    { content: imageUrl, property: "og:image" },
    { content: "1200", property: "og:image:width" },
    { content: "630", property: "og:image:height" },
    { content: "Dashboard.Gold", property: "og:site_name" },
    { content: "en_US", property: "og:locale" },
    { content: "summary_large_image", name: "twitter:card" },
    { content: url, name: "twitter:url" },
    { content: title, name: "twitter:title" },
    { content: description, name: "twitter:description" },
    { content: imageUrl, name: "twitter:image" },
    { content: "index, follow", name: "robots" },
    { content: "Dashboard.Gold", name: "author" },
    { content: "#D4AF37", name: "theme-color" },
  ];
};

export const loader = async () => {
  const convexUrl = process.env.VITE_CONVEX_URL;

  if (!convexUrl) {
    throw new Error("VITE_CONVEX_URL is not set");
  }

  const [preloadedSummary, preloadedProducts] = await Promise.all([
    preloadQuery(
      api.dashboard.getDashboardSummary,
      {},
      {
        url: convexUrl,
      },
    ),
    preloadQuery(
      api.dashboard.getDashboardProducts,
      {},
      {
        url: convexUrl,
      },
    ),
  ]);

  return { preloadedProducts, preloadedSummary };
};

interface DashboardProps {
  stats: DashboardStats;
}

const Dashboard = ({ stats }: DashboardProps) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [_, startTransition] = useTransition();
  const hasAutoFlipped = useRef(false);
  const isClient = useIsClient();

  const {
    availableCards,
    calculatorSettings,
    handleCardsChange,
    handleResetAll,
    isMigrating,
    totalCashbackPercentage,
    updateCalculatorSettings,
  } = useCalculatorSettings();

  const [cardManagerOpen, setCardManagerOpen] = useState(false);
  const [settingsDrawerOpen, setSettingsDrawerOpen] = useState(false);

  const migrationToastId = useRef<number | string | undefined>(undefined);
  useEffect(() => {
    if (isMigrating && !migrationToastId.current) {
      migrationToastId.current = toast.loading("Syncing your card settings...");
    } else if (!isMigrating && migrationToastId.current) {
      toast.success("Settings synced!", { id: migrationToastId.current });
      migrationToastId.current = undefined;
    }
  }, [isMigrating]);

  const metalFilter = (searchParams.get("metal") as MetalFilter | null) ?? "all";
  const sortOption = (searchParams.get("sort") as null | SortOption) ?? "profit-desc";
  const urlShowOutOfStock = searchParams.get("showOOS") === "true";
  const [showOutOfStock, setShowOutOfStockLocal] = useState(urlShowOutOfStock);

  useEffect(() => {
    setShowOutOfStockLocal(urlShowOutOfStock);
  }, [urlShowOutOfStock]);

  useEffect(() => {
    if (hasAutoFlipped.current) return;

    const hasFilterParams =
      searchParams.has("metal") || searchParams.has("sort") || searchParams.has("showOOS");

    if (hasFilterParams) {
      hasAutoFlipped.current = true;
      return;
    }

    const shouldAutoFlip = shouldAutoFlipToOutOfStock(
      stats.goldProducts.inStock,
      stats.silverProducts.inStock,
    );

    if (shouldAutoFlip) {
      startTransition(() => {
        const params = new URLSearchParams();
        params.set("showOOS", "true");
        params.set("sort", "last-in-stock");
        setSearchParams(params, { replace: true });
      });
    }

    hasAutoFlipped.current = true;
  }, [searchParams, setSearchParams, stats.goldProducts.inStock, stats.silverProducts.inStock]);

  const setMetalFilter = useDebounceCallback((value: MetalFilter) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams);
      if (value !== "all") {
        params.set("metal", value);
      } else {
        params.delete("metal");
      }
      setSearchParams(params, { replace: true });
    });
  }, 150);

  const setSortOption = useDebounceCallback((value: SortOption) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams);
      if (value !== "profit-desc") {
        params.set("sort", value);
      } else {
        params.delete("sort");
      }
      setSearchParams(params, { replace: true });
    });
  }, 150);

  const setShowOutOfStock = (value: boolean) => {
    setShowOutOfStockLocal(value);

    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set("showOOS", "true");
    } else {
      params.delete("showOOS");
    }
    setSearchParams(params, { replace: true });
  };

  const filteredProducts = filterProducts(
    stats.goldProducts.bestSpread,
    stats.silverProducts.bestSpread,
    { metalFilter, showOutOfStock },
  );

  const sortedProducts = sortProducts(filteredProducts, sortOption);

  return (
    <>
      <main className="container mx-auto flex-1 px-4 py-6">
        <UIErrorBoundary showDetails={import.meta.env.MODE === "development"}>
          <Stats
            lastFetch={stats.lastFetch}
            marketPrices={stats.marketPrices}
            totalCashbackPercentage={totalCashbackPercentage}
          />
        </UIErrorBoundary>

        <Filters
          availableCards={availableCards}
          calculatorSettings={calculatorSettings}
          isClientReady={isClient}
          metalFilter={metalFilter}
          onOpenCardManager={() => {
            setCardManagerOpen(true);
          }}
          onOpenSettings={() => {
            setSettingsDrawerOpen(true);
          }}
          setCalculatorSettings={(settings) => {
            void updateCalculatorSettings(settings);
          }}
          setMetalFilter={setMetalFilter}
          setShowOutOfStock={setShowOutOfStock}
          setSortOption={setSortOption}
          showOutOfStock={showOutOfStock}
          sortOption={sortOption}
        />

        <CardManagerDrawer
          cards={availableCards}
          onCardsChange={(cards, selectCardId) => {
            void handleCardsChange(cards, selectCardId);
          }}
          onClose={() => {
            setCardManagerOpen(false);
          }}
          onResetAll={handleResetAll}
          open={cardManagerOpen}
        />

        <CalculatorSettingsDrawer
          calculatorSettings={calculatorSettings}
          onOpenCardManager={() => {
            setCardManagerOpen(true);
          }}
          onOpenChange={setSettingsDrawerOpen}
          open={settingsDrawerOpen}
          setCalculatorSettings={(settings) => {
            void updateCalculatorSettings(settings);
          }}
        />

        {sortedProducts.length === 0 ? (
          <div className="flex h-64 items-center justify-center rounded-lg border border-dashed">
            <div className="text-center">
              <p className="text-lg font-medium text-muted-foreground">No products found</p>
              <p className="text-sm text-muted-foreground">Try adjusting your filters</p>
            </div>
          </div>
        ) : (
          <UIErrorBoundary showDetails={import.meta.env.MODE === "development"}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-[repeat(auto-fill,minmax(350px,1fr))]">
              {sortedProducts.map((product) => (
                <ProductCard
                  calculatorSettings={calculatorSettings}
                  key={product.productId}
                  marketPrices={stats.marketPrices}
                  product={product}
                />
              ))}
            </div>
          </UIErrorBoundary>
        )}
      </main>

      <FeatureAnnouncementModal />
    </>
  );
};

const Home = ({ loaderData }: Route.ComponentProps) => {
  const summary = usePreloadedQuery(loaderData.preloadedSummary);
  const products = usePreloadedQuery(loaderData.preloadedProducts);

  // oxlint-disable-next-line eslint/no-unnecessary-condition -- defense-in-depth: runtime data could be undefined despite type
  if (!summary || !products) {
    return (
      <main className="flex flex-1 items-center justify-center px-4 py-8">
        <div className="text-center">
          <div className="text-lg font-medium">Error</div>
          <div className="text-sm text-muted-foreground">
            We&apos;re having an issue connecting to our database, please try again later.
          </div>
        </div>
      </main>
    );
  }

  const stats = {
    ...summary,
    goldProducts: {
      ...summary.goldProducts,
      bestSpread: products.goldProducts,
    },
    silverProducts: {
      ...summary.silverProducts,
      bestSpread: products.silverProducts,
    },
  };

  return <Dashboard stats={stats} />;
};

export default Home;

export const ErrorBoundary = () => {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    return (
      <main className="container mx-auto flex flex-1 items-center justify-center px-4 py-8">
        <Card className="w-full max-w-md border-destructive/50 bg-destructive/10">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <CardTitle className="text-destructive">
                {error.status} {error.statusText}
              </CardTitle>
            </div>
            <CardDescription>
              {error.status === 404
                ? "The page you're looking for doesn't exist."
                : "An error occurred while loading this page."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error.data ? (
              <div className="rounded-md bg-muted p-4">
                <p className="text-sm text-muted-foreground">{String(error.data)}</p>
              </div>
            ) : null}
            <div className="flex gap-2">
              <Button asChild size="sm" variant="outline">
                <Link to="/">
                  <HomeIcon className="mr-2 h-4 w-4" />
                  Go Home
                </Link>
              </Button>
              <Button
                onClick={() => {
                  window.location.reload();
                }}
                size="sm"
                variant="outline"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  const isError = error instanceof Error;
  if (isError) {
    Sentry.captureException(error);
  }
  const errorMessage = isError ? error.message : "An unexpected error occurred";
  const errorStack = isError ? error.stack : undefined;

  return (
    <main className="container mx-auto flex flex-1 items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md border-destructive/50 bg-destructive/10">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <CardTitle className="text-destructive">Something went wrong</CardTitle>
          </div>
          <CardDescription>
            An error occurred while loading the dashboard. This could be due to a network issue or a
            problem with the data.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md bg-muted p-4">
            <p className="mb-2 text-sm font-medium">Error details:</p>
            <p className="font-mono text-xs text-muted-foreground">{errorMessage}</p>
            {import.meta.env.MODE === "development" && errorStack ? (
              <details className="mt-2">
                <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                  Stack trace
                </summary>
                <pre className="mt-2 overflow-x-auto text-xs text-muted-foreground">
                  {errorStack}
                </pre>
              </details>
            ) : null}
          </div>
          <div className="flex gap-2">
            <Button asChild size="sm" variant="outline">
              <Link to="/">
                <HomeIcon className="mr-2 h-4 w-4" />
                Go Home
              </Link>
            </Button>
            <Button
              onClick={() => {
                window.location.reload();
              }}
              size="sm"
              variant="outline"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
};
