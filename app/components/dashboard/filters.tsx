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
  onOpenSettings: () => void;
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
  onOpenSettings,
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
              <SlidersHorizontal className="size-4" />
              Filters & Calculator
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[85vh]">
            <SheetHeader>
              <SheetTitle>Filters & Calculator</SheetTitle>
              <SheetDescription>
                Adjust filters and calculator settings
              </SheetDescription>
            </SheetHeader>
            <div className="mt-4 max-h-[calc(85vh-8rem)] space-y-6 overflow-y-auto px-4 pb-4">
              <div className="space-y-3">
                <h3 className="text-sm font-semibold">Filters</h3>
                <div className="space-y-3">
                  <FilterControls
                    isMobile={true}
                    metalFilter={metalFilter}
                    setMetalFilter={setMetalFilter}
                    setShowOutOfStock={setShowOutOfStock}
                    setSortOption={setSortOption}
                    showOutOfStock={showOutOfStock}
                    sortOption={sortOption}
                  />
                </div>
              </div>
              <div className="space-y-3">
                <h3 className="text-sm font-semibold">Calculator</h3>
                <div className="space-y-3">
                  <CalculatorControls
                    availableCards={availableCards}
                    calculatorSettings={calculatorSettings}
                    isMobile={true}
                    onOpenCardManager={onOpenCardManager}
                    onOpenSettings={onOpenSettings}
                    setCalculatorSettings={setCalculatorSettings}
                  />
                </div>
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
              onOpenSettings={onOpenSettings}
              setCalculatorSettings={setCalculatorSettings}
            />
          </div>
        </div>
      </div>
    </>
  );
};
