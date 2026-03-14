import {
  Check,
  ChevronsUpDown,
  CreditCard as CreditCardIcon,
  Minus,
  Plus,
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
} from "@/components/ui/command";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MAX_QUANTITY } from "@/hooks/use-quantity-storage";
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

  const hasSignupBonus = calculatorSettings.creditCard.signupBonus?.enabled ?? false;

  return (
    <>
      {/* Quantity Selector */}
      <div className={cn("flex items-center gap-2", isMobile && "flex-col items-stretch")}>
        <Label className={isMobile ? "text-sm" : ""} htmlFor="quantity">
          Quantity:
        </Label>
        <div className="flex items-center gap-1">
          <Button
            className="size-8"
            disabled={calculatorSettings.quantity <= 1}
            onClick={() => {
              if (calculatorSettings.quantity > 1) {
                setCalculatorSettings({
                  ...calculatorSettings,
                  quantity: calculatorSettings.quantity - 1,
                });
              }
            }}
            size="icon"
            variant="outline"
          >
            <Minus className="size-4" />
          </Button>
          <span className="w-8 text-center font-medium tabular-nums">
            {calculatorSettings.quantity}
          </span>
          <Button
            className="size-8"
            disabled={calculatorSettings.quantity >= MAX_QUANTITY}
            onClick={() => {
              if (calculatorSettings.quantity < MAX_QUANTITY) {
                setCalculatorSettings({
                  ...calculatorSettings,
                  quantity: calculatorSettings.quantity + 1,
                });
              }
            }}
            size="icon"
            variant="outline"
          >
            <Plus className="size-4" />
          </Button>
        </div>
      </div>

      <Button
        className={isMobile ? "w-full" : ""}
        onClick={onOpenSettings}
        size={isMobile ? "default" : "default"}
        variant="outline"
      >
        <Settings className="size-4" />
        Settings
      </Button>

      <div className={cn("flex items-center gap-2", isMobile && "flex-col items-stretch")}>
        <Label className={isMobile ? "text-sm" : ""} htmlFor="credit-card">
          Credit Card:
        </Label>

        {isMobile ? (
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
                  {hasSignupBonus
                    ? `${calculateTotalCashbackPercentage(calculatorSettings.creditCard).toFixed(2)}% with SUB`
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
                          {card.issuer ? (
                            <span className="text-muted-foreground"> · {card.issuer}</span>
                          ) : null}
                        </span>
                        <span className="text-muted-foreground">{cashback.toFixed(2)}%</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <Button className="w-full" onClick={onOpenCardManager} size="sm" variant="outline">
              <CreditCardIcon className="size-4" />
              Manage Cards
            </Button>
          </div>
        ) : (
          // Desktop: Use searchable Combobox
          <Popover onOpenChange={setComboboxOpen} open={comboboxOpen}>
            <PopoverTrigger asChild>
              <Button
                aria-controls="credit-card"
                aria-expanded={comboboxOpen}
                className="min-w-80 justify-between rounded-md"
                id="credit-card"
                role="combobox"
                variant="outline"
              >
                <span className="flex items-center gap-2">
                  {calculatorSettings.creditCard.name} (
                  {hasSignupBonus
                    ? `${calculateTotalCashbackPercentage(calculatorSettings.creditCard).toFixed(2)}% with SUB`
                    : `${calculateCashbackPercentage(calculatorSettings.creditCard).toFixed(2)}%`}
                  )
                </span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-80 p-0">
              <Command>
                <CommandInput placeholder="Search by name or issuer..." />
                <CommandList className="max-h-80">
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
                              calculatorSettings.creditCard.id === card.id
                                ? "opacity-100"
                                : "opacity-0",
                            )}
                          />
                          <div className="flex-1">
                            <div className="font-medium">{card.name}</div>
                            {card.issuer ? (
                              <div className="text-xs text-muted-foreground">{card.issuer}</div>
                            ) : null}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {cashback.toFixed(2)}%
                          </div>
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </CommandList>
                <div className="border-t p-1">
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
                </div>
              </Command>
            </PopoverContent>
          </Popover>
        )}
      </div>
    </>
  );
};
