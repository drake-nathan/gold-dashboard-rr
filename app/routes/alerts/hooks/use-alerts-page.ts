import { api } from "convex/_generated/api";
import type { Doc, Id } from "convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { useSearchParams } from "react-router";
import { toast } from "sonner";

import { useSubscription } from "@/features/subscription/hooks/use-subscription";

import {
  buildAlertPayload,
  defaultFormValues,
  type AlertFormType,
  type AlertFormValues,
  getFormValidationError,
} from "../form/types";

export const useAlertsPage = (isSignedIn: boolean) => {
  const [searchParams] = useSearchParams();
  const { alertEntitlements, isLoading: isSubscriptionLoading } = useSubscription();

  const alerts = useQuery(api.alerts.getAlerts, isSignedIn ? {} : "skip");
  const productOptions = useQuery(api.alerts.getProductOptions, isSignedIn ? {} : "skip") ?? [];

  const createAlert = useMutation(api.alerts.createAlert);
  const updateAlert = useMutation(api.alerts.updateAlert);
  const deleteAlert = useMutation(api.alerts.deleteAlert);

  const initialType = searchParams.get("type");
  const initialFormType: AlertFormType =
    initialType === "sku" || initialType === "category" ? initialType : "threshold";

  const [isSaving, setIsSaving] = useState(false);
  const [editingAlert, setEditingAlert] = useState<Doc<"alerts"> | null>(null);
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
  const createDisabled =
    isSaving ||
    isSubscriptionLoading ||
    !alertEntitlements.canCreateAlerts ||
    hasValidationError ||
    !formValues.name.trim();

  const onCreateAlert = async () => {
    if (createDisabled) {
      return;
    }

    const payload = buildAlertPayload(formValues);

    setIsSaving(true);
    try {
      await createAlert(payload);
      toast.success("Alert created");
      setFormValues({
        ...defaultFormValues,
        formType: formValues.formType,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create alert");
    } finally {
      setIsSaving(false);
    }
  };

  const onEditAlert = async (
    alertId: Id<"alerts">,
    payload: ReturnType<typeof buildAlertPayload>,
  ) => {
    try {
      await updateAlert({
        alertId,
        ...payload,
      });
      toast.success("Alert updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update alert");
      throw error;
    }
  };

  const onToggleAlert = async (alertId: Id<"alerts">, nextEnabled: boolean) => {
    try {
      await updateAlert({
        alertId,
        enabled: nextEnabled,
      });
      toast.success(nextEnabled ? "Alert enabled" : "Alert disabled");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update alert");
    }
  };

  const onDeleteAlert = async (alertId: Id<"alerts">) => {
    try {
      await deleteAlert({
        alertId,
      });
      toast.success("Alert deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete alert");
    }
  };

  return {
    alertEntitlements,
    alerts,
    createDisabled,
    editingAlert,
    formValues,
    isSaving,
    onCreateAlert,
    onDeleteAlert,
    onEditAlert,
    onToggleAlert,
    productOptions,
    setEditingAlert,
    setFormValues,
  };
};
