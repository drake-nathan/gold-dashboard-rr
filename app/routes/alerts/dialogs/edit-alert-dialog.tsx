import type { Doc, Id } from "convex/_generated/dataModel";
import { Loader2 } from "lucide-react";
import { useState } from "react";

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
  alertFormValuesFromDoc,
  buildAlertPayload,
  generateAlertName,
  getValidationErrorMessage,
  type AlertFormValues,
  type ProductOption,
} from "../form/types";

export const EditAlertDialog = ({
  alert,
  brandOptions,
  onClose,
  onSave,
  productOptions,
}: {
  alert: Doc<"alerts">;
  brandOptions: string[];
  onClose: () => void;
  onSave: (alertId: Id<"alerts">, payload: ReturnType<typeof buildAlertPayload>) => Promise<void>;
  productOptions: ProductOption[];
}) => {
  const [values, setValues] = useState(() => alertFormValuesFromDoc(alert));
  const [isSaving, setIsSaving] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const validationErrorMessage = getValidationErrorMessage(values);
  const showValidationErrors = submitAttempted && validationErrorMessage !== null;

  const handleFieldChange = (update: Partial<AlertFormValues>) => {
    setValues((prev) => {
      const next = { ...prev, ...update };

      if ("name" in update) {
        if (!update.name) {
          next.name = generateAlertName(next, productOptions);
        }
      } else {
        const currentAutoName = generateAlertName(prev, productOptions);
        if (prev.name === currentAutoName) {
          next.name = generateAlertName(next, productOptions);
        }
      }

      return next;
    });
  };

  const handleSave = async () => {
    if (isSaving) return;
    setSubmitAttempted(true);
    if (validationErrorMessage) return;

    const payload = buildAlertPayload(values, productOptions);
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
    <Dialog
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      open
    >
      <DialogContent className="top-10 flex max-h-[calc(100vh-5rem)] -translate-y-0 flex-col sm:top-16 sm:max-h-[calc(100vh-8rem)]">
        <DialogHeader>
          <DialogTitle>Edit Alert</DialogTitle>
          <DialogDescription>Update the configuration for this alert.</DialogDescription>
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
                <p className="text-sm font-medium">Enabled</p>
                <p className="text-xs text-muted-foreground">Disable to pause this alert.</p>
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
              void handleSave();
            }}
          >
            {isSaving ? <Loader2 className="size-4 animate-spin" /> : null}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
