import {
  Check,
  ChevronsUpDown,
  CreditCard as CreditCardIcon,
  Gift,
  Settings,
} from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import {
  calculateCashbackPercentage,
  calculateTotalCashbackPercentage,
  type CreditCard,
} from "@/lib/credit-cards";

interface CalculatorControlsProps {
  availableCards: CreditCard[];
  calculatorSettings: CalculatorSettings;
  isMobile?: boolean;
  onOpenCardManager: () => void;
  onOpenSettings: () => void;
  setCalculatorSettings: (value: CalculatorSettings) => void;
}

export const CalculatorControls = ({
  availableCards,
  calculatorSettings,
  isMobile = false,
  onOpenCardManager,
  onOpenSettings,
  setCalculatorSettings,
}: CalculatorControlsProps) => {
  const [comboboxOpen, setComboboxOpen] = useState(false);

  const hasSignupBonus =
    calculatorSettings.creditCard.signupBonus?.enabled ?? false;

  return (
    <>
      <Button
        className={isMobile ? "w-full" : ""}
        onClick={onOpenSettings}
        size={isMobile ? "default" : "default"}
        variant="outline"
      >
        <Settings className="size-4" />
        Settings
      </Button>

      <div
        className={cn(
          "flex items-center gap-2",
          isMobile && "flex-col items-stretch",
        )}
      >
        <div className="flex items-center gap-2">
          <Label className={isMobile ? "text-sm" : ""} htmlFor="credit-card">
            Credit Card:
          </Label>
          {hasSignupBonus && (
            <Badge className="gap-1" variant="default">
              <Gift className="size-3" />
              SUB Active
            </Badge>
          )}
        </div>

        {
          isMobile ?
            // Mobile: Use native Select for iOS compatibility
            <div className="space-y-2">
              <Select
                onValueChange={(cardId) => {
                  const card = availableCards.find((c) => c.id === cardId);
                  if (card) {
                    setCalculatorSettings({
                      ...calculatorSettings,
                      creditCard: card,
                    });
                  }
                }}
                value={calculatorSettings.creditCard.id}
              >
                <SelectTrigger className="w-full" id="credit-card">
                  <SelectValue>
                    {calculatorSettings.creditCard.name} (
                    {hasSignupBonus ?
                      `${calculateTotalCashbackPercentage(calculatorSettings.creditCard).toFixed(2)}% with SUB`
                    : `${calculateCashbackPercentage(calculatorSettings.creditCard).toFixed(2)}%`}
                    )
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {availableCards.map((card) => {
                    const cashback = calculateCashbackPercentage(card);
                    return (
                      <SelectItem key={card.id} value={card.id}>
                        <div className="flex items-center justify-between gap-2">
                          <span>
                            {card.name}
                            {card.issuer ?
                              <span className="text-muted-foreground">
                                {" "}
                                · {card.issuer}
                              </span>
                            : null}
                          </span>
                          <span className="text-muted-foreground">
                            {cashback.toFixed(2)}%
                          </span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <Button
                className="w-full"
                onClick={onOpenCardManager}
                size="sm"
                variant="outline"
              >
                <CreditCardIcon className="size-4" />
                Manage Cards
              </Button>
            </div>
            // Desktop: Use searchable Combobox
          : <Popover onOpenChange={setComboboxOpen} open={comboboxOpen}>
              <PopoverTrigger asChild>
                <Button
                  aria-expanded={comboboxOpen}
                  className="min-w-80 justify-between rounded-md"
                  id="credit-card"
                  role="combobox"
                  variant="outline"
                >
                  <span className="flex items-center gap-2">
                    {calculatorSettings.creditCard.name} (
                    {hasSignupBonus ?
                      `${calculateTotalCashbackPercentage(calculatorSettings.creditCard).toFixed(2)}% with SUB`
                    : `${calculateCashbackPercentage(calculatorSettings.creditCard).toFixed(2)}%`}
                    )
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-80 p-0">
                <Command>
                  <CommandInput placeholder="Search by name or issuer..." />
                  <CommandList>
                    <CommandEmpty>
                      <div className="py-6 text-center text-sm text-muted-foreground">
                        No cards found matching your search.
                      </div>
                    </CommandEmpty>
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
                                "size-4",
                                calculatorSettings.creditCard.id === card.id ?
                                  "opacity-100"
                                : "opacity-0",
                              )}
                            />
                            <div className="flex-1">
                              <div className="font-medium">{card.name}</div>
                              {card.issuer ?
                                <div className="text-xs text-muted-foreground">
                                  {card.issuer}
                                </div>
                              : null}
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
                        className="font-medium"
                        onSelect={() => {
                          setComboboxOpen(false);
                          onOpenCardManager();
                        }}
                      >
                        <CreditCardIcon className="size-4" />
                        Manage Cards
                      </CommandItem>
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

        }
      </div>
    </>
  );
};
