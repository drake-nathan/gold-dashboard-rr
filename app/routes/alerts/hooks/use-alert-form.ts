import { useState } from "react";
import { useSearchParams } from "react-router";

import {
  defaultFormValues,
  getFormValidationError,
  type AlertFormType,
  type AlertFormValues,
} from "../form/types";

export const useAlertForm = () => {
  const [searchParams] = useSearchParams();

  const initialType = searchParams.get("type");
  const initialFormType: AlertFormType =
    initialType === "sku" || initialType === "category" ? initialType : "threshold";

  const [formValues, setFormValues] = useState<AlertFormValues>(() => ({
    ...defaultFormValues,
    formType: initialFormType,
    name: searchParams.get("name") ?? "",
    skuProductId: searchParams.get("productId") ?? "",
    skuTriggerOn:
      searchParams.get("triggerOn") === "price_drop"
        ? ("price_drop" as const)
        : ("in_stock" as const),
  }));

  const hasValidationError = getFormValidationError(formValues);

  return { formValues, hasValidationError, setFormValues };
};
