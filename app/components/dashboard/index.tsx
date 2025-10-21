import type { api } from "convex/_generated/api";
import type { FunctionReturnType } from "convex/server";

import { useMemo, useState } from "react";

import type { MetalFilter, SortOption } from "@/components/product-filters";

import {
  type CalculatorSettings,
  PRESET_CARDS,
} from "@/components/calculator-settings";
import { ProductCard } from "@/components/product-card";
import { Switch } from "@/components/ui/switch";

import { Header } from "../header";
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
  const [showOutOfStock, setShowOutOfStock] = useState(false);

  // Calculate total cashback percentage
  const totalCashbackPercentage =
    (calculatorSettings.costcoMembershipEnabled ? 2 : 0) +
    calculatorSettings.creditCard.cashbackPercentage;

  // Combine and filter products
  const filteredProducts = useMemo(() => {
    let products: ProductCardData[] = [];

    if (metalFilter === "all") {
      products = [
        ...stats.goldProducts.bestSpread,
        ...stats.silverProducts.bestSpread,
      ];
    } else if (metalFilter === "gold") {
      products = stats.goldProducts.bestSpread;
    } else {
      products = stats.silverProducts.bestSpread;
    }

    // Filter out of stock if needed
    if (!showOutOfStock) {
      products = products.filter((p) => p.currentInStock);
    }

    return products;
  }, [
    metalFilter,
    stats.goldProducts.bestSpread,
    stats.silverProducts.bestSpread,
    showOutOfStock,
  ]);

  // Sort products
  const sortedProducts = useMemo(() => {
    const products = [...filteredProducts];

    switch (sortOption) {
      case "price-asc": {
        return products.sort((a, b) => a.currentPrice - b.currentPrice);
      }
      case "price-desc": {
        return products.sort((a, b) => b.currentPrice - a.currentPrice);
      }
      case "spread-asc": {
        return products.sort((a, b) => {
          const aSpread = a.spreadPercentage ?? 999;
          const bSpread = b.spreadPercentage ?? 999;
          return aSpread - bSpread;
        });
      }
      case "spread-desc": {
        return products.sort((a, b) => {
          const aSpread = a.spreadPercentage ?? -999;
          const bSpread = b.spreadPercentage ?? -999;
          return bSpread - aSpread;
        });
      }
      default: {
        return products;
      }
    }
  }, [filteredProducts, sortOption]);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-6">
        <Stats
          collectPure={stats.collectPure}
          goldProducts={stats.goldProducts.bestSpread}
          lastFetch={stats.lastFetch}
          silverProducts={stats.silverProducts.bestSpread}
          totalCashbackPercentage={totalCashbackPercentage}
        />

        {/* Filters & Calculator */}
        <div className="mb-6 rounded-lg border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Left Side - Filters */}
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium" htmlFor="show-oos">
                  Show Out of Stock
                </label>
                <Switch
                  checked={showOutOfStock}
                  id="show-oos"
                  onCheckedChange={setShowOutOfStock}
                />
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm font-medium" htmlFor="metal-filter">
                  Metal Type:
                </label>
                <select
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                  id="metal-filter"
                  onChange={(e) => {
                    setMetalFilter(e.target.value as MetalFilter);
                  }}
                  value={metalFilter}
                >
                  <option value="all">All</option>
                  <option value="gold">Gold</option>
                  <option value="silver">Silver</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm font-medium" htmlFor="sort">
                  Sort By:
                </label>
                <select
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                  id="sort"
                  onChange={(e) => {
                    setSortOption(e.target.value as SortOption);
                  }}
                  value={sortOption}
                >
                  <option value="spread-asc">Spread (Low to High)</option>
                  <option value="spread-desc">Spread (High to Low)</option>
                  <option value="price-asc">Price (Low to High)</option>
                  <option value="price-desc">Price (High to Low)</option>
                </select>
              </div>
            </div>

            {/* Right Side - Calculator */}
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium" htmlFor="costco-exec">
                  Costco Executive (2%):
                </label>
                <Switch
                  checked={calculatorSettings.costcoMembershipEnabled}
                  id="costco-exec"
                  onCheckedChange={(checked) => {
                    setCalculatorSettings({
                      ...calculatorSettings,
                      costcoMembershipEnabled: checked,
                    });
                  }}
                />
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm font-medium" htmlFor="credit-card">
                  Credit Card:
                </label>
                <select
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                  id="credit-card"
                  onChange={(e) => {
                    const card = PRESET_CARDS.find(
                      (c) => c.id === e.target.value,
                    );
                    if (card) {
                      setCalculatorSettings({
                        ...calculatorSettings,
                        creditCard: card,
                      });
                    }
                  }}
                  value={calculatorSettings.creditCard.id}
                >
                  {PRESET_CARDS.filter((c) => c.id !== "custom").map((card) => (
                    <option key={card.id} value={card.id}>
                      {card.name} ({card.cashbackPercentage.toFixed(2)}%)
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

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
        : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
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
