import type { Doc } from "convex/_generated/dataModel";

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
  categoryTriggerOn: "in_stock" | "price_drop";
  categoryWeight: string;
  cooldownMinutes: number;
  enabled: boolean;
  formType: AlertFormType;
  name: string;
  profitThreshold: string;
  skuProductId: string;
  skuTriggerOn: "in_stock" | "price_drop";
}

export const defaultFormValues: AlertFormValues = {
  aboveSpotThreshold: "",
  brand: "",
  categoryMetal: "",
  categoryTriggerOn: "in_stock",
  categoryWeight: "",
  cooldownMinutes: 60,
  enabled: true,
  formType: "threshold",
  name: "",
  profitThreshold: "",
  skuProductId: "",
  skuTriggerOn: "in_stock",
};

export const alertFormValuesFromDoc = (alert: Doc<"alerts">): AlertFormValues => ({
  aboveSpotThreshold:
    alert.aboveSpotThreshold !== undefined ? String(alert.aboveSpotThreshold) : "",
  brand: alert.brand ?? "",
  categoryMetal: alert.metalType ?? "",
  categoryTriggerOn: alert.triggerOn === "price_drop" ? "price_drop" : "in_stock",
  categoryWeight: alert.weight !== undefined ? String(alert.weight) : "",
  cooldownMinutes: alert.cooldownMinutes,
  enabled: alert.enabled,
  formType: alert.type,
  name: alert.name,
  profitThreshold: alert.profitThreshold !== undefined ? String(alert.profitThreshold) : "",
  skuProductId: alert.productId ?? "",
  skuTriggerOn: alert.triggerOn === "price_drop" ? "price_drop" : "in_stock",
});

export const getFormValidationError = (values: AlertFormValues): boolean => {
  const categoryHasFilter =
    values.categoryMetal.length > 0 || values.categoryWeight.trim() || values.brand.trim();
  const thresholdHasFilter =
    values.aboveSpotThreshold.trim().length > 0 || values.profitThreshold.trim().length > 0;

  return (
    (values.formType === "category" && !categoryHasFilter) ||
    (values.formType === "sku" && !values.skuProductId) ||
    (values.formType === "threshold" && !thresholdHasFilter)
  );
};

export const buildAlertPayload = (values: AlertFormValues) => {
  let triggerOn: TriggerOn = "threshold_met";
  const payload: {
    aboveSpotThreshold?: number;
    brand?: string;
    cooldownMinutes: number;
    enabled: boolean;
    metalType?: "gold" | "silver";
    name: string;
    productId?: string;
    profitThreshold?: number;
    triggerOn: TriggerOn;
    type: AlertFormType;
    weight?: number;
  } = {
    cooldownMinutes: values.cooldownMinutes,
    enabled: values.enabled,
    name: values.name.trim(),
    triggerOn,
    type: values.formType,
  };

  if (values.formType === "sku") {
    triggerOn = values.skuTriggerOn;
    payload.productId = values.skuProductId;
    payload.triggerOn = triggerOn;
  }

  if (values.formType === "category") {
    triggerOn = values.categoryTriggerOn;
    payload.triggerOn = triggerOn;

    if (values.categoryMetal) {
      payload.metalType = values.categoryMetal;
    }

    const parsedWeight = Number.parseFloat(values.categoryWeight);
    if (values.categoryWeight.trim() && Number.isFinite(parsedWeight)) {
      payload.weight = parsedWeight;
    }

    const trimmedBrand = values.brand.trim();
    if (trimmedBrand) {
      payload.brand = trimmedBrand;
    }
  }

  if (values.formType === "threshold") {
    const parsedAboveSpot = Number.parseFloat(values.aboveSpotThreshold);
    const parsedProfit = Number.parseFloat(values.profitThreshold);

    if (values.aboveSpotThreshold.trim() && Number.isFinite(parsedAboveSpot)) {
      payload.aboveSpotThreshold = parsedAboveSpot;
    }

    if (values.profitThreshold.trim() && Number.isFinite(parsedProfit)) {
      payload.profitThreshold = parsedProfit;
    }
  }

  return payload;
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
