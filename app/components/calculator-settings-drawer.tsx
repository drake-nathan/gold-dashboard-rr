import { ExternalLink, Info, Settings2 } from "lucide-react";

import type { CalculatorSettings } from "@/components/calculator-settings";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { calculateCashbackPercentage } from "@/lib/credit-cards";
import { formatTierDisplay, PURE_FEE_TIERS } from "@/lib/pure-fee-tiers";

interface CalculatorSettingsDrawerProps {
  calculatorSettings: CalculatorSettings;
  onOpenCardManager: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  setCalculatorSettings: (value: CalculatorSettings) => void;
}

export const CalculatorSettingsDrawer = ({
  calculatorSettings,
  onOpenCardManager,
  onOpenChange,
  open,
  setCalculatorSettings,
}: CalculatorSettingsDrawerProps) => {
  const totalCashbackPercentage =
    (calculatorSettings.costcoMembershipEnabled ? 2 : 0) +
    calculateCashbackPercentage(calculatorSettings.creditCard);

  return (
    <Sheet onOpenChange={onOpenChange} open={open}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Calculator Settings</SheetTitle>
          <SheetDescription>
            Configure your cashback and fee settings to see accurate profit calculations.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-4">
            <div className="space-y-4 pt-3 pb-3">
              {/* Costco Executive Membership */}
              <div>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 space-y-0.5">
                    <Label htmlFor="costco-exec-drawer">Costco Executive Membership</Label>
                    <p className="text-xs text-muted-foreground">
                      2% annual reward on eligible purchases
                    </p>
                  </div>
                  <Switch
                    checked={calculatorSettings.costcoMembershipEnabled}
                    id="costco-exec-drawer"
                    onCheckedChange={(checked) => {
                      setCalculatorSettings({
                        ...calculatorSettings,
                        costcoMembershipEnabled: checked,
                      });
                    }}
                  />
                </div>
              </div>

              <div className="border-t" />

              {/* Pure Fee Tier */}
              <div className="space-y-2">
                <div className="space-y-0.5">
                  <Label htmlFor="pure-fee-tier-drawer">Pure Fee Tier</Label>
                  <p className="text-xs text-muted-foreground">
                    Select based on your quarterly sales volume.{" "}
                    <a
                      className="text-primary underline-offset-4 hover:underline"
                      href="https://www.collectpure.com/blog/pure-selling-tiers"
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      Learn more <ExternalLink className="inline h-3 w-3" />
                    </a>
                  </p>
                </div>
                <Select
                  onValueChange={(tierId) => {
                    const tier = PURE_FEE_TIERS.find((t) => t.id === tierId);
                    if (tier) {
                      setCalculatorSettings({
                        ...calculatorSettings,
                        pureFeeTier: tier,
                      });
                    }
                  }}
                  value={calculatorSettings.pureFeeTier.id}
                >
                  <SelectTrigger id="pure-fee-tier-drawer">
                    <SelectValue>{formatTierDisplay(calculatorSettings.pureFeeTier)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {PURE_FEE_TIERS.map((tier) => (
                      <SelectItem key={tier.id} value={tier.id}>
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium">{formatTierDisplay(tier)}</span>
                          {tier.requiredQuarterlySales !== null && (
                            <span className="text-xs text-muted-foreground">
                              Requires ${tier.requiredQuarterlySales.toLocaleString()}+ quarterly
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="border-t" />

              {/* Info Section */}
              <div className="space-y-2">
                <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <p>
                      <strong className="text-foreground">Profit calculations</strong> include your
                      total cashback minus Pure&apos;s selling fees for your selected tier.
                    </p>
                    <p>
                      These calculations assume you&apos;re selling at Pure&apos;s current bid
                      prices and don&apos;t include shipping costs.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Summary Section - Sticky at bottom */}
          <div className="border-t bg-muted/30 px-4 py-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <div className="mb-1.5 text-sm font-medium text-muted-foreground">
                  Your Total Cashback
                </div>
                <div className="flex items-baseline gap-3">
                  <span className="text-3xl leading-none font-bold text-green-600 dark:text-green-400">
                    {totalCashbackPercentage.toFixed(2)}%
                  </span>
                  <div className="text-xs text-muted-foreground">
                    <span>
                      {calculatorSettings.costcoMembershipEnabled ? "2%" : "0%"} Executive +{" "}
                    </span>
                    <span>
                      {calculateCashbackPercentage(calculatorSettings.creditCard).toFixed(2)}% Card
                    </span>
                  </div>
                </div>
              </div>
              <Button
                className="shrink-0"
                onClick={() => {
                  onOpenChange(false);
                  onOpenCardManager();
                }}
                size="sm"
                variant="outline"
              >
                <Settings2 className="mr-1.5 h-3.5 w-3.5" />
                Cards
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
