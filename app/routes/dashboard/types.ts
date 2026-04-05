import type { api } from "convex/_generated/api";
import type { FunctionReturnType } from "convex/server";

type DashboardSummary = FunctionReturnType<typeof api.dashboard.getDashboardSummary>;
type DashboardProducts = FunctionReturnType<typeof api.dashboard.getDashboardProducts>;

export interface DashboardStats extends DashboardSummary {
  goldProducts: DashboardSummary["goldProducts"] & {
    productsByPureSpread: DashboardProducts["goldProducts"];
  };
  silverProducts: DashboardSummary["silverProducts"] & {
    productsByPureSpread: DashboardProducts["silverProducts"];
  };
}

export type DashboardMarketPrice = DashboardSummary["marketPrices"][number];
export type ProductCardData = DashboardProducts["goldProducts"][number];
