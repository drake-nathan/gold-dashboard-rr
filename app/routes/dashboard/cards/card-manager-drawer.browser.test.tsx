import { expect, test, vi } from "vitest";
import { render } from "vitest-browser-react";

import { type CreditCard, DEFAULT_PRESET_CARDS } from "@/features/credit-cards/lib/credit-cards";

import { CardManagerDrawer } from "./card-manager-drawer";

// Helper to render CardManagerDrawer with default props
const renderCardManagerDrawer = async (
  cards: CreditCard[] = [...DEFAULT_PRESET_CARDS],
  onCardsChange = () => {},
  open = true,
  onResetAll = () => Promise.resolve(),
) => {
  return render(
    <CardManagerDrawer
      cards={cards}
      onCardsChange={onCardsChange}
      onClose={() => {}}
      onResetAll={onResetAll}
      open={open}
    />,
  );
};

// === RENDERING TESTS ===

test("renders drawer when open", async () => {
  const screen = await renderCardManagerDrawer();

  const title = screen.getByText("Manage Credit Cards");

  await expect.element(title).toBeInTheDocument();
});

test("renders all preset cards in list", async () => {
  const screen = await renderCardManagerDrawer();

  // Check that all preset cards are rendered
  for (const card of DEFAULT_PRESET_CARDS) {
    const cardElement = screen.getByText(card.name);

    await expect.element(cardElement).toBeInTheDocument();
  }
});

test("displays cashback percentages correctly", async () => {
  const screen = await renderCardManagerDrawer();

  // Chase Freedom Unlimited: 1.5 * 2.1 = 3.15%
  const chaseCashback = screen.getByText(/3\.15%/);

  await expect.element(chaseCashback).toBeInTheDocument();
});

test("shows 'Add Custom Card' button when not in edit mode", async () => {
  const screen = await renderCardManagerDrawer();

  const addButton = screen.getByRole("button", { name: /Add Custom Card/ });

  await expect.element(addButton).toBeInTheDocument();
});

test("shows 'Reset All' button", async () => {
  const screen = await renderCardManagerDrawer();

  const resetAllButton = screen.getByRole("button", { name: /Reset All/ });

  await expect.element(resetAllButton).toBeInTheDocument();
});

// === FORM INTERACTION TESTS ===

test("opens create form when clicking 'Add Custom Card'", async () => {
  const screen = await renderCardManagerDrawer();

  // Click "Add Custom Card"
  const addButton = screen.getByRole("button", { name: /Add Custom Card/ });
  await addButton.click();

  // Verify form is visible
  const formTitle = screen.getByText("Add New Card");

  await expect.element(formTitle).toBeInTheDocument();

  // Verify form fields are present
  const nameInput = screen.getByLabelText("Card Name");

  await expect.element(nameInput).toBeInTheDocument();
});

test("cancels create mode and hides form", async () => {
  const screen = await renderCardManagerDrawer();

  // Click "Add Custom Card"
  const addButton = screen.getByRole("button", { name: /Add Custom Card/ });
  await addButton.click();

  // Verify form is visible
  const form = screen.getByText("Add New Card");

  await expect.element(form).toBeInTheDocument();

  // Click cancel
  const cancelButton = screen.getByRole("button", { name: "Cancel" });
  await cancelButton.click();

  // Verify form is hidden
  await expect.element(form).not.toBeInTheDocument();

  // Verify "Add Custom Card" button is visible again
  const addButtonAgain = screen.getByRole("button", {
    name: /Add Custom Card/,
  });

  await expect.element(addButtonAgain).toBeInTheDocument();
});

// === CRUD OPERATIONS TESTS ===

test("adds a custom card with valid data", async () => {
  const onCardsChange = vi.fn();
  const screen = await renderCardManagerDrawer([...DEFAULT_PRESET_CARDS], onCardsChange);

  // Click "Add Custom Card"
  const addButton = screen.getByRole("button", { name: /Add Custom Card/ });
  await addButton.click();

  // Fill in form
  const nameInput = screen.getByLabelText("Card Name");
  await nameInput.fill("Test Custom Card");

  const issuerInput = screen.getByLabelText("Issuer (Optional)");
  await issuerInput.fill("Test Bank");

  const pointsInput = screen.getByLabelText("Points Per Dollar");
  await pointsInput.fill("2.5");

  const valueInput = screen.getByLabelText("Value Per Point (cents)");
  await valueInput.fill("1.5");

  // Submit form
  const submitButton = screen.getByRole("button", { name: "Add Card" });
  await submitButton.click();

  // Verify onCardsChange was called
  await expect.poll(() => onCardsChange).toHaveBeenCalled();

  const newCards = onCardsChange.mock.calls[0]?.[0] as CreditCard[];

  expect(newCards).toHaveLength(DEFAULT_PRESET_CARDS.length + 1);

  // Verify new card has correct values
  const newCard = newCards.at(-1)!;

  expect(newCard.name).toBe("Test Custom Card");
  expect(newCard.issuer).toBe("Test Bank");
  expect(newCard.pointsPerDollar).toBe(2.5);
  expect(newCard.valuePerPoint).toBe(0.015); // 1.5 cents = 0.015 dollars
  expect(newCard.isPreset).toBeFalsy();
});

