import { beforeEach, expect, test, vi } from "vitest";
import { render } from "vitest-browser-react";

import { DEFAULT_PRESET_CARDS } from "@/features/credit-cards/lib/credit-cards";

import { PURE_FEE_TIERS } from "../calculator/lib/pure-fee-tiers";
import type { CalculatorSettings } from "../calculator/types";
import { Filters } from "./filters";

let mockIsClient = true;
let mockMediaQuery = true;

vi.mock("usehooks-ts", async () => ({
  ...(await vi.importActual("usehooks-ts")),
  useIsClient: () => mockIsClient,
  useMediaQuery: () => mockMediaQuery,
}));

const baseSettings: CalculatorSettings = {
  costcoMembershipEnabled: true,
  creditCard: DEFAULT_PRESET_CARDS[0],
  pureFeeTier: PURE_FEE_TIERS[0],
  quantity: 1,
};

const renderFilters = async () =>
  render(
    <Filters
      availableCards={DEFAULT_PRESET_CARDS.slice(0, 2)}
      calculatorSettings={baseSettings}
      isClientReady
      metalFilter="all"
      onOpenCardManager={() => {}}
      onOpenSettings={() => {}}
      setCalculatorSettings={() => {}}
      setMetalFilter={() => {}}
      setShowOutOfStock={() => {}}
      setSortOption={() => {}}
      showOutOfStock
      sortOption="profit-desc"
    />,
  );

beforeEach(() => {
  mockIsClient = true;
  mockMediaQuery = true;
});

test("renders inline desktop filters when the desktop media query matches", async () => {
  const screen = await renderFilters();

  await expect.element(screen.getByText("Quantity:")).toBeInTheDocument();
  await expect.element(screen.getByLabelText("Show Out of Stock")).toBeInTheDocument();
  await expect.element(screen.getByRole("button", { name: /settings/i })).toBeInTheDocument();
});

test("opens the mobile sheet when the layout is mobile", async () => {
  mockMediaQuery = false;

  const screen = await renderFilters();

  const button = screen.getByRole("button", { name: /filters & calculator/i });
  await button.click();

  await expect
    .element(screen.getByRole("heading", { name: "Filters & Calculator" }))
    .toBeInTheDocument();
  await expect
    .element(screen.getByText("Adjust filters and calculator settings"))
    .toBeInTheDocument();
  await expect
    .element(screen.getByRole("heading", { exact: true, name: "Calculator" }))
    .toBeInTheDocument();
});

test("shows the calculator skeleton until client-ready data is available", async () => {
  const screen = await render(
    <Filters
      availableCards={DEFAULT_PRESET_CARDS.slice(0, 2)}
      calculatorSettings={baseSettings}
      isClientReady={false}
      metalFilter="all"
      onOpenCardManager={() => {}}
      onOpenSettings={() => {}}
      setCalculatorSettings={() => {}}
      setMetalFilter={() => {}}
      setShowOutOfStock={() => {}}
      setSortOption={() => {}}
      showOutOfStock
      sortOption="profit-desc"
    />,
  );

  expect(screen.container.querySelectorAll(".animate-pulse")).not.toHaveLength(0);
});
