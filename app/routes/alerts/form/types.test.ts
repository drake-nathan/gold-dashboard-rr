import { expect, test } from "vitest";

import {
  buildAlertPayload,
  defaultFormValues,
  type AlertFormValues,
  getFormValidationError,
} from "./types";

const withDefaults = (overrides: Partial<AlertFormValues>): AlertFormValues => ({
  ...defaultFormValues,
  ...overrides,
});

// --- getFormValidationError ---

test("threshold form requires above spot threshold", () => {
  expect(
    getFormValidationError(withDefaults({ aboveSpotThreshold: "", formType: "threshold" })),
  ).toBeTruthy();
  expect(
    getFormValidationError(withDefaults({ aboveSpotThreshold: "5", formType: "threshold" })),
  ).toBeFalsy();
});

test("sku form requires a product ID", () => {
  expect(getFormValidationError(withDefaults({ formType: "sku" }))).toBeTruthy();
  expect(
    getFormValidationError(withDefaults({ formType: "sku", skuProductId: "prod-1" })),
  ).toBeFalsy();
});

test("category form requires at least one filter", () => {
  expect(getFormValidationError(withDefaults({ formType: "category" }))).toBeFalsy();
  expect(
    getFormValidationError(withDefaults({ categoryMetal: "gold", formType: "category" })),
  ).toBeFalsy();
  expect(
    getFormValidationError(withDefaults({ categoryWeightGroup: "1oz", formType: "category" })),
  ).toBeFalsy();
  expect(getFormValidationError(withDefaults({ brand: "PAMP", formType: "category" }))).toBeFalsy();
});

// --- buildAlertPayload ---

test("threshold payload includes parsed above spot threshold", () => {
  const payload = buildAlertPayload(
    withDefaults({
      aboveSpotThreshold: "5.5",
      formType: "threshold",
      name: " Deal Watcher ",
    }),
  );

  expect(payload).toMatchObject({
    aboveSpotThreshold: 5.5,
    name: "Deal Watcher",
    triggerOn: "threshold_met",
    type: "threshold",
  });
});

test("sku payload always creates an in-stock alert", () => {
  const payload = buildAlertPayload(
    withDefaults({
      formType: "sku",
      name: "Gold Bar Alert",
      skuProductId: "prod-123",
    }),
  );

  expect(payload).toMatchObject({
    productId: "prod-123",
    triggerOn: "in_stock",
    type: "sku",
  });
});

test("category payload includes metal, grouped weight, and brand when set", () => {
  const payload = buildAlertPayload(
    withDefaults({
      brand: " PAMP ",
      categoryMetal: "gold",
      categoryWeightGroup: "1oz",
      formType: "category",
      name: "Gold Restock",
    }),
  );

  expect(payload).toMatchObject({
    brand: "PAMP",
    metalType: "gold",
    triggerOn: "in_stock",
    type: "category",
    weightGroup: "1oz",
  });
});

test("category payload omits empty optional fields", () => {
  const payload = buildAlertPayload(
    withDefaults({
      categoryMetal: "silver",
      formType: "category",
      name: "Silver Watch",
    }),
  );

  expect(payload.metalType).toBe("silver");
  expect(payload.weightGroup).toBeUndefined();
  expect(payload.brand).toBeUndefined();
});

test("threshold payload ignores non-numeric strings", () => {
  const payload = buildAlertPayload(
    withDefaults({
      aboveSpotThreshold: "abc",
      formType: "threshold",
      name: "Test",
    }),
  );

  expect(payload.aboveSpotThreshold).toBeUndefined();
});
