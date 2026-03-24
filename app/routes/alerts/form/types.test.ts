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

test("threshold form requires at least one threshold value", () => {
  expect(getFormValidationError(withDefaults({ formType: "threshold" }))).toBeTruthy();
  expect(
    getFormValidationError(withDefaults({ aboveSpotThreshold: "5", formType: "threshold" })),
  ).toBeFalsy();
  expect(
    getFormValidationError(withDefaults({ formType: "threshold", profitThreshold: "10" })),
  ).toBeFalsy();
});

test("sku form requires a product ID", () => {
  expect(getFormValidationError(withDefaults({ formType: "sku" }))).toBeTruthy();
  expect(
    getFormValidationError(withDefaults({ formType: "sku", skuProductId: "prod-1" })),
  ).toBeFalsy();
});

test("category form requires at least one filter", () => {
  expect(getFormValidationError(withDefaults({ formType: "category" }))).toBeTruthy();
  expect(
    getFormValidationError(withDefaults({ categoryMetal: "gold", formType: "category" })),
  ).toBeFalsy();
  expect(
    getFormValidationError(withDefaults({ categoryWeight: "1.0", formType: "category" })),
  ).toBeFalsy();
  expect(getFormValidationError(withDefaults({ brand: "PAMP", formType: "category" }))).toBeFalsy();
});

// --- buildAlertPayload ---

test("threshold payload includes parsed numeric thresholds", () => {
  const payload = buildAlertPayload(
    withDefaults({
      aboveSpotThreshold: "5.5",
      formType: "threshold",
      name: " Deal Watcher ",
      profitThreshold: "25",
    }),
  );

  expect(payload).toMatchObject({
    aboveSpotThreshold: 5.5,
    name: "Deal Watcher",
    profitThreshold: 25,
    triggerOn: "threshold_met",
    type: "threshold",
  });
});

test("sku payload includes product ID and trigger", () => {
  const payload = buildAlertPayload(
    withDefaults({
      formType: "sku",
      name: "Gold Bar Alert",
      skuProductId: "prod-123",
      skuTriggerOn: "price_drop",
    }),
  );

  expect(payload).toMatchObject({
    productId: "prod-123",
    triggerOn: "price_drop",
    type: "sku",
  });
});

test("category payload includes metal, weight, and brand when set", () => {
  const payload = buildAlertPayload(
    withDefaults({
      brand: " PAMP ",
      categoryMetal: "gold",
      categoryTriggerOn: "in_stock",
      categoryWeight: "1.0",
      formType: "category",
      name: "Gold Restock",
    }),
  );

  expect(payload).toMatchObject({
    brand: "PAMP",
    metalType: "gold",
    triggerOn: "in_stock",
    type: "category",
    weight: 1,
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
  expect(payload.weight).toBeUndefined();
  expect(payload.brand).toBeUndefined();
});

test("threshold payload ignores non-numeric strings", () => {
  const payload = buildAlertPayload(
    withDefaults({
      aboveSpotThreshold: "abc",
      formType: "threshold",
      name: "Test",
      profitThreshold: "",
    }),
  );

  expect(payload.aboveSpotThreshold).toBeUndefined();
  expect(payload.profitThreshold).toBeUndefined();
});
