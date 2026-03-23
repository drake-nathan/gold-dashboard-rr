import { SignIn, useAuth } from "@clerk/react-router";
import { Bell, Loader2, Plus, TriangleAlert } from "lucide-react";

import { UpgradeButton } from "@/components/subscription/upgrade-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";

import { EditAlertDialog } from "./dialogs/edit-alert-dialog";
import { AlertFormFields } from "./form/alert-form-fields";
import { useAlertsPage } from "./hooks/use-alerts-page";
import { AlertCard } from "./list/alert-card";

export const AlertsPage = () => {
  const { isLoaded: isAuthLoaded, isSignedIn } = useAuth();
  const {
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
  } = useAlertsPage(isSignedIn === true);

  if (!isAuthLoaded) {
    return (
      <main className="flex flex-1 items-center justify-center px-4 py-8">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading alerts...</span>
        </div>
      </main>
    );
  }

  if (!isSignedIn) {
    return (
      <main className="flex flex-1 items-center justify-center px-4 py-8">
        <div className="flex flex-col items-center">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold">Alerts</h1>
            <p className="text-sm text-muted-foreground">Sign in to manage your alerts</p>
          </div>
          <SignIn fallbackRedirectUrl="/alerts" forceRedirectUrl="/alerts" routing="hash" />
        </div>
      </main>
    );
  }

  const canCreate = alertEntitlements.canCreateAlerts;
  const enabledCount = alerts?.filter((alert) => alert.enabled).length ?? 0;
  const totalCount = alerts?.length ?? 0;

  return (
    <>
      <main className="container mx-auto flex-1 px-4 py-8">
        <div className="mb-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Alerts</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Get notified when Costco products hit your price targets.
              </p>
            </div>

            <div
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium${
                alertEntitlements.canSendAlerts
                  ? " border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : " border-yellow-500/30 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"
              }`}
            >
              <span
                className={`inline-block size-1.5 rounded-full${
                  alertEntitlements.canSendAlerts ? " bg-emerald-500" : " bg-yellow-500"
                }`}
              />
              {alertEntitlements.canSendAlerts ? "Sending active" : "Sending paused"}
            </div>
          </div>
        </div>

        {!canCreate ? (
          <div className="mb-8 flex flex-col gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2.5">
              <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-500" />
              <p className="text-sm text-muted-foreground">
                Creating new alerts requires a Pro subscription. You can still view and manage
                existing alerts.
              </p>
            </div>
            <UpgradeButton size="sm" />
          </div>
        ) : null}

        <div className="grid gap-8 lg:grid-cols-[1fr_1.25fr]">
          <div>
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Plus className="size-4 text-muted-foreground" />
                  Create Alert
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <AlertFormFields
                  onChange={(update) => {
                    setFormValues((prev) => ({ ...prev, ...update }));
                  }}
                  productOptions={productOptions}
                  values={formValues}
                />

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Enabled on create</p>
                    <p className="text-xs text-muted-foreground">Disable to save as draft.</p>
                  </div>
                  <Switch
                    checked={formValues.enabled}
                    onCheckedChange={(checked) => {
                      setFormValues((prev) => ({ ...prev, enabled: checked }));
                    }}
                  />
                </div>

                <Button
                  className="w-full"
                  disabled={createDisabled}
                  onClick={() => {
                    void onCreateAlert();
                  }}
                >
                  {isSaving ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Plus className="size-4" />
                  )}
                  Create Alert
                </Button>
              </CardContent>
            </Card>
          </div>

          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold">Your Alerts</h2>
              {totalCount > 0 ? (
                <span className="text-xs text-muted-foreground tabular-nums">
                  {enabledCount} of {totalCount} active
                </span>
              ) : null}
            </div>

            {alerts === undefined ? (
              <Card>
                <CardContent className="flex items-center justify-center py-12">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" />
                    Loading alerts...
                  </div>
                </CardContent>
              </Card>
            ) : alerts.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-muted">
                    <Bell className="size-5 text-muted-foreground" />
                  </div>
                  <p className="font-medium">No alerts yet</p>
                  <p className="mt-1 max-w-[240px] text-sm text-muted-foreground">
                    Create your first alert to get notified about deals and restocks.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {alerts.map((alert) => (
                  <AlertCard
                    alert={alert}
                    key={alert._id}
                    onDelete={onDeleteAlert}
                    onEdit={setEditingAlert}
                    onToggle={onToggleAlert}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {editingAlert ? (
        <EditAlertDialog
          alert={editingAlert}
          onClose={() => {
            setEditingAlert(null);
          }}
          onSave={onEditAlert}
          productOptions={productOptions}
        />
      ) : null}
    </>
  );
};
