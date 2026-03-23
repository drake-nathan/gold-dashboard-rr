import { useEffect, useRef, useState, useTransition } from "react";
import { useSearchParams } from "react-router";
import { useDebounceCallback } from "usehooks-ts";

import type { MetalFilter, SortOption } from "../filters/filter-types";
import { shouldAutoFlipToOutOfStock } from "../filters/product-filters";
import type { DashboardStats } from "../types";

interface UseDashboardFiltersResult {
  metalFilter: MetalFilter;
  setMetalFilter: (value: MetalFilter) => void;
  setShowOutOfStock: (value: boolean) => void;
  setSortOption: (value: SortOption) => void;
  showOutOfStock: boolean;
  sortOption: SortOption;
}

export const useDashboardFilters = (stats: DashboardStats): UseDashboardFiltersResult => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [_, startTransition] = useTransition();
  const hasAutoFlipped = useRef(false);

  const metalFilter = (searchParams.get("metal") as MetalFilter | null) ?? "all";
  const sortOption = (searchParams.get("sort") as null | SortOption) ?? "profit-desc";
  const urlShowOutOfStock = searchParams.get("showOOS") === "true";
  const [showOutOfStock, setShowOutOfStockLocal] = useState(urlShowOutOfStock);

  useEffect(() => {
    setShowOutOfStockLocal(urlShowOutOfStock);
  }, [urlShowOutOfStock]);

  useEffect(() => {
    if (hasAutoFlipped.current) return;

    const hasFilterParams =
      searchParams.has("metal") || searchParams.has("sort") || searchParams.has("showOOS");

    if (hasFilterParams) {
      hasAutoFlipped.current = true;
      return;
    }

    const shouldAutoFlip = shouldAutoFlipToOutOfStock(
      stats.goldProducts.inStock,
      stats.silverProducts.inStock,
    );

    if (shouldAutoFlip) {
      startTransition(() => {
        const params = new URLSearchParams();
        params.set("showOOS", "true");
        params.set("sort", "last-in-stock");
        setSearchParams(params, { replace: true });
      });
    }

    hasAutoFlipped.current = true;
  }, [
    searchParams,
    setSearchParams,
    startTransition,
    stats.goldProducts.inStock,
    stats.silverProducts.inStock,
  ]);

  const setMetalFilter = useDebounceCallback((value: MetalFilter) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams);
      if (value !== "all") {
        params.set("metal", value);
      } else {
        params.delete("metal");
      }
      setSearchParams(params, { replace: true });
    });
  }, 150);

  const setSortOption = useDebounceCallback((value: SortOption) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams);
      if (value !== "profit-desc") {
        params.set("sort", value);
      } else {
        params.delete("sort");
      }
      setSearchParams(params, { replace: true });
    });
  }, 150);

  const setShowOutOfStock = (value: boolean) => {
    setShowOutOfStockLocal(value);

    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set("showOOS", "true");
    } else {
      params.delete("showOOS");
    }
    setSearchParams(params, { replace: true });
  };

  return {
    metalFilter,
    setMetalFilter,
    setShowOutOfStock,
    setSortOption,
    showOutOfStock,
    sortOption,
  };
};
