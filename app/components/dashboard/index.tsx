import type { api } from "convex/_generated/api";
import type { FunctionReturnType } from "convex/server";

import { useEffect, useRef, useState, useTransition } from "react";
import { useSearchParams } from "react-router";
import { useDebounceCallback } from "usehooks-ts";

import { CalculatorSettingsDrawer } from "@/components/calculator-settings-drawer";
import { CardManagerDrawer } from "@/components/card-manager-drawer";
import { ProductCard } from "@/components/product-card";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { useCalculatorSettings } from "@/hooks/use-calculator-settings";
import {
  filterProducts,
  shouldAutoFlipToOutOfStock,
  sortProducts,
} from "@/utils/product-filters";

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
    (searchParams.get("sort") as null | SortOption) ?? "profit-desc";
  const urlShowOutOfStock = searchParams.get("showOOS") === "true";

  // Local state for instant UI updates (synced with URL)
  const [showOutOfStock, setShowOutOfStockLocal] = useState(urlShowOutOfStock);

  // Sync local state with URL params (for browser back/forward)
  useEffect(() => {
    setShowOutOfStockLocal(urlShowOutOfStock);
  }, [urlShowOutOfStock]);

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

    // Check if auto-flip should be triggered
    const shouldAutoFlip = shouldAutoFlipToOutOfStock(
      stats.goldProducts.inStock,
      stats.silverProducts.inStock,
    );

    // If no in-stock products, auto-flip settings
    if (shouldAutoFlip) {
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
  // Debounced to prevent rapid URL updates during quick filter changes
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
    // Immediately update local state for instant UI feedback
    setShowOutOfStockLocal(value);

    // Then update URL params
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set("showOOS", "true");
    } else {
      params.delete("showOOS");
    }
    setSearchParams(params, { replace: true });
  };

  // Filter and sort products using extracted utilities
  const filteredProducts = filterProducts(
    stats.goldProducts.bestSpread,
    stats.silverProducts.bestSpread,
    { metalFilter, showOutOfStock },
  );

  const sortedProducts = sortProducts(filteredProducts, sortOption);

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
