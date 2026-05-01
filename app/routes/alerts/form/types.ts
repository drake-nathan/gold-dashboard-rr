import type { Doc } from "convex/_generated/dataModel";

import {
  type CategoryWeightGroup,
  formatStoredCategoryWeightGroup,
  inferCategoryWeightGroup,
  type StoredCategoryWeightGroup,
} from "../weight-groups";

// Mirrors convex/alerts/core.ts (AlertType, TriggerOn) — keep in sync.
export type AlertFormType = "category" | "sku" | "threshold";
export type TriggerOn = "in_stock" | "price_drop" | "threshold_met";

export interface ProductOption {
  metalType: string;
  name: string;
  productId: string;
}

export interface AlertFormValues {
  aboveSpotThreshold: string;
  brand: string;
  categoryMetal: "" | "gold" | "silver";
  categoryWeightGroup: CategoryWeightGroup;
  cooldownMinutes: number;
  enabled: boolean;
  formType: AlertFormType;
  name: string;
  skuProductId: string;
  skuTriggerOn: "in_stock";
  thresholdMetal: "" | "gold" | "silver";
}

export const defaultFormValues: AlertFormValues = {
  aboveSpotThreshold: "3",
  brand: "",
  categoryMetal: "gold",
  categoryWeightGroup: "any",
  cooldownMinutes: 60,
  enabled: true,
  formType: "threshold",
  name: "",
  skuProductId: "",
  skuTriggerOn: "in_stock",
  thresholdMetal: "",
};

export const alertFormValuesFromDoc = (alert: Doc<"alerts">): AlertFormValues => ({
  aboveSpotThreshold:
    alert.aboveSpotThreshold !== undefined ? String(alert.aboveSpotThreshold) : "",
  brand: alert.brand ?? "",
  categoryMetal: alert.type === "category" ? (alert.metalType ?? "") : "",
  categoryWeightGroup: inferCategoryWeightGroup({
    weight: alert.weight,
    weightGroup: alert.weightGroup,
  }),
  cooldownMinutes: alert.cooldownMinutes,
  enabled: alert.enabled,
  formType: alert.type,
  name: alert.name,
  skuProductId: alert.productId ?? "",
  skuTriggerOn: "in_stock",
  thresholdMetal: alert.type === "threshold" ? (alert.metalType ?? "") : "",
});

export const getFormValidationError = (values: AlertFormValues): boolean => {
  return (
    (values.formType === "sku" && !values.skuProductId) ||
    (values.formType === "threshold" && !values.aboveSpotThreshold.trim())
  );
};

export const getValidationErrorMessage = (values: AlertFormValues): null | string => {
  if (values.formType === "threshold" && !values.aboveSpotThreshold.trim()) {
    return "Enter a max markup percentage";
  }
  if (values.formType === "sku" && !values.skuProductId) {
    return "Please select a product";
  }
  return null;
};

export const buildAlertPayload = (values: AlertFormValues, productOptions?: ProductOption[]) => {
  let triggerOn: TriggerOn = "threshold_met";
  const name = values.name.trim() || generateAlertName(values, productOptions);
  // Explicit null on clearable fields tells the Convex update mutation to clear
  // them; undefined would mean "leave existing value alone" after the merge fix.
  const payload: {
    aboveSpotThreshold?: null | number;
    brand?: null | string;
    cooldownMinutes: number;
    enabled: boolean;
    metalType?: "gold" | "silver" | null;
    name: string;
    productId?: null | string;
    triggerOn: TriggerOn;
    type: AlertFormType;
    weightGroup?: null | StoredCategoryWeightGroup;
  } = {
    cooldownMinutes: values.cooldownMinutes,
    enabled: values.enabled,
    name,
    triggerOn,
    type: values.formType,
  };

  if (values.formType === "sku") {
    triggerOn = "in_stock";
    payload.productId = values.skuProductId;
    payload.triggerOn = triggerOn;
  }

  if (values.formType === "category") {
    triggerOn = "in_stock";
    payload.triggerOn = triggerOn;
    payload.metalType = values.categoryMetal || null;
    payload.weightGroup = values.categoryWeightGroup === "any" ? null : values.categoryWeightGroup;
    const trimmedBrand = values.brand.trim();
    payload.brand = trimmedBrand || null;
  }

  if (values.formType === "threshold") {
    const parsedAboveSpot = Number.parseFloat(values.aboveSpotThreshold);
    payload.aboveSpotThreshold =
      values.aboveSpotThreshold.trim() && Number.isFinite(parsedAboveSpot) ? parsedAboveSpot : null;
    payload.metalType = values.thresholdMetal || null;
  }

  return payload;
};

export const generateAlertName = (
  values: AlertFormValues,
  productOptions?: ProductOption[],
): string => {
  if (values.formType === "threshold") {
    const pct = values.aboveSpotThreshold.trim();
    const metal = values.thresholdMetal
      ? values.thresholdMetal.charAt(0).toUpperCase() + values.thresholdMetal.slice(1)
      : "";
    const base = pct ? `Markup \u2264 ${pct}%` : "Markup alert";
    return metal ? `${metal} ${base.toLowerCase()}` : base;
  }

  if (values.formType === "sku") {
    const product = productOptions?.find((p) => p.productId === values.skuProductId);
    const label = product?.name ?? "Product";
    return `${label} restock`;
  }

  // category
  const parts: string[] = [];
  if (values.categoryMetal) {
    parts.push(values.categoryMetal.charAt(0).toUpperCase() + values.categoryMetal.slice(1));
  }
  if (values.brand.trim()) parts.push(values.brand.trim());
  if (values.categoryWeightGroup !== "any") {
    parts.push(formatStoredCategoryWeightGroup(values.categoryWeightGroup));
  }
  return parts.length > 0 ? `${parts.join(" ")} restock` : "Category restock";
};

export const ALERT_TYPE_LABELS: Record<string, string> = {
  category: "Category",
  sku: "Product",
  threshold: "Threshold",
};

export const TRIGGER_LABELS: Record<string, string> = {
  in_stock: "Back in stock",
  price_drop: "Price drop",
  threshold_met: "Threshold met",
};
