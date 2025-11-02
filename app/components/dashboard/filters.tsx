import { SlidersHorizontal } from "lucide-react";
import { useState } from "react";

import type { CalculatorSettings } from "@/components/calculator-settings";
import type { CreditCard } from "@/lib/credit-cards";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

import type { MetalFilter, SortOption } from "./filter-types";

import { CalculatorControls } from "./calculator-controls";
import { FilterControls } from "./filter-controls";

interface FiltersProps {
  availableCards: CreditCard[];
  calculatorSettings: CalculatorSettings;
  metalFilter: MetalFilter;
  onOpenCardManager: () => void;
  setCalculatorSettings: (value: CalculatorSettings) => void;
  setMetalFilter: (value: MetalFilter) => void;
  setShowOutOfStock: (value: boolean) => void;
  setSortOption: (value: SortOption) => void;
  showOutOfStock: boolean;
  sortOption: SortOption;
}

export const Filters = ({
  availableCards,
  calculatorSettings,
  metalFilter,
  onOpenCardManager,
  setCalculatorSettings,
  setMetalFilter,
  setShowOutOfStock,
  setSortOption,
  showOutOfStock,
  sortOption,
}: FiltersProps) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile: Filter Button */}
      <div className="mb-6 md:hidden">
        <Sheet onOpenChange={setOpen} open={open}>
          <SheetTrigger asChild>
            <Button className="w-full" variant="outline">
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              Filters & Calculator
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom">
            <SheetHeader>
              <SheetTitle>Filters & Calculator</SheetTitle>
              <SheetDescription>
                Adjust filters and calculator settings
              </SheetDescription>
            </SheetHeader>
            <div className="space-y-6 overflow-y-auto px-4 pb-4">
              <div className="space-y-4">
                <h3 className="font-medium">Filters</h3>
                <FilterControls
                  metalFilter={metalFilter}
                  setMetalFilter={setMetalFilter}
                  setShowOutOfStock={setShowOutOfStock}
                  setSortOption={setSortOption}
                  showOutOfStock={showOutOfStock}
                  sortOption={sortOption}
                />
              </div>
              <div className="space-y-4">
                <h3 className="font-medium">Calculator</h3>
                <CalculatorControls
                  availableCards={availableCards}
                  calculatorSettings={calculatorSettings}
                  onOpenCardManager={onOpenCardManager}
                  setCalculatorSettings={setCalculatorSettings}
                />
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop: Inline Filters */}
      <div className="mb-6 hidden rounded-xl border bg-card p-4 md:block">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Left Side - Filters */}
          <div className="flex flex-wrap items-center gap-4">
            <FilterControls
              metalFilter={metalFilter}
              setMetalFilter={setMetalFilter}
              setShowOutOfStock={setShowOutOfStock}
              setSortOption={setSortOption}
              showOutOfStock={showOutOfStock}
              sortOption={sortOption}
            />
          </div>

          {/* Right Side - Calculator */}
          <div className="flex flex-wrap items-center gap-4">
            <CalculatorControls
              availableCards={availableCards}
              calculatorSettings={calculatorSettings}
              onOpenCardManager={onOpenCardManager}
              setCalculatorSettings={setCalculatorSettings}
            />
          </div>
        </div>
      </div>
    </>
  );
};
