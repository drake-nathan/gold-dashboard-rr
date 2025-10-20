import { useState } from "react";

import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Switch } from "~/components/ui/switch";

export interface CreditCard {
  cashbackPercentage: number;
  earnRate: number;
  id: string;
  name: string;
  pointValue: number;
}

export const PRESET_CARDS: CreditCard[] = [
  {
    cashbackPercentage: 3.15,
    earnRate: 1.5,
    id: "freedom-unlimited",
    name: "Chase Freedom Unlimited",
    pointValue: 0.021,
  },
  {
    cashbackPercentage: 2.0,
    earnRate: 2.0,
    id: "venture-x",
    name: "Capital One Venture X",
    pointValue: 0.01,
  },
  {
    cashbackPercentage: 3.0,
    earnRate: 3.0,
    id: "robinhood",
    name: "Robinhood Gold Card",
    pointValue: 0.01,
  },
  {
    cashbackPercentage: 0,
    earnRate: 0,
    id: "custom",
    name: "Custom",
    pointValue: 0,
  },
];

export interface CalculatorSettings {
  costcoMembershipEnabled: boolean;
  creditCard: CreditCard;
}

interface CalculatorSettingsDialogProps {
  onSettingsChange: (settings: CalculatorSettings) => void;
  settings: CalculatorSettings;
}

export const CalculatorSettingsDialog = ({
  onSettingsChange,
  settings,
}: CalculatorSettingsDialogProps) => {
  const [localSettings, setLocalSettings] =
    useState<CalculatorSettings>(settings);
  const [customEarnRate, setCustomEarnRate] = useState(
    settings.creditCard.id === "custom" ? settings.creditCard.earnRate : 1.5,
  );
  const [customPointValue, setCustomPointValue] = useState(
    settings.creditCard.id === "custom" ? settings.creditCard.pointValue : 0.01,
  );

  const handleCardChange = (cardId: string) => {
    const card = PRESET_CARDS.find((c) => c.id === cardId);
    if (!card) return;

    const updatedCard =
      card.id === "custom" ?
        {
          ...card,
          cashbackPercentage: customEarnRate * customPointValue * 100,
          earnRate: customEarnRate,
          pointValue: customPointValue,
        }
      : card;

    const newSettings = { ...localSettings, creditCard: updatedCard };
    setLocalSettings(newSettings);
    onSettingsChange(newSettings);
  };

  const handleCustomValuesChange = (earnRate: number, pointValue: number) => {
    setCustomEarnRate(earnRate);
    setCustomPointValue(pointValue);

    if (localSettings.creditCard.id === "custom") {
      const updatedCard: CreditCard = {
        cashbackPercentage: earnRate * pointValue * 100,
        earnRate,
        id: "custom",
        name: "Custom",
        pointValue,
      };
      const newSettings = { ...localSettings, creditCard: updatedCard };
      setLocalSettings(newSettings);
      onSettingsChange(newSettings);
    }
  };

  const handleMembershipToggle = (enabled: boolean) => {
    const newSettings = { ...localSettings, costcoMembershipEnabled: enabled };
    setLocalSettings(newSettings);
    onSettingsChange(newSettings);
  };

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
            <Label htmlFor="credit-card">Credit Card</Label>
            <Select
              onValueChange={handleCardChange}
              value={localSettings.creditCard.id}
            >
              <SelectTrigger id="credit-card">
                <SelectValue placeholder="Select a credit card" />
              </SelectTrigger>
              <SelectContent>
                {PRESET_CARDS.map((card) => (
                  <SelectItem key={card.id} value={card.id}>
                    {card.name}
                    {card.id !== "custom" &&
                      ` (${card.cashbackPercentage.toFixed(2)}%)`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {localSettings.creditCard.id === "custom" && (
            <>
              <div className="grid gap-2">
                <Label htmlFor="earn-rate">Earn Rate (%)</Label>
                <Input
                  id="earn-rate"
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    handleCustomValuesChange(
                      parseFloat(e.target.value) || 0,
                      customPointValue,
                    );
                  }}
                  placeholder="1.5"
                  type="number"
                  value={customEarnRate}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="point-value">Point Value ($)</Label>
                <Input
                  id="point-value"
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    handleCustomValuesChange(
                      customEarnRate,
                      parseFloat(e.target.value) || 0,
                    );
                  }}
                  placeholder="0.01"
                  step="0.001"
                  type="number"
                  value={customPointValue}
                />
              </div>

              <div className="text-sm text-muted-foreground">
                Effective cashback:{" "}
                {(customEarnRate * customPointValue * 100).toFixed(2)}%
              </div>
            </>
          )}

          <div className="rounded-lg bg-muted p-3 text-sm">
            <div className="font-medium">Current Settings:</div>
            <div className="mt-1 text-muted-foreground">
              Costco Executive:{" "}
              {localSettings.costcoMembershipEnabled ? "2%" : "0%"}
            </div>
            <div className="text-muted-foreground">
              Credit Card:{" "}
              {localSettings.creditCard.cashbackPercentage.toFixed(2)}%
            </div>
            <div className="mt-2 font-medium">
              Total Cashback:{" "}
              {(
                (localSettings.costcoMembershipEnabled ? 2 : 0) +
                localSettings.creditCard.cashbackPercentage
              ).toFixed(2)}
              %
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
