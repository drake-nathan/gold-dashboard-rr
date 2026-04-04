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
  skuProductId: string;
  skuTriggerOn: "in_stock" | "price_drop";
}

export const defaultFormValues: AlertFormValues = {
  aboveSpotThreshold: "3",
  brand: "",
  categoryMetal: "",
  categoryTriggerOn: "in_stock",
  categoryWeight: "",
  cooldownMinutes: 60,
  enabled: true,
  formType: "threshold",
  name: "",
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
  skuProductId: alert.productId ?? "",
  skuTriggerOn: alert.triggerOn === "price_drop" ? "price_drop" : "in_stock",
});

export const getFormValidationError = (values: AlertFormValues): boolean => {
  const categoryHasFilter =
    values.categoryMetal.length > 0 || values.categoryWeight.trim() || values.brand.trim();

  return (
    (values.formType === "category" && !categoryHasFilter) ||
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
  if (values.formType === "category") {
    const hasFilter =
      values.categoryMetal.length > 0 || values.categoryWeight.trim() || values.brand.trim();
    if (!hasFilter) return "Select at least one category filter (metal, weight, or brand)";
  }
  return null;
};

export const buildAlertPayload = (values: AlertFormValues, productOptions?: ProductOption[]) => {
  let triggerOn: TriggerOn = "threshold_met";
  const name = values.name.trim() || generateAlertName(values, productOptions);
  const payload: {
    aboveSpotThreshold?: number;
    brand?: string;
    cooldownMinutes: number;
    enabled: boolean;
    metalType?: "gold" | "silver";
    name: string;
    productId?: string;
    triggerOn: TriggerOn;
    type: AlertFormType;
    weight?: number;
  } = {
    cooldownMinutes: values.cooldownMinutes,
    enabled: values.enabled,
    name,
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

    if (values.aboveSpotThreshold.trim() && Number.isFinite(parsedAboveSpot)) {
      payload.aboveSpotThreshold = parsedAboveSpot;
    }
  }

  return payload;
};

export const generateAlertName = (
  values: AlertFormValues,
  productOptions?: ProductOption[],
): string => {
  if (values.formType === "threshold") {
    const pct = values.aboveSpotThreshold.trim();
    return pct ? `Markup \u2264 ${pct}%` : "Markup alert";
  }

  if (values.formType === "sku") {
    const product = productOptions?.find((p) => p.productId === values.skuProductId);
    const label = product?.name ?? "Product";
    const trigger = values.skuTriggerOn === "in_stock" ? "restock" : "price drop";
    return `${label} ${trigger}`;
  }

  // category
  const parts: string[] = [];
  if (values.categoryMetal) {
    parts.push(values.categoryMetal.charAt(0).toUpperCase() + values.categoryMetal.slice(1));
  }
  if (values.brand.trim()) parts.push(values.brand.trim());
  if (values.categoryWeight.trim()) parts.push(`${values.categoryWeight.trim()}oz`);
  const trigger = values.categoryTriggerOn === "in_stock" ? "restock" : "price drop";
  return parts.length > 0 ? `${parts.join(" ")} ${trigger}` : `Category ${trigger}`;
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
