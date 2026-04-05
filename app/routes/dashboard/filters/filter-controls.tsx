import { usePostHog } from "posthog-js/react";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

import type { MetalFilter, SortOption } from "./filter-types";

interface FilterControlsProps {
  isMobile?: boolean;
  metalFilter: MetalFilter;
  setMetalFilter: (value: MetalFilter) => void;
  setShowOutOfStock: (value: boolean) => void;
  setSortOption: (value: SortOption) => void;
  showOutOfStock: boolean;
  sortOption: SortOption;
}

export const FilterControls = ({
  isMobile = false,
  metalFilter,
  setMetalFilter,
  setShowOutOfStock,
  setSortOption,
  showOutOfStock,
  sortOption,
}: FilterControlsProps) => {
  const posthog = usePostHog();
  const containerClass = isMobile ? "flex flex-col gap-3" : "contents";
  const surface = isMobile ? "mobile" : "desktop";

  return (
    <div className={containerClass}>
      <div className={isMobile ? "flex items-center justify-between" : "flex items-center gap-2"}>
        <Label className={isMobile ? "text-sm" : ""} htmlFor="show-oos">
          Show Out of Stock
        </Label>
        <Switch
          checked={showOutOfStock}
          id="show-oos"
          onCheckedChange={(checked) => {
            setShowOutOfStock(checked);
            posthog.capture("filter_changed", {
              filter_name: "show_out_of_stock",
              next_value: checked,
              previous_value: showOutOfStock,
              surface,
            });
          }}
        />
      </div>

      <div className={isMobile ? "space-y-2" : "flex items-center gap-2"}>
        <Label className={isMobile ? "text-sm" : ""} htmlFor="metal-filter">
          Metal Type:
        </Label>
        <Select
          items={{ all: "All", gold: "Gold", silver: "Silver" }}
          onValueChange={(value) => {
            if (!value) return;

            setMetalFilter(value as MetalFilter);
            posthog.capture("filter_changed", {
              filter_name: "metal",
              next_value: value,
              previous_value: metalFilter,
              surface,
            });
          }}
          value={metalFilter}
        >
          <SelectTrigger className={isMobile ? "w-full" : "min-w-20"} id="metal-filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="gold">Gold</SelectItem>
            <SelectItem value="silver">Silver</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className={isMobile ? "space-y-2" : "flex items-center gap-2"}>
        <Label className={isMobile ? "text-sm" : ""} htmlFor="sort">
          Sort By:
        </Label>
        <Select
          items={{
            "last-in-stock": "Last Out of Stock",
            "price-asc": "Price (Low to High)",
            "price-desc": "Price (High to Low)",
            "profit-asc": "Profit (Low to High)",
            "profit-desc": "Profit (High to Low)",
          }}
          onValueChange={(value) => {
            if (!value) return;

            setSortOption(value as SortOption);
            posthog.capture("filter_changed", {
              filter_name: "sort",
              next_value: value,
              previous_value: sortOption,
              surface,
            });
          }}
          value={sortOption}
        >
          <SelectTrigger className={isMobile ? "w-full" : "min-w-52"} id="sort">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="profit-desc">Profit (High to Low)</SelectItem>
            <SelectItem value="profit-asc">Profit (Low to High)</SelectItem>
            <SelectItem value="price-asc">Price (Low to High)</SelectItem>
            <SelectItem value="price-desc">Price (High to Low)</SelectItem>
            <SelectItem value="last-in-stock">Last Out of Stock</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};
