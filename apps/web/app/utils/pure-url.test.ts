import { expect, test } from "vitest";

import { generatePureProductUrl } from "./pure-url";

test("generatePureProductUrl: generates correct URL with valid SKU", () => {
  const sku = "1-oz-pamp-fortuna-gold-bar-9999-fine-in-assay000023";
  const expected =
    "https://www.collectpure.com/marketplace/product/1-oz-pamp-fortuna-gold-bar-9999-fine-in-assay000023";

  expect(generatePureProductUrl(sku)).toBe(expected);
});

test("generatePureProductUrl: handles empty SKU", () => {
  const sku = "";
  const expected = "https://www.collectpure.com/marketplace/product/";

  expect(generatePureProductUrl(sku)).toBe(expected);
});

test("generatePureProductUrl: handles SKU with special characters", () => {
  const sku = "test-sku-with-numbers-123-and-symbols";
  const expected =
    "https://www.collectpure.com/marketplace/product/test-sku-with-numbers-123-and-symbols";

  expect(generatePureProductUrl(sku)).toBe(expected);
});
