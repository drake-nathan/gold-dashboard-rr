import type { Doc, Id } from "convex/_generated/dataModel";
import { BellRing, Clock, MoreVertical, Pencil, Trash2, Zap } from "lucide-react";

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

import { ALERT_TYPE_LABELS, TRIGGER_LABELS } from "./types";

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
}) => {
  const typeLabel = ALERT_TYPE_LABELS[alert.type] ?? alert.type;
  const triggerLabel = TRIGGER_LABELS[alert.triggerOn] ?? alert.triggerOn;

  return (
    <div
      className={`group relative rounded-lg border bg-card p-4 transition-colors${alert.enabled ? "" : " opacity-60"}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 leading-snug font-medium wrap-break-word">{alert.name}</p>

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

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <Badge className="gap-1" variant="outline">
          <Zap className="size-3" />
          {typeLabel}
        </Badge>
        <Badge className="gap-1" variant="outline">
          <BellRing className="size-3" />
          {triggerLabel}
        </Badge>
        <Badge className="gap-1 tabular-nums" variant="outline">
          <Clock className="size-3" />
          {alert.cooldownMinutes}m
        </Badge>
        {alert.pauseReason ? (
          <Badge variant="destructive">
            {alert.pauseReason === "billing_hold" ? "Billing issue" : "Subscription inactive"}
          </Badge>
        ) : null}
      </div>
    </div>
  );
};
