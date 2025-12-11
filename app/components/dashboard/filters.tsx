import { SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import { useIsClient, useMediaQuery } from "usehooks-ts";

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
import { Skeleton } from "@/components/ui/skeleton";

import type { MetalFilter, SortOption } from "./filter-types";

import { CalculatorControls } from "./calculator-controls";
import { FilterControls } from "./filter-controls";

/** Skeleton placeholder for calculator controls during SSR */
const CalculatorControlsSkeleton = () => (
  <div className="flex items-center gap-4">
    <Skeleton className="h-9 w-80" />
  </div>
);

interface FiltersProps {
  availableCards: CreditCard[];
  calculatorSettings: CalculatorSettings;
  /** Whether we're on the client (for localStorage-dependent calculator controls) */
  isClientReady: boolean;
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
  isClientReady,
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
  const isClient = useIsClient();

  // Match Tailwind's lg breakpoint (1024px) - switch to mobile earlier to prevent cramped layout
  const mediaQueryResult = useMediaQuery("(min-width: 1024px)");

  // Only use media query result after client hydration to prevent SSR mismatch
  const isDesktop = isClient ? mediaQueryResult : true; // Default to desktop during SSR

  // Mobile view: Sheet with button
  if (!isDesktop) {
    return (
      <div className="mb-6">
        <Sheet onOpenChange={setOpen} open={open}>
          <SheetTrigger asChild>
            <Button className="w-full" variant="outline">
              <SlidersHorizontal className="size-4" />
              Filters & Calculator
            </Button>
          </SheetTrigger>
          <SheetContent className="max-h-[85vh]" side="bottom">
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
                    isMobile
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
                  {isClientReady ?
                    <CalculatorControls
                      availableCards={availableCards}
                      calculatorSettings={calculatorSettings}
                      isMobile
                      onOpenCardManager={onOpenCardManager}
                      onOpenSettings={onOpenSettings}
                      setCalculatorSettings={setCalculatorSettings}
                    />
                  : <CalculatorControlsSkeleton />}
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    );
  }

  // Desktop view: Inline filters
  return (
    <div className="mb-6 rounded-xl border bg-card p-4">
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

        {/* Right Side - Calculator (skeleton during SSR, real controls on client) */}
        <div className="flex flex-wrap items-center gap-4">
          {isClientReady ?
            <CalculatorControls
              availableCards={availableCards}
              calculatorSettings={calculatorSettings}
              onOpenCardManager={onOpenCardManager}
              onOpenSettings={onOpenSettings}
              setCalculatorSettings={setCalculatorSettings}
            />
          : <CalculatorControlsSkeleton />}
        </div>
      </div>
    </div>
  );
};