test("deletes a custom card with confirmation", async () => {
  const customCard: CreditCard = {
    cardType: "cashback" as const,
    id: "custom-1",
    isCustomizable: false,
    isPreset: false,
    issuer: "Test Bank",
    name: "Test Card",
    pointsPerDollar: 2,
    valuePerPoint: 0.01,
  };

  const onCardsChange = vi.fn();
  const screen = await renderCardManagerDrawer(
    [...DEFAULT_PRESET_CARDS, customCard],
    onCardsChange,
  );

  // Find delete button for the custom card (last one in the list)
  const deleteButton = screen.getByLabelText("Delete card");
  await deleteButton.click();

  // Confirmation dialog should appear
  const confirmDialog = screen.getByText(/Are you sure you want to delete/);

  await expect.element(confirmDialog).toBeInTheDocument();

  // Click confirm (button with text "Delete")
  const confirmButton = screen.getByRole("button", { name: "Delete" });
  await confirmButton.click();

  // Verify onCardsChange was called without the deleted card
  await expect.poll(() => onCardsChange).toHaveBeenCalled();

  const updatedCards = onCardsChange.mock.calls[0]?.[0] as CreditCard[];

  expect(updatedCards).toHaveLength(DEFAULT_PRESET_CARDS.length);
  expect(updatedCards.find((c) => c.id === "custom-1")).toBeUndefined();
});

test("cancels delete when clicking cancel in confirmation dialog", async () => {
  const customCard: CreditCard = {
    cardType: "cashback" as const,
    id: "custom-1",
    isCustomizable: false,
    isPreset: false,
    issuer: "Test Bank",
    name: "Test Card",
    pointsPerDollar: 2,
    valuePerPoint: 0.01,
  };

  const onCardsChange = vi.fn();
  const screen = await renderCardManagerDrawer(
    [...DEFAULT_PRESET_CARDS, customCard],
    onCardsChange,
  );

  // Find delete button
  const deleteButton = screen.getByLabelText("Delete card");
  await deleteButton.click();

  // Click cancel
  const cancelButton = screen.getByRole("button", { name: "Cancel" });
  await cancelButton.click();

  // Verify onCardsChange was NOT called
  expect(onCardsChange).not.toHaveBeenCalled();
});

test("resets all cards to defaults", async () => {
  const customCard: CreditCard = {
    cardType: "cashback" as const,
    id: "custom-1",
    isCustomizable: false,
    isPreset: false,
    issuer: "Test Bank",
    name: "Test Card",
    pointsPerDollar: 2,
    valuePerPoint: 0.01,
  };

  const onResetAll = vi.fn().mockResolvedValue(undefined);
  const screen = await renderCardManagerDrawer(
    [...DEFAULT_PRESET_CARDS, customCard],
    () => {},
    true,
    onResetAll,
  );

  // Click "Reset All" button
  const resetAllButton = screen.getByRole("button", { name: /Reset All/ });
  await resetAllButton.click();

  // Confirmation dialog should appear
  const confirmDialog = screen.getByText(
    /This will delete all custom cards and reset all preset cards/,
  );

  await expect.element(confirmDialog).toBeInTheDocument();

  // Click confirm (button with text "Delete" for danger variant)
  const confirmButton = screen.getByRole("button", { name: "Delete" });
  await confirmButton.click();

  // Verify onResetAll was called
  await expect.poll(() => onResetAll).toHaveBeenCalled();
});

// === REAL-TIME CASHBACK CALCULATION TESTS ===

test("updates cashback calculation when form values change", async () => {
  const screen = await renderCardManagerDrawer();

  // Click "Add Custom Card"
  const addButton = screen.getByRole("button", { name: /Add Custom Card/ });
  await addButton.click();

  // Enter initial values: 1 points/$ @ 1¢/point = 1.00% cashback
  const pointsInput = screen.getByLabelText("Points Per Dollar");
  await pointsInput.fill("1");

  const valueInput = screen.getByLabelText("Value Per Point (cents)");
  await valueInput.fill("1");

  // Verify initial cashback
  let cashbackValue = screen.getByText("1.00%");

  await expect.element(cashbackValue).toBeInTheDocument();

  // Change to: 3 points/$ @ 2¢/point = 6.00% cashback
  await pointsInput.clear();
  await pointsInput.fill("3");

  await valueInput.clear();
  await valueInput.fill("2");

  // Verify updated cashback
  cashbackValue = screen.getByText("6.00%");

  await expect.element(cashbackValue).toBeInTheDocument();
});
