import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Switch } from "~/components/ui/switch";

export type MetalFilter = "all" | "gold" | "silver";
export type SortOption =
  | "price-asc"
  | "price-desc"
  | "spread-asc"
  | "spread-desc";

interface ProductFiltersProps {
  metalFilter: MetalFilter;
  onMetalFilterChange: (filter: MetalFilter) => void;
  onShowOutOfStockChange: (show: boolean) => void;
  onSortChange: (sort: SortOption) => void;
  showOutOfStock: boolean;
  sortOption: SortOption;
}

export const ProductFilters = ({
  metalFilter,
  onMetalFilterChange,
  onShowOutOfStockChange,
  onSortChange,
  showOutOfStock,
  sortOption,
}: ProductFiltersProps) => {
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-lg border bg-card p-4">
      <div className="flex items-center gap-2">
        <Label className="text-sm font-medium" htmlFor="show-oos">
          Show Out of Stock
        </Label>
        <Switch
          checked={showOutOfStock}
          id="show-oos"
          onCheckedChange={onShowOutOfStockChange}
        />
      </div>

      <div className="flex items-center gap-2">
        <Label className="text-sm font-medium" htmlFor="metal-filter">
          Metal Type:
        </Label>
        <Select
          onValueChange={(value: string) =>
            { onMetalFilterChange(value as MetalFilter); }
          }
          value={metalFilter}
        >
          <SelectTrigger className="w-[120px]" id="metal-filter">
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
        <Label className="text-sm font-medium" htmlFor="sort">
          Sort By:
        </Label>
        <Select
          onValueChange={(value: string) => { onSortChange(value as SortOption); }}
          value={sortOption}
        >
          <SelectTrigger className="w-[200px]" id="sort">
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
    </div>
  );
};
