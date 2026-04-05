import { Loader2, Plus } from "lucide-react";
import { useState } from "react";
import { useSearchParams } from "react-router";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";

import { AlertFormFields } from "../form/alert-form-fields";
import {
  buildAlertPayload,
  defaultFormValues,
  generateAlertName,
  getValidationErrorMessage,
  type AlertFormType,
  type AlertFormValues,
  type ProductOption,
} from "../form/types";

export const CreateAlertDialog = ({
  brandOptions,
  onClose,
  onSave,
  productOptions,
}: {
  brandOptions: string[];
  onClose: () => void;
  onSave: (payload: ReturnType<typeof buildAlertPayload>) => Promise<void>;
  productOptions: ProductOption[];
}) => {
  const [searchParams] = useSearchParams();

  const [values, setValues] = useState<AlertFormValues>(() => {
    const initialType = searchParams.get("type");
    const formType: AlertFormType =
      initialType === "threshold" || initialType === "sku" || initialType === "category"
        ? initialType
        : "category";

    const initial: AlertFormValues = {
      ...defaultFormValues,
      formType,
      name: searchParams.get("name") ?? "",
      skuProductId: searchParams.get("productId") ?? "",
      skuTriggerOn: "in_stock",
    };

    if (!initial.name) {
      initial.name = generateAlertName(initial, productOptions);
    }

    return initial;
  });
  const [isSaving, setIsSaving] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const validationErrorMessage = getValidationErrorMessage(values);
  const showValidationErrors = submitAttempted && validationErrorMessage !== null;

  const handleFieldChange = (update: Partial<AlertFormValues>) => {
    setValues((prev) => {
      const next = { ...prev, ...update };

      if ("name" in update) {
        // User cleared the name — refill with auto-generated
        if (!update.name) {
          next.name = generateAlertName(next, productOptions);
        }
      } else {
        // Config change — update name if it matches the current auto-generated
        const currentAutoName = generateAlertName(prev, productOptions);
        if (prev.name === currentAutoName) {
          next.name = generateAlertName(next, productOptions);
        }
      }

      return next;
    });
  };

  const handleCreate = async () => {
    if (isSaving) return;
    setSubmitAttempted(true);
    if (validationErrorMessage) return;

    const payload = buildAlertPayload(values, productOptions);
    setIsSaving(true);
    try {
      await onSave(payload);
      onClose();
    } catch {
      // error toast handled by caller
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      open
    >
      <DialogContent className="flex max-h-[85vh] flex-col">
        <DialogHeader>
          <DialogTitle>Create Alert</DialogTitle>
          <DialogDescription>
            Get notified when Costco products hit your price targets.
          </DialogDescription>
        </DialogHeader>

        <div className="-mx-6 flex-1 overflow-y-auto px-6">
          <div className="space-y-4 pb-2">
            <AlertFormFields
              brandOptions={brandOptions}
              onChange={handleFieldChange}
              productOptions={productOptions}
              showValidationErrors={showValidationErrors}
              values={values}
            />

            {showValidationErrors ? (
              <p className="text-sm text-destructive" role="alert">
                {validationErrorMessage}
              </p>
            ) : null}

            <Separator />

            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Enabled on create</p>
                <p className="text-xs text-muted-foreground">Disable to save as draft.</p>
              </div>
              <Switch
                checked={values.enabled}
                onCheckedChange={(checked) => {
                  setValues((prev) => ({ ...prev, enabled: checked }));
                }}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={onClose} variant="outline">
            Cancel
          </Button>
          <Button
            disabled={isSaving}
            onClick={() => {
              void handleCreate();
            }}
          >
            {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            Create Alert
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
