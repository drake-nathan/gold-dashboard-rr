import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  type CreditCard,
  calculateCashbackPercentage,
} from "@/features/credit-cards/lib/credit-cards";

import type { CalculatorSettings } from "./types";

export type { CalculatorSettings, CreditCard } from "./types";

interface CalculatorSettingsDialogProps {
  availableCards: CreditCard[];
  onOpenCardManager?: () => void;
  onSettingsChange: (settings: CalculatorSettings) => void;
  settings: CalculatorSettings;
}

export const CalculatorSettingsDialog = ({
  availableCards,
  onOpenCardManager,
  onSettingsChange,
  settings,
}: CalculatorSettingsDialogProps) => {
  const [localSettings, setLocalSettings] = useState(settings);

  const handleCardChange = (cardId: null | string) => {
    if (!cardId) return;

    const card = availableCards.find((c) => c.id === cardId);
    if (!card) return;

    const newSettings = { ...localSettings, creditCard: card };
    setLocalSettings(newSettings);
    onSettingsChange(newSettings);
  };

  const handleMembershipToggle = (enabled: boolean) => {
    const newSettings = { ...localSettings, costcoMembershipEnabled: enabled };
    setLocalSettings(newSettings);
    onSettingsChange(newSettings);
  };

  const cashbackPercentage = calculateCashbackPercentage(localSettings.creditCard);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">Calculator Settings</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Calculator Settings</DialogTitle>
          <DialogDescription>
            Configure your cashback calculations to see accurate spreads
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium" htmlFor="costco-membership">
              Costco Executive Membership (2% cashback)
            </Label>
            <Switch
              checked={localSettings.costcoMembershipEnabled}
              id="costco-membership"
              onCheckedChange={handleMembershipToggle}
            />
          </div>

          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="credit-card">Credit Card</Label>
              {onOpenCardManager ? (
                <Button onClick={onOpenCardManager} size="sm" type="button" variant="ghost">
                  Manage Cards
                </Button>
              ) : null}
            </div>
            <Select
              modal={false}
              onValueChange={handleCardChange}
              value={localSettings.creditCard.id}
            >
              <SelectTrigger id="credit-card">
                <SelectValue placeholder="Select a credit card">
                  {localSettings.creditCard.name} ({cashbackPercentage.toFixed(2)}%)
                </SelectValue>
              </SelectTrigger>
              <SelectContent portal={false}>
                {availableCards.map((card) => {
                  const cardCashback = calculateCashbackPercentage(card);
                  return (
                    <SelectItem key={card.id} value={card.id}>
                      {card.name} ({cardCashback.toFixed(2)}%)
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-lg bg-muted p-3 text-sm">
            <div className="font-medium">Current Settings:</div>
            <div className="mt-1 text-muted-foreground">
              Costco Executive: {localSettings.costcoMembershipEnabled ? "2%" : "0%"}
            </div>
            <div className="text-muted-foreground">
              Credit Card: {cashbackPercentage.toFixed(2)}%
            </div>
            <div className="mt-2 font-medium">
              Total Cashback:{" "}
              {((localSettings.costcoMembershipEnabled ? 2 : 0) + cashbackPercentage).toFixed(2)}%
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
