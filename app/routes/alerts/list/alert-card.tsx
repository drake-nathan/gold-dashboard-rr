import type { Doc, Id } from "convex/_generated/dataModel";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";

const formatCooldown = (minutes: number): string => {
  if (minutes >= 1440) return `${Math.round(minutes / 1440)} day`;
  if (minutes >= 60) return `${Math.round(minutes / 60)} hour`;
  return `${minutes} min`;
};

const buildDescription = (alert: Doc<"alerts">): string => {
  const parts: string[] = [];

  if (alert.type === "category") {
    if (alert.metalType)
      parts.push(alert.metalType.charAt(0).toUpperCase() + alert.metalType.slice(1));
    if (alert.brand) parts.push(alert.brand);
    if (alert.weight) parts.push(`${alert.weight}oz`);
  }

  if (alert.type !== "threshold") {
    parts.push(alert.triggerOn === "in_stock" ? "Back in stock" : "Price drop");
  }

  parts.push(`Re-alerts after ${formatCooldown(alert.cooldownMinutes)}`);

  return parts.join(" · ");
};

export const AlertCard = ({
  alert,
  onDelete,
  onEdit,
  onToggle,
}: {
  alert: Doc<"alerts">;
  onDelete: (alertId: Id<"alerts">) => Promise<void>;
  onEdit: (alert: Doc<"alerts">) => void;
  onToggle: (alertId: Id<"alerts">, enabled: boolean) => Promise<void>;
}) => (
  <div
    className={`group relative rounded-lg border bg-card p-4 transition-colors${alert.enabled ? "" : " opacity-60"}`}
  >
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        <p className="leading-snug font-medium wrap-break-word">{alert.name}</p>
        <p className="mt-1 text-xs text-muted-foreground">{buildDescription(alert)}</p>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <Switch
          checked={alert.enabled}
          onCheckedChange={(checked) => {
            void onToggle(alert._id, checked);
          }}
        />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="size-8 text-muted-foreground" size="icon" variant="ghost">
              <MoreVertical className="size-4" />
              <span className="sr-only">Alert actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => {
                onEdit(alert);
              }}
            >
              <Pencil className="mr-2 size-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => {
                void onDelete(alert._id);
              }}
            >
              <Trash2 className="mr-2 size-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>

    {alert.pauseReason ? (
      <div className="mt-2">
        <Badge variant="destructive">
          {alert.pauseReason === "billing_hold" ? "Billing issue" : "Subscription inactive"}
        </Badge>
      </div>
    ) : null}
  </div>
);
