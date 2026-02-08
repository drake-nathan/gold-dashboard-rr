import type { Doc, Id } from "convex/_generated/dataModel";

import { SignIn, useAuth } from "@clerk/react-router";
import { api } from "convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import {
  Bell,
  BellOff,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { toast } from "sonner";

import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { UpgradeButton } from "@/components/subscription";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useSubscription } from "@/hooks/use-subscription";

type AlertFormType = "category" | "sku" | "threshold";
type TriggerOn = "in_stock" | "price_drop" | "threshold_met";

interface ProductOption {
  metalType: string;
  name: string;
  productId: string;
}

interface AlertFormValues {
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

const defaultFormValues: AlertFormValues = {
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

const alertFormValuesFromDoc = (alert: Doc<"alerts">): AlertFormValues => ({
  aboveSpotThreshold:
    alert.aboveSpotThreshold !== undefined ?
      String(alert.aboveSpotThreshold)
    : "",
  brand: alert.brand ?? "",
  categoryMetal: alert.metalType ?? "",
  categoryTriggerOn:
    alert.triggerOn === "price_drop" ? "price_drop" : "in_stock",
  categoryWeight: alert.weight !== undefined ? String(alert.weight) : "",
  cooldownMinutes: alert.cooldownMinutes,
  enabled: alert.enabled,
  formType: alert.type,
  name: alert.name,
  profitThreshold:
    alert.profitThreshold !== undefined ? String(alert.profitThreshold) : "",
  skuProductId: alert.productId ?? "",
  skuTriggerOn: alert.triggerOn === "price_drop" ? "price_drop" : "in_stock",
});

const getFormValidationError = (values: AlertFormValues): boolean => {
  const categoryHasFilter =
    values.categoryMetal.length > 0 ||
    values.categoryWeight.trim() ||
    values.brand.trim();
  const thresholdHasFilter =
    values.aboveSpotThreshold.trim().length > 0 ||
    values.profitThreshold.trim().length > 0;

  return (
    (values.formType === "category" && !categoryHasFilter) ||
    (values.formType === "sku" && !values.skuProductId) ||
    (values.formType === "threshold" && !thresholdHasFilter)
  );
};

const buildAlertPayload = (values: AlertFormValues) => {
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

    if (
      values.aboveSpotThreshold.trim() &&
      Number.isFinite(parsedAboveSpot)
    ) {
      payload.aboveSpotThreshold = parsedAboveSpot;
    }

    if (values.profitThreshold.trim() && Number.isFinite(parsedProfit)) {
      payload.profitThreshold = parsedProfit;
    }
  }

  return payload;
};

const AlertFormFields = ({
  onChange,
  productOptions,
  values,
}: {
  onChange: (update: Partial<AlertFormValues>) => void;
  productOptions: ProductOption[];
  values: AlertFormValues;
}) => (
  <>
    <div className="space-y-2">
      <Label htmlFor="alert-name">Name</Label>
      <Input
        id="alert-name"
        onChange={(event) => {
          onChange({ name: event.target.value });
        }}
        placeholder="Deal watcher"
        value={values.name}
      />
    </div>

    <div className="space-y-2">
      <Label htmlFor="alert-type">Alert Type</Label>
      <Select
        onValueChange={(value) => {
          onChange({ formType: value as AlertFormType });
        }}
        value={values.formType}
      >
        <SelectTrigger id="alert-type">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="threshold">Threshold</SelectItem>
          <SelectItem value="sku">Specific Product (SKU)</SelectItem>
          <SelectItem value="category">Category</SelectItem>
        </SelectContent>
      </Select>
    </div>

    {values.formType === "sku" ?
      <>
        <div className="space-y-2">
          <Label htmlFor="alert-product">Product</Label>
          <Select
            onValueChange={(value) => {
              onChange({ skuProductId: value });
            }}
            value={values.skuProductId || undefined}
          >
            <SelectTrigger id="alert-product">
              <SelectValue placeholder="Select a product" />
            </SelectTrigger>
            <SelectContent>
              {productOptions.map((product) => (
                <SelectItem
                  key={product.productId}
                  value={product.productId}
                >
                  {product.name} ({product.metalType})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="alert-sku-trigger">Trigger On</Label>
          <Select
            onValueChange={(value) => {
              onChange({
                skuTriggerOn: value as "in_stock" | "price_drop",
              });
            }}
            value={values.skuTriggerOn}
          >
            <SelectTrigger id="alert-sku-trigger">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="in_stock">Back in stock</SelectItem>
              <SelectItem value="price_drop">Price drop</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </>
    : null}

    {values.formType === "category" ?
      <>
        <div className="space-y-2">
          <Label htmlFor="alert-category-trigger">Trigger On</Label>
          <Select
            onValueChange={(value) => {
              onChange({
                categoryTriggerOn: value as "in_stock" | "price_drop",
              });
            }}
            value={values.categoryTriggerOn}
          >
            <SelectTrigger id="alert-category-trigger">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="in_stock">Back in stock</SelectItem>
              <SelectItem value="price_drop">Price drop</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="alert-metal">Metal</Label>
          <Select
            onValueChange={(value) => {
              onChange({
                categoryMetal:
                  value === "any" ? "" : (value as "gold" | "silver"),
              });
            }}
            value={values.categoryMetal || "any"}
          >
            <SelectTrigger id="alert-metal">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any metal</SelectItem>
              <SelectItem value="gold">Gold</SelectItem>
              <SelectItem value="silver">Silver</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="alert-weight">Weight (oz)</Label>
          <Input
            id="alert-weight"
            onChange={(event) => {
              onChange({ categoryWeight: event.target.value });
            }}
            placeholder="Optional (e.g. 1)"
            type="number"
            value={values.categoryWeight}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="alert-brand">Brand</Label>
          <Input
            id="alert-brand"
            onChange={(event) => {
              onChange({ brand: event.target.value });
            }}
            placeholder="Optional (e.g. PAMP)"
            value={values.brand}
          />
        </div>
      </>
    : null}

    {values.formType === "threshold" ?
      <>
        <div className="space-y-2">
          <Label htmlFor="alert-above-spot">
            Above Spot Threshold (%)
          </Label>
          <Input
            id="alert-above-spot"
            onChange={(event) => {
              onChange({ aboveSpotThreshold: event.target.value });
            }}
            placeholder="Optional (e.g. 0.5)"
            type="number"
            value={values.aboveSpotThreshold}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="alert-profit-threshold">
            Profit Threshold (USD)
          </Label>
          <Input
            id="alert-profit-threshold"
            onChange={(event) => {
              onChange({ profitThreshold: event.target.value });
            }}
            placeholder="Optional (e.g. 25)"
            type="number"
            value={values.profitThreshold}
          />
        </div>
      </>
    : null}

    <div className="space-y-2">
      <Label htmlFor="alert-cooldown">Cooldown (minutes)</Label>
      <Input
        id="alert-cooldown"
        min={1}
        onChange={(event) => {
          const value = Number.parseInt(event.target.value, 10);
          onChange({ cooldownMinutes: Number.isFinite(value) ? value : 60 });
        }}
        type="number"
        value={values.cooldownMinutes}
      />
    </div>
  </>
);

const EditAlertDialog = ({
  alert,
  onClose,
  onSave,
  productOptions,
}: {
  alert: Doc<"alerts">;
  onClose: () => void;
  onSave: (alertId: Id<"alerts">, payload: ReturnType<typeof buildAlertPayload>) => Promise<void>;
  productOptions: ProductOption[];
}) => {
  const [values, setValues] = useState<AlertFormValues>(() =>
    alertFormValuesFromDoc(alert),
  );
  const [isSaving, setIsSaving] = useState(false);

  const hasValidationError = getFormValidationError(values);
  const saveDisabled = isSaving || hasValidationError || !values.name.trim();

  const handleSave = async () => {
    if (saveDisabled) return;

    const payload = buildAlertPayload(values);
    setIsSaving(true);
    try {
      await onSave(alert._id, payload);
      onClose();
    } catch {
      // error toast handled by caller
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog onOpenChange={(open) => { if (!open) onClose(); }} open>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Alert</DialogTitle>
          <DialogDescription>
            Update the configuration for this alert.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <AlertFormFields
            onChange={(update) => {
              setValues((prev) => ({ ...prev, ...update }));
            }}
            productOptions={productOptions}
            values={values}
          />

          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <p className="text-sm font-medium">Enabled</p>
              <p className="text-xs text-muted-foreground">
                Disable to pause this alert.
              </p>
            </div>
            <Switch
              checked={values.enabled}
              onCheckedChange={(checked) => {
                setValues((prev) => ({ ...prev, enabled: checked }));
              }}
            />
          </div>
        </div>

        <DialogFooter>
          <Button onClick={onClose} variant="outline">
            Cancel
          </Button>
          <Button
            disabled={saveDisabled}
            onClick={() => {
              void handleSave();
            }}
          >
            {isSaving ?
              <Loader2 className="size-4 animate-spin" />
            : null}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const meta = () => [
  { title: "Alerts - Dashboard.Gold" },
  {
    content: "Manage your Dashboard.Gold price and stock alerts",
    name: "description",
  },
  { content: "noindex, nofollow", name: "robots" },
];

const AlertsPage = () => {
  const [searchParams] = useSearchParams();
  const { isLoaded: isAuthLoaded, isSignedIn } = useAuth();
  const { alertEntitlements, isLoading: isSubscriptionLoading } =
    useSubscription();

  const alerts = useQuery(api.alerts.getAlerts, isSignedIn ? {} : "skip");
  const stats = useQuery(api.dashboard.getStats, isSignedIn ? {} : "skip");

  const createAlert = useMutation(api.alerts.createAlert);
  const updateAlert = useMutation(api.alerts.updateAlert);
  const deleteAlert = useMutation(api.alerts.deleteAlert);

  const initialType = searchParams.get("type");
  const initialFormType: AlertFormType =
    initialType === "sku" || initialType === "category" ?
      initialType
    : "threshold";

  const [isSaving, setIsSaving] = useState(false);
  const [editingAlert, setEditingAlert] = useState<Doc<"alerts"> | null>(null);
  const [formValues, setFormValues] = useState<AlertFormValues>(() => ({
    ...defaultFormValues,
    formType: initialFormType,
    name: searchParams.get("name") ?? "",
    skuProductId: searchParams.get("productId") ?? "",
    skuTriggerOn:
      searchParams.get("triggerOn") === "price_drop" ?
        ("price_drop" as const)
      : ("in_stock" as const),
  }));

  const productOptions = useMemo(() => {
    if (!stats) {
      return [];
    }

    const allProducts = [
      ...stats.goldProducts.bestSpread,
      ...stats.silverProducts.bestSpread,
    ];

    const unique = new Map(
      allProducts.map((product) => [
        product.productId,
        {
          metalType: product.metalType,
          name: product.name,
          productId: product.productId,
        },
      ]),
    );

    return [...unique.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [stats]);

  const hasValidationError = getFormValidationError(formValues);

  const createDisabled =
    isSaving ||
    isSubscriptionLoading ||
    !alertEntitlements.canCreateAlerts ||
    hasValidationError ||
    !formValues.name.trim();

  const getPauseBadge = (
    pauseReason?: "billing_hold" | "inactive_subscription",
  ) => {
    if (!pauseReason) {
      return null;
    }
    return (
      <Badge variant="outline">
        {pauseReason === "billing_hold" ?
          "Paused (billing issue)"
        : "Paused (subscription inactive)"}
      </Badge>
    );
  };

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
      toast.error(
        error instanceof Error ? error.message : "Failed to create alert",
      );
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
      toast.error(
        error instanceof Error ? error.message : "Failed to update alert",
      );
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
      toast.error(
        error instanceof Error ? error.message : "Failed to update alert",
      );
    }
  };

  const onDeleteAlert = async (alertId: Id<"alerts">) => {
    try {
      await deleteAlert({
        alertId,
      });
      toast.success("Alert deleted");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete alert",
      );
    }
  };

  if (!isAuthLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading alerts...</span>
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="flex flex-col items-center">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold">Alerts</h1>
            <p className="text-sm text-muted-foreground">
              Sign in to manage your alerts
            </p>
          </div>
          <SignIn
            fallbackRedirectUrl="/alerts"
            forceRedirectUrl="/alerts"
            routing="hash"
          />
        </div>
      </div>
    );
  }

  const canCreate = alertEntitlements.canCreateAlerts;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="container mx-auto flex-1 px-4 py-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Alerts</h1>
            <p className="text-sm text-muted-foreground">
              Create and manage stock/price alerts for products you track.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant={alertEntitlements.canSendAlerts ? "default" : "outline"}
            >
              {alertEntitlements.canSendAlerts ? "Sending enabled" : "Paused"}
            </Badge>
          </div>
        </div>

        {!canCreate ?
          <Card className="mb-6 border-amber-500/40 bg-amber-500/5">
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-2">
                <TriangleAlert className="mt-0.5 h-4 w-4 text-amber-600" />
                <p className="text-sm text-muted-foreground">
                  New alerts require an active Pro subscription. You can still
                  manage existing alerts.
                </p>
              </div>
              <UpgradeButton size="sm" />
            </CardContent>
          </Card>
        : null}

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Create Alert</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <AlertFormFields
                onChange={(update) => {
                  setFormValues((prev) => ({ ...prev, ...update }));
                }}
                productOptions={productOptions}
                values={formValues}
              />

              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <p className="text-sm font-medium">Enabled on create</p>
                  <p className="text-xs text-muted-foreground">
                    Disable to save as draft.
                  </p>
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
                {isSaving ?
                  <Loader2 className="size-4 animate-spin" />
                : <Plus className="size-4" />}
                Create Alert
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Your Alerts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {alerts === undefined ?
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  Loading alerts...
                </div>
              : alerts.length === 0 ?
                <div className="flex h-full min-h-28 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
                  No alerts yet.
                </div>
              : alerts.map((alert) => (
                  <div
                    className="space-y-3 rounded-md border p-3"
                    key={alert._id}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-medium">{alert.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {alert.type} • {alert.triggerOn} •{" "}
                          {alert.cooldownMinutes}m cooldown
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {alert.enabled ?
                          <Badge className="gap-1" variant="default">
                            <Bell className="size-3" />
                            Enabled
                          </Badge>
                        : <Badge className="gap-1" variant="secondary">
                            <BellOff className="size-3" />
                            Disabled
                          </Badge>
                        }
                        {getPauseBadge(alert.pauseReason)}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Label htmlFor={`enable-${alert._id}`}>Enable</Label>
                        <Switch
                          checked={alert.enabled}
                          id={`enable-${alert._id}`}
                          onCheckedChange={(checked) => {
                            void onToggleAlert(alert._id, checked);
                          }}
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => {
                            setEditingAlert(alert);
                          }}
                          size="sm"
                          variant="outline"
                        >
                          <Pencil className="size-4" />
                          Edit
                        </Button>
                        <Button
                          onClick={() => {
                            void onDeleteAlert(alert._id);
                          }}
                          size="sm"
                          variant="destructive"
                        >
                          <Trash2 className="size-4" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              }
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />

      {editingAlert ?
        <EditAlertDialog
          alert={editingAlert}
          onClose={() => { setEditingAlert(null); }}
          onSave={onEditAlert}
          productOptions={productOptions}
        />
      : null}
    </div>
  );
};

export default AlertsPage;
