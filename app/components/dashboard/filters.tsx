import type { MetalFilter, SortOption } from "@/components/product-filters";

import {
  type CalculatorSettings,
  PRESET_CARDS,
} from "@/components/calculator-settings";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
    <div className="mb-6 rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Left Side - Filters */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="show-oos">Show Out of Stock</Label>
            <Switch
              checked={showOutOfStock}
              id="show-oos"
              onCheckedChange={setShowOutOfStock}
            />
          </div>

          <div className="flex items-center gap-2">
            <Label htmlFor="metal-filter">Metal Type:</Label>
            <Select
              onValueChange={(value) => {
                setMetalFilter(value as MetalFilter);
              }}
              value={metalFilter}
            >
              <SelectTrigger className="min-w-20" id="metal-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="gold">Gold</SelectItem>
                <SelectItem value="silver">Silver</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Label htmlFor="sort">Sort By:</Label>
            <Select
              onValueChange={(value) => {
                setSortOption(value as SortOption);
              }}
              value={sortOption}
            >
              <SelectTrigger className="min-w-52" id="sort">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="spread-asc">Spread (Low to High)</SelectItem>
                <SelectItem value="spread-desc">
                  Spread (High to Low)
                </SelectItem>
                <SelectItem value="price-asc">Price (Low to High)</SelectItem>
                <SelectItem value="price-desc">Price (High to Low)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Right Side - Calculator */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="costco-exec">Costco Executive (2%):</Label>
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
            <Label htmlFor="credit-card">Credit Card:</Label>
            <Select
              onValueChange={(value) => {
                const card = PRESET_CARDS.find((c) => c.id === value);
                if (card) {
                  setCalculatorSettings({
                    ...calculatorSettings,
                    creditCard: card,
                  });
                }
              }}
              value={calculatorSettings.creditCard.id}
            >
              <SelectTrigger className="min-w-80" id="credit-card">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRESET_CARDS.filter((c) => c.id !== "custom").map((card) => (
                  <SelectItem key={card.id} value={card.id}>
                    {card.name} ({card.cashbackPercentage.toFixed(2)}%)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
};
