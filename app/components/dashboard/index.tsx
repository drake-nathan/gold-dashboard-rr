import type { api } from "convex/_generated/api";
import type { FunctionReturnType } from "convex/server";

import { useState } from "react";

import type { MetalFilter, SortOption } from "@/components/product-filters";

import {
  type CalculatorSettings,
  PRESET_CARDS,
} from "@/components/calculator-settings";
import { ProductCard } from "@/components/product-card";

import { Header } from "../header";
import { Filters } from "./filters";
import { Stats } from "./stats";

type GetStats = FunctionReturnType<typeof api.dashboard.getStats>;

export type ProductCardData = GetStats["goldProducts"]["bestSpread"][number];

interface DashboardProps {
  stats: GetStats;
}

export const Dashboard = ({ stats }: DashboardProps) => {
  // Calculator settings state
  const [calculatorSettings, setCalculatorSettings] =
    useState<CalculatorSettings>({
      costcoMembershipEnabled: true,
      creditCard: PRESET_CARDS[0], // Default to Freedom Unlimited
    });

  // Filter and sort state
  const [metalFilter, setMetalFilter] = useState<MetalFilter>("all");
  const [sortOption, setSortOption] = useState<SortOption>("spread-asc");
  const [showOutOfStock, setShowOutOfStock] = useState(true);

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
        : <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-4">
            {sortedProducts.map((product) => (
              <ProductCard
                key={product.productId}
                product={product}
                totalCashbackPercentage={totalCashbackPercentage}
              />
            ))}
          </div>
        }
      </main>
    </div>
  );
};
