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

import { AlertFormFields } from "./alert-form-fields";
import {
  alertFormValuesFromDoc,
  buildAlertPayload,
  getFormValidationError,
  type ProductOption,
} from "./types";

export const EditAlertDialog = ({
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
  const [values, setValues] = useState(() => alertFormValuesFromDoc(alert));
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
    <Dialog
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      open
    >
      <DialogContent className="flex max-h-[85vh] flex-col">
        <DialogHeader>
          <DialogTitle>Edit Alert</DialogTitle>
          <DialogDescription>Update the configuration for this alert.</DialogDescription>
        </DialogHeader>

        <div className="-mx-6 flex-1 overflow-y-auto px-6">
          <div className="space-y-4 pb-2">
            <AlertFormFields
              onChange={(update) => {
                setValues((prev) => ({ ...prev, ...update }));
              }}
              productOptions={productOptions}
              values={values}
            />

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
            disabled={saveDisabled}
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
