import { Check, ChevronsUpDown, Settings2 } from "lucide-react";
import { useState } from "react";

import type { CalculatorSettings } from "@/components/calculator-settings";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import {
  calculateCashbackPercentage,
  type CreditCard,
} from "@/lib/credit-cards";
import { cn } from "@/lib/utils";

interface CalculatorControlsProps {
  availableCards: CreditCard[];
  calculatorSettings: CalculatorSettings;
  onOpenCardManager: () => void;
  setCalculatorSettings: (value: CalculatorSettings) => void;
}

export const CalculatorControls = ({
  availableCards,
  calculatorSettings,
  onOpenCardManager,
  setCalculatorSettings,
}: CalculatorControlsProps) => {
  const [comboboxOpen, setComboboxOpen] = useState(false);

  return (
    <>
      <div className="flex items-center gap-2">
        <Label htmlFor="costco-exec">Costco Executive (2%):</Label>
        <Switch
          checked={calculatorSettings.costcoMembershipEnabled}
          id="costco-exec"
          onCheckedChange={(checked) => {
            setCalculatorSettings({
              ...calculatorSettings,
              costcoMembershipEnabled: checked,
            });
          }}
        />
      </div>

      <div className="flex items-center gap-2">
        <Label htmlFor="credit-card">Credit Card:</Label>
        <Popover onOpenChange={setComboboxOpen} open={comboboxOpen}>
          <PopoverTrigger asChild>
            <Button
              aria-expanded={comboboxOpen}
              className="min-w-80 justify-between"
              id="credit-card"
              role="combobox"
              variant="outline"
            >
              {calculatorSettings.creditCard.name} (
              {calculateCashbackPercentage(
                calculatorSettings.creditCard,
              ).toFixed(2)}
              %)
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-80 p-0">
            <Command>
              <CommandInput placeholder="Search cards..." />
              <CommandList>
                <CommandEmpty>No cards found.</CommandEmpty>
                <CommandGroup>
                  {availableCards.map((card) => {
                    const cashback = calculateCashbackPercentage(card);
                    return (
                      <CommandItem
                        key={card.id}
                        onSelect={() => {
                          setCalculatorSettings({
                            ...calculatorSettings,
                            creditCard: card,
                          });
                          setComboboxOpen(false);
                        }}
                        value={`${card.name} ${card.issuer || ""}`}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            calculatorSettings.creditCard.id === card.id ?
                              "opacity-100"
                            : "opacity-0",
                          )}
                        />
                        <div className="flex-1">
                          <div className="font-medium">{card.name}</div>
                          {card.issuer ? <div className="text-xs text-muted-foreground">
                              {card.issuer}
                            </div> : null}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {cashback.toFixed(2)}%
                        </div>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    onSelect={() => {
                      setComboboxOpen(false);
                      onOpenCardManager();
                    }}
                  >
                    <Settings2 className="mr-2 h-4 w-4" />
                    Manage Cards
                  </CommandItem>
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
    </>
  );
};
