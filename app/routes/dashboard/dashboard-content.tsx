import { useState } from "react";
import { useIsClient } from "usehooks-ts";

import { FeatureAnnouncementModal } from "@/components/feature-announcement-modal";
import { ErrorBoundary as UIErrorBoundary } from "@/components/ui/error-boundary";

import { CalculatorSettingsDrawer } from "./calculator/calculator-settings-drawer";
import { CardManagerDrawer } from "./cards/card-manager-drawer";
import { Filters } from "./filters/filters";
import { filterProducts, sortProducts } from "./filters/product-filters";
import { useCalculatorSettings } from "./hooks/use-calculator-settings";
import { useDashboardFilters } from "./hooks/use-dashboard-filters";
import { useMigrationToast } from "./hooks/use-migration-toast";
import { ProductCard } from "./products/product-card";
import { Stats } from "./stats/stats";
import type { DashboardStats } from "./types";

interface DashboardContentProps {
  stats: DashboardStats;
}

export const DashboardContent = ({ stats }: DashboardContentProps) => {
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
  const {
    metalFilter,
    setMetalFilter,
    setShowOutOfStock,
    setSortOption,
    showOutOfStock,
    sortOption,
  } = useDashboardFilters(stats);

  const [cardManagerOpen, setCardManagerOpen] = useState(false);
  const [settingsDrawerOpen, setSettingsDrawerOpen] = useState(false);

  useMigrationToast(isMigrating);

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
