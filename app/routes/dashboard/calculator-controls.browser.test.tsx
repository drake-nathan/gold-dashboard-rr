import { expect, test, vi } from "vitest";
import { render } from "vitest-browser-react";

import type { CalculatorSettings } from "@/types/calculator";
import { DEFAULT_PRESET_CARDS } from "@/lib/credit-cards";
import { PURE_FEE_TIERS } from "@/lib/pure-fee-tiers";

import { CalculatorControls } from "./calculator-controls";

const availableCards = DEFAULT_PRESET_CARDS.slice(0, 2);

const baseSettings: CalculatorSettings = {
  costcoMembershipEnabled: true,
  creditCard: availableCards[0],
  pureFeeTier: PURE_FEE_TIERS[0],
  quantity: 1,
};

test("increments quantity from the plus button", async () => {
  const setCalculatorSettings = vi.fn();
  const screen = await render(
    <CalculatorControls
      availableCards={availableCards}
      calculatorSettings={baseSettings}
      onOpenCardManager={() => {}}
      onOpenSettings={() => {}}
      setCalculatorSettings={setCalculatorSettings}
    />,
  );

  const buttons = screen.container.querySelectorAll("button");
  buttons[1].click();

  expect(setCalculatorSettings).toHaveBeenCalledWith({
    ...baseSettings,
    quantity: 2,
  });
});

test("opens settings from the settings button", async () => {
  const onOpenSettings = vi.fn();
  const screen = await render(
    <CalculatorControls
      availableCards={availableCards}
      calculatorSettings={baseSettings}
      onOpenCardManager={() => {}}
      onOpenSettings={onOpenSettings}
      setCalculatorSettings={() => {}}
    />,
  );

  await screen.getByRole("button", { name: /settings/i }).click();

  expect(onOpenSettings).toHaveBeenCalled();
});

test("selects a different card from the desktop combobox", async () => {
  const setCalculatorSettings = vi.fn();
  const screen = await render(
    <CalculatorControls
      availableCards={availableCards}
      calculatorSettings={baseSettings}
      onOpenCardManager={() => {}}
      onOpenSettings={() => {}}
      setCalculatorSettings={setCalculatorSettings}
    />,
  );

  await screen.getByRole("combobox").click();
  await screen.getByText(availableCards[1].name).click();

  expect(setCalculatorSettings).toHaveBeenCalledWith({
    ...baseSettings,
    creditCard: availableCards[1],
  });
});
