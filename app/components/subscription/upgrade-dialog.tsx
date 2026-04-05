import { CheckCircle2, Loader2, Sparkles } from "lucide-react";
import type { ComponentProps } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface UpgradeDialogProps {
  isLoading: boolean;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}

export const UpgradeDialog = ({ isLoading, onConfirm, onOpenChange, open }: UpgradeDialogProps) => {
  const handleOpenChange: ComponentProps<typeof Dialog>["onOpenChange"] = (nextOpen, details) => {
    if (!nextOpen && details.reason === "outside-press") {
      details.cancel();
      return;
    }

    onOpenChange(nextOpen);
  };

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="gap-3 text-left">
          <Badge
            className="w-fit rounded-full px-3 py-1 text-[11px] tracking-[0.22em] uppercase"
            variant="gold"
          >
            Pro
          </Badge>
          <DialogTitle className="text-xl font-semibold">
            Alerts require a Pro subscription
          </DialogTitle>
          <DialogDescription>
            Get notified by email when prices hit your target or sold-out products come back in
            stock.
          </DialogDescription>
        </DialogHeader>

        <ul className="space-y-3 py-2 text-sm text-muted-foreground">
          <li className="flex items-center gap-2">
            <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
            Set alerts on any product on the dashboard
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
            Secure checkout via Stripe
          </li>
          <li className="flex items-center gap-2">
            <Sparkles className="size-4 shrink-0 text-amber-400" />
            <span>
              Inventory tracking{" "}
              <span className="text-xs text-muted-foreground/60">coming soon</span>
            </span>
          </li>
        </ul>

        <DialogFooter className="!flex-col items-center gap-1">
          <Button className="w-full" disabled={isLoading} onClick={onConfirm}>
            {isLoading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
            Continue to Stripe &mdash; $8/mo
          </Button>
          <Button
            className="text-muted-foreground/60"
            onClick={() => {
              onOpenChange(false);
            }}
            size="sm"
            variant="ghost"
          >
            Not now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
