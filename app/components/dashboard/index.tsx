import type { api } from "convex/_generated/api";
import type { FunctionReturnType } from "convex/server";

import { useEffect, useState, useTransition } from "react";
import { useSearchParams } from "react-router";

import type { CalculatorSettings } from "@/components/calculator-settings";

import { CalculatorSettingsDrawer } from "@/components/calculator-settings-drawer";
import { CardManagerDrawer } from "@/components/card-manager-drawer";
import { ProductCard } from "@/components/product-card";
import {
  calculateCashbackPercentage,
  type CreditCard,
  loadCreditCards,
  saveCreditCards,
} from "@/lib/credit-cards";
import {
  loadPureFeeTier,
  PURE_FEE_TIERS,
  savePureFeeTier,
} from "@/lib/pure-fee-tiers";

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

  // Credit card management state
  const [availableCards, setAvailableCards] = useState<CreditCard[]>([]);
  const [cardManagerOpen, setCardManagerOpen] = useState(false);
  const [settingsDrawerOpen, setSettingsDrawerOpen] = useState(false);

  // Calculator settings state
  const [calculatorSettings, setCalculatorSettings] =
    useState<CalculatorSettings>({
      costcoMembershipEnabled: true,
      creditCard: {
        id: "loading",
        isCustomizable: false,
        isPreset: true,
        name: "Loading...",
        pointsPerDollar: 0,
        valuePerPoint: 0,
      },
      pureFeeTier: PURE_FEE_TIERS[0], // Default to Pure Copper
    });

  // Load cards and Pure fee tier from local storage on mount
  useEffect(() => {
    const stored = loadCreditCards();
    const savedTierId = loadPureFeeTier();
    const savedTier =
      PURE_FEE_TIERS.find((t) => t.id === savedTierId) ?? PURE_FEE_TIERS[0];

    setAvailableCards(stored.cards);
    setCalculatorSettings({
      costcoMembershipEnabled: true,
      creditCard:
        stored.cards.find((c) => c.id === stored.lastSelectedId) ??
        stored.cards[0],
      pureFeeTier: savedTier,
    });
  }, []);

  // Save selected card to local storage when changed
  useEffect(() => {
    if (
      availableCards.length > 0 &&
      calculatorSettings.creditCard.id !== "loading"
    ) {
      saveCreditCards({
        cards: availableCards,
        lastSelectedId: calculatorSettings.creditCard.id,
      });
    }
  }, [calculatorSettings.creditCard.id, availableCards]);

  // Save selected Pure fee tier to local storage when changed
  useEffect(() => {
    if (calculatorSettings.pureFeeTier) {
      savePureFeeTier(calculatorSettings.pureFeeTier.id);
    }
  }, [calculatorSettings.pureFeeTier]);

  // Handle card changes from manager
  const handleCardsChange = (newCards: CreditCard[]) => {
    setAvailableCards(newCards);
    // If current card was deleted, switch to first available
    if (!newCards.find((c) => c.id === calculatorSettings.creditCard.id)) {
      setCalculatorSettings({
        ...calculatorSettings,
        creditCard: newCards[0],
      });
    }
    saveCreditCards({
      cards: newCards,
      lastSelectedId: calculatorSettings.creditCard.id,
    });
  };

  // Derive filter state directly from URL params
  const metalFilter = (searchParams.get("metal") as MetalFilter) || "all";
  const sortOption = (searchParams.get("sort") as SortOption) || "spread-asc";
  const showOutOfStock = searchParams.get("showOOS") === "true";

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

  // Calculate total cashback percentage
  const totalCashbackPercentage =
    (calculatorSettings.costcoMembershipEnabled ? 2 : 0) +
    calculateCashbackPercentage(calculatorSettings.creditCard);

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
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      <main className="container mx-auto flex-1 px-4 py-6">
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
          availableCards={availableCards}
          calculatorSettings={calculatorSettings}
          metalFilter={metalFilter}
          onOpenCardManager={() => {
            setCardManagerOpen(true);
          }}
          onOpenSettings={() => {
            setSettingsDrawerOpen(true);
          }}
          setCalculatorSettings={setCalculatorSettings}
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
          setCalculatorSettings={setCalculatorSettings}
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

      <Footer />
    </div>
  );
};
