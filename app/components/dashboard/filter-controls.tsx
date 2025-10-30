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
  metalFilter: MetalFilter;
  setMetalFilter: (value: MetalFilter) => void;
  setShowOutOfStock: (value: boolean) => void;
  setSortOption: (value: SortOption) => void;
  showOutOfStock: boolean;
  sortOption: SortOption;
}

export const FilterControls = ({
  metalFilter,
  setMetalFilter,
  setShowOutOfStock,
  setSortOption,
  showOutOfStock,
  sortOption,
}: FilterControlsProps) => {
  return (
    <>
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
            <SelectItem value="spread-desc">Spread (High to Low)</SelectItem>
            <SelectItem value="price-asc">Price (Low to High)</SelectItem>
            <SelectItem value="price-desc">Price (High to Low)</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </>
  );
};
