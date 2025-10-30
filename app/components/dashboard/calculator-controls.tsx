import {
  type CalculatorSettings,
  PRESET_CARDS,
} from "@/components/calculator-settings";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

interface CalculatorControlsProps {
  calculatorSettings: CalculatorSettings;
  setCalculatorSettings: (value: CalculatorSettings) => void;
}

export const CalculatorControls = ({
  calculatorSettings,
  setCalculatorSettings,
}: CalculatorControlsProps) => {
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
        <Select
          onValueChange={(value) => {
            const card = PRESET_CARDS.find((c) => c.id === value);
            if (card) {
              setCalculatorSettings({
                ...calculatorSettings,
                creditCard: card,
              });
            }
          }}
          value={calculatorSettings.creditCard.id}
        >
          <SelectTrigger className="min-w-80" id="credit-card">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PRESET_CARDS.filter((c) => c.id !== "custom").map((card) => (
              <SelectItem key={card.id} value={card.id}>
                {card.name} ({card.cashbackPercentage.toFixed(2)}%)
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </>
  );
};
