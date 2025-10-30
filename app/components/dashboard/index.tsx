import type { api } from "convex/_generated/api";
import type { FunctionReturnType } from "convex/server";

import { useState } from "react";
import { useSearchParams } from "react-router";

import {
  type CalculatorSettings,
  PRESET_CARDS,
} from "@/components/calculator-settings";
import { ProductCard } from "@/components/product-card";

import type { MetalFilter, SortOption } from "./filter-types";

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

  // Calculator settings state (not in URL - will be persisted to user settings later)
  const [calculatorSettings, setCalculatorSettings] =
    useState<CalculatorSettings>({
      costcoMembershipEnabled: true,
      creditCard: PRESET_CARDS[0], // Default to Freedom Unlimited
    });

  // Derive filter state directly from URL params
  const metalFilter = (searchParams.get("metal") as MetalFilter) || "all";
  const sortOption = (searchParams.get("sort") as SortOption) || "spread-asc";
  const showOutOfStock = searchParams.get("showOOS") === "true";

  // Update URL params (only set non-default values)
  const setMetalFilter = (value: MetalFilter) => {
    const params = new URLSearchParams(searchParams);
    if (value !== "all") {
      params.set("metal", value);
    } else {
      params.delete("metal");
    }
    setSearchParams(params, { replace: true });
  };

  const setSortOption = (value: SortOption) => {
    const params = new URLSearchParams(searchParams);
    if (value !== "spread-asc") {
      params.set("sort", value);
    } else {
      params.delete("sort");
    }
    setSearchParams(params, { replace: true });
  };

  const setShowOutOfStock = (value: boolean) => {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set("showOOS", "true");
    } else {
      params.delete("showOOS");
    }
    setSearchParams(params, { replace: true });
  };

  // Calculate total cashback percentage
  const totalCashbackPercentage =
    (calculatorSettings.costcoMembershipEnabled ? 2 : 0) +
    calculatorSettings.creditCard.cashbackPercentage;

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
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-6">
        <Stats
          collectPure={stats.collectPure}
          goldProducts={stats.goldProducts.bestSpread}
          lastFetch={stats.lastFetch}
          marketPrices={stats.marketPrices}
          silverProducts={stats.silverProducts.bestSpread}
          totalCashbackPercentage={totalCashbackPercentage}
        />

        {/* Filters & Calculator */}
        <Filters
          calculatorSettings={calculatorSettings}
          metalFilter={metalFilter}
          setCalculatorSettings={setCalculatorSettings}
          setMetalFilter={setMetalFilter}
          setShowOutOfStock={setShowOutOfStock}
          setSortOption={setSortOption}
          showOutOfStock={showOutOfStock}
          sortOption={sortOption}
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
        : <div className="grid grid-cols-1 gap-4 sm:grid-cols-[repeat(auto-fill,minmax(350px,1fr))]">
            {sortedProducts.map((product) => (
              <ProductCard
                calculatorSettings={calculatorSettings}
                key={product.productId}
                marketPrices={stats.marketPrices}
                product={product}
              />
            ))}
          </div>
        }
      </main>
    </div>
  );
};
