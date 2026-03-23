import type { api } from "convex/_generated/api";
import type { FunctionReturnType } from "convex/server";

export type AdminProductReviewCounts = FunctionReturnType<
  typeof api.admin.getProductsForReviewCounts
>;
export type AdminProductsForReviewStatus = FunctionReturnType<
  typeof api.admin.getProductsForReviewStatus
>;
export type ReviewTab =
  | "action_needed"
  | "auto_matched"
  | "fallback"
  | "manual_matched"
  | "unmatched";

export interface PureProductLookupResult {
  currentBidPrice: null | number;
  manufacturer: null | string;
  metalType: "gold" | "silver";
  productName: string;
  pureProductId: string;
  sku: string;
  weight: number;
}
