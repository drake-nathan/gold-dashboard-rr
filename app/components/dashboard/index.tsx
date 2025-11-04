import type { api } from "convex/_generated/api";
import type { FunctionReturnType } from "convex/server";

import { useEffect, useRef, useState, useTransition } from "react";
import { useSearchParams } from "react-router";

import { CalculatorSettingsDrawer } from "@/components/calculator-settings-drawer";
import { CardManagerDrawer } from "@/components/card-manager-drawer";
import { ProductCard } from "@/components/product-card";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { useCalculatorSettings } from "@/hooks/use-calculator-settings";

import type { MetalFilter, SortOption } from "./filter-types";

import { Footer } from "../footer";
import { Header } from "../header";
import { Filters } from "./filters";
import { Stats } from "./stats";

type GetStats = FunctionReturnType<typeof api.dashboard.getStats>;

export type ProductCardData = GetStats["goldProducts"]["bestSpread"][number];

interface DashboardProps {
  stats: GetStats;
}

export const Dashboard = ({ stats }: DashboardProps) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [_, startTransition] = useTransition();
  const hasAutoFlipped = useRef(false);

  // Calculator settings (credit cards, membership, fee tier) - managed by custom hook
  const {
    availableCards,
    calculatorSettings,
    handleCardsChange,
    totalCashbackPercentage,
    updateCalculatorSettings,
  } = useCalculatorSettings();

  // UI drawer state
  const [cardManagerOpen, setCardManagerOpen] = useState(false);
  const [settingsDrawerOpen, setSettingsDrawerOpen] = useState(false);

  // Derive filter state directly from URL params
  const metalFilter =
    (searchParams.get("metal") as MetalFilter | null) ?? "all";
  const sortOption =
    (searchParams.get("sort") as null | SortOption) ?? "spread-asc";
  const showOutOfStock = searchParams.get("showOOS") === "true";

  // Auto-flip logic: On initial page load, if no products are in stock,
  // enable "Show Out of Stock" and sort by "Last Out of Stock"
  useEffect(() => {
    // Only run once on initial mount
    if (hasAutoFlipped.current) return;

    // Check if URL has any filter params (meaning user is navigating, not initial load)
    const hasFilterParams =
      searchParams.has("metal") ||
      searchParams.has("sort") ||
      searchParams.has("showOOS");

    // If user already has params set, don't auto-flip
    if (hasFilterParams) {
      hasAutoFlipped.current = true;
      return;
    }

    // Check if there are any in-stock products
    const hasInStockProducts =
      stats.goldProducts.inStock > 0 || stats.silverProducts.inStock > 0;

    // If no in-stock products, auto-flip settings
    if (!hasInStockProducts) {
      startTransition(() => {
        const params = new URLSearchParams();
        params.set("showOOS", "true");
        params.set("sort", "last-in-stock");
        setSearchParams(params, { replace: true });
      });
    }

    hasAutoFlipped.current = true;
  }, [
    searchParams,
    setSearchParams,
    stats.goldProducts.inStock,
    stats.silverProducts.inStock,
  ]);

  // Update URL params (only set non-default values)
  const setMetalFilter = (value: MetalFilter) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams);
      if (value !== "all") {
        params.set("metal", value);
      } else {
        params.delete("metal");
      }
      setSearchParams(params, { replace: true });
    });
  };

  const setSortOption = (value: SortOption) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams);
      if (value !== "spread-asc") {
        params.set("sort", value);
      } else {
        params.delete("sort");
      }
      setSearchParams(params, { replace: true });
    });
  };

  const setShowOutOfStock = (value: boolean) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams);
      if (value) {
        params.set("showOOS", "true");
      } else {
        params.delete("showOOS");
      }
      setSearchParams(params, { replace: true });
    });
  };

  // Combine and filter products
  let filteredProducts: ProductCardData[] = [];

  if (metalFilter === "all") {
    filteredProducts = [
      ...stats.goldProducts.bestSpread,
      ...stats.silverProducts.bestSpread,
    ];
  } else if (metalFilter === "gold") {
    filteredProducts = stats.goldProducts.bestSpread;
  } else {
    filteredProducts = stats.silverProducts.bestSpread;
  }

  // Filter out of stock if needed
  if (!showOutOfStock) {
    filteredProducts = filteredProducts.filter((p) => p.currentInStock);
  }

  // Sort products
  const products = [...filteredProducts];

  let sortedProducts: ProductCardData[];
  switch (sortOption) {
    case "last-in-stock": {
      sortedProducts = products.sort((a, b) => {
        // Sort by lastInStockAt descending (most recent first)
        // Products without lastInStockAt (still in stock or never OOS) go to end
        const aTime = a.lastInStockAt ?? -Infinity;
        const bTime = b.lastInStockAt ?? -Infinity;
        return bTime - aTime;
      });
      break;
    }
    case "price-asc": {
      sortedProducts = products.sort((a, b) => a.currentPrice - b.currentPrice);
      break;
    }
    case "price-desc": {
      sortedProducts = products.sort((a, b) => b.currentPrice - a.currentPrice);
      break;
    }
    case "spread-asc": {
      sortedProducts = products.sort((a, b) => {
        const aSpread = a.spreadPercentage ?? 999;
        const bSpread = b.spreadPercentage ?? 999;
        return aSpread - bSpread;
      });
      break;
    }
    case "spread-desc": {
      sortedProducts = products.sort((a, b) => {
        const aSpread = a.spreadPercentage ?? -999;
        const bSpread = b.spreadPercentage ?? -999;
        return bSpread - aSpread;
      });
      break;
    }
    default: {
      sortedProducts = products;
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      <main className="container mx-auto flex-1 px-4 py-6">
        <ErrorBoundary showDetails={import.meta.env.MODE === "development"}>
          <Stats
            collectPure={stats.collectPure}
            goldProducts={stats.goldProducts.bestSpread}
            lastFetch={stats.lastFetch}
            marketPrices={stats.marketPrices}
            silverProducts={stats.silverProducts.bestSpread}
            totalCashbackPercentage={totalCashbackPercentage}
          />
        </ErrorBoundary>

        {/* Filters & Calculator */}
        <Filters
          availableCards={availableCards}
          calculatorSettings={calculatorSettings}
          metalFilter={metalFilter}
          onOpenCardManager={() => {
            setCardManagerOpen(true);
          }}
          onOpenSettings={() => {
            setSettingsDrawerOpen(true);
          }}
          setCalculatorSettings={updateCalculatorSettings}
          setMetalFilter={setMetalFilter}
          setShowOutOfStock={setShowOutOfStock}
          setSortOption={setSortOption}
          showOutOfStock={showOutOfStock}
          sortOption={sortOption}
        />

        {/* Card Manager Drawer */}
        <CardManagerDrawer
          cards={availableCards}
          onCardsChange={handleCardsChange}
          onClose={() => {
            setCardManagerOpen(false);
          }}
          open={cardManagerOpen}
        />

        {/* Calculator Settings Drawer */}
        <CalculatorSettingsDrawer
          calculatorSettings={calculatorSettings}
          onOpenCardManager={() => {
            setCardManagerOpen(true);
          }}
          onOpenChange={setSettingsDrawerOpen}
          open={settingsDrawerOpen}
          setCalculatorSettings={updateCalculatorSettings}
        />

        {/* Product Grid */}
        {sortedProducts.length === 0 ?
          <div className="flex h-64 items-center justify-center rounded-lg border border-dashed">
            <div className="text-center">
              <p className="text-lg font-medium text-muted-foreground">
                No products found
              </p>
              <p className="text-sm text-muted-foreground">
                Try adjusting your filters
              </p>
            </div>
          </div>
        : <ErrorBoundary showDetails={import.meta.env.MODE === "development"}>
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
          </ErrorBoundary>
        }
      </main>

      <Footer />
    </div>
  );
};
