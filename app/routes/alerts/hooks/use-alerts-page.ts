import { api } from "convex/_generated/api";
import type { Doc, Id } from "convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { usePostHog } from "posthog-js/react";
import { useState } from "react";
import { toast } from "sonner";

import type { buildAlertPayload } from "../form/types";
import { useAlertQueries } from "./use-alert-queries";

const enableAlertsErrorMessage = "An active subscription is required to enable alerts.";

export const useAlertsPage = (isSignedIn: boolean) => {
  const posthog = usePostHog();
  const { alertEntitlements, alerts, brandOptions, productOptions } = useAlertQueries(isSignedIn);

  const createAlert = useMutation(api.alerts.createAlert);
  const updateAlert = useMutation(api.alerts.updateAlert);
  const deleteAlert = useMutation(api.alerts.deleteAlert);

  const [editingAlert, setEditingAlert] = useState<Doc<"alerts"> | null>(null);

  const onCreateAlert = async (payload: ReturnType<typeof buildAlertPayload>) => {
    if (!alertEntitlements.canCreateAlerts) {
      toast.error("Creating alerts requires a Pro subscription");
      throw new Error("Subscription required");
    }

    try {
      await createAlert(payload);
      posthog.capture("alert_created", {
        alert_type: payload.type,
        brand: payload.brand ?? null,
        cooldown_minutes: payload.cooldownMinutes,
        enabled_on_create: payload.enabled,
        has_above_spot_threshold: payload.aboveSpotThreshold !== undefined,
        has_product_id: payload.productId !== undefined,

        metal_type: payload.metalType ?? null,
        product_id: payload.productId ?? null,
        trigger_on: payload.triggerOn,
        weight_group: payload.weightGroup ?? null,
      });
      toast.success("Alert created");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create alert");
      throw error;
    }
  };

  const onEditAlert = async (
    alertId: Id<"alerts">,
    payload: ReturnType<typeof buildAlertPayload>,
  ) => {
    if (payload.enabled && !alertEntitlements.canEnableAlerts) {
      toast.error(enableAlertsErrorMessage);
      throw new Error(enableAlertsErrorMessage);
    }

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
    if (nextEnabled && !alertEntitlements.canEnableAlerts) {
      toast.error(enableAlertsErrorMessage);
      return;
    }

    try {
      await updateAlert({
        alertId,
        enabled: nextEnabled,
      });
      posthog.capture("alert_toggled", {
        alert_id: alertId,
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
      posthog.capture("alert_deleted", {
        alert_id: alertId,
      });
      toast.success("Alert deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete alert");
    }
  };

  return {
    alertEntitlements,
    alerts,
    brandOptions,
    editingAlert,
    onCreateAlert,
    onDeleteAlert,
    onEditAlert,
    onToggleAlert,
    productOptions,
    setEditingAlert,
  };
};
