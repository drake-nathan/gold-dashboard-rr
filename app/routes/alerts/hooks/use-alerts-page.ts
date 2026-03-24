import { api } from "convex/_generated/api";
import type { Doc, Id } from "convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";

import { buildAlertPayload, defaultFormValues } from "../form/types";
import { useAlertForm } from "./use-alert-form";
import { useAlertQueries } from "./use-alert-queries";

export const useAlertsPage = (isSignedIn: boolean) => {
  const { alertEntitlements, alerts, isSubscriptionLoading, productOptions } =
    useAlertQueries(isSignedIn);
  const { formValues, hasValidationError, setFormValues } = useAlertForm();

  const createAlert = useMutation(api.alerts.createAlert);
  const updateAlert = useMutation(api.alerts.updateAlert);
  const deleteAlert = useMutation(api.alerts.deleteAlert);

  const [isSaving, setIsSaving] = useState(false);
  const [editingAlert, setEditingAlert] = useState<Doc<"alerts"> | null>(null);

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
