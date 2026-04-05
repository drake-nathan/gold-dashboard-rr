import { SignIn, useAuth } from "@clerk/react-router";
import { Bell, Loader2, Plus, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { useSearchParams } from "react-router";

import { UpgradeButton } from "@/components/subscription/upgrade-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { CreateAlertDialog } from "./dialogs/create-alert-dialog";
import { EditAlertDialog } from "./dialogs/edit-alert-dialog";
import { useAlertsPage } from "./hooks/use-alerts-page";
import { AlertCard } from "./list/alert-card";

const SignedInAlertsPage = () => {
  const [searchParams] = useSearchParams();
  const hasFormParams = searchParams.has("type") || searchParams.has("productId");

  const {
    alertEntitlements,
    alerts,
    editingAlert,
    onCreateAlert,
    onDeleteAlert,
    onEditAlert,
    onToggleAlert,
    productOptions,
    setEditingAlert,
  } = useAlertsPage(true);

  const [showCreateDialog, setShowCreateDialog] = useState(hasFormParams);
  const enabledCount = alerts?.filter((alert) => alert.enabled).length ?? 0;
  const totalCount = alerts?.length ?? 0;

  return (
    <>
      <main className="container mx-auto max-w-2xl flex-1 px-4 py-8">
        <div className="mb-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Alerts</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Get notified when Costco products hit your price targets.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button
                onClick={() => {
                  setShowCreateDialog(true);
                }}
              >
                <Plus className="size-4" />
                Create Alert
              </Button>

              <div
                className={`inline-flex h-9 items-center gap-2 rounded-full border px-3 text-xs font-medium${
                  alertEntitlements.canSendAlerts
                    ? " border-teal-500/30 bg-teal-500/10 text-teal-600 dark:text-teal-400"
                    : " border-yellow-500/30 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"
                }`}
              >
                <span
                  className={`inline-block size-1.5 rounded-full${
                    alertEntitlements.canSendAlerts ? " bg-teal-500" : " bg-yellow-500"
                  }`}
                />
                {alertEntitlements.canSendAlerts ? "Sending active" : "Sending paused"}
              </div>
            </div>
          </div>
        </div>

        {!alertEntitlements.canCreateAlerts ? (
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
                <Button
                  className="mt-4"
                  onClick={() => {
                    setShowCreateDialog(true);
                  }}
                  variant="outline"
                >
                  <Plus className="size-4" />
                  Create Alert
                </Button>
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
      </main>

      {showCreateDialog ? (
        <CreateAlertDialog
          onClose={() => {
            setShowCreateDialog(false);
          }}
          onSave={onCreateAlert}
          productOptions={productOptions}
        />
      ) : null}

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

export const AlertsPage = () => {
  const { isLoaded: isAuthLoaded, isSignedIn } = useAuth();

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

  return <SignedInAlertsPage />;
};
