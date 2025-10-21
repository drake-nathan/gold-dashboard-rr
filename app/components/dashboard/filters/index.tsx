import type { MetalFilter, SortOption } from "@/components/product-filters";

import {
  type CalculatorSettings,
  PRESET_CARDS,
} from "@/components/calculator-settings";
import { Switch } from "@/components/ui/switch";

interface FiltersProps {
  calculatorSettings: CalculatorSettings;
  metalFilter: MetalFilter;
  setCalculatorSettings: (value: CalculatorSettings) => void;
  setMetalFilter: (value: MetalFilter) => void;
  setShowOutOfStock: (value: boolean) => void;
  setSortOption: (value: SortOption) => void;
  showOutOfStock: boolean;
  sortOption: SortOption;
}

export const Filters = ({
  calculatorSettings,
  metalFilter,
  setCalculatorSettings,
  setMetalFilter,
  setShowOutOfStock,
  setSortOption,
  showOutOfStock,
  sortOption,
}: FiltersProps) => {
  return (
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
                const card = PRESET_CARDS.find((c) => c.id === e.target.value);
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
  );
};
