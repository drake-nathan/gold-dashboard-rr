import { expect, test } from "vitest";

import { formatCurrency, formatPercentage } from "./format";

// formatCurrency tests

test("formatCurrency formats positive integers", () => {
  expect(formatCurrency(100)).toBe("$100.00");
  expect(formatCurrency(1)).toBe("$1.00");
  expect(formatCurrency(1000)).toBe("$1,000.00");
});

test("formatCurrency formats positive decimals", () => {
  expect(formatCurrency(99.99)).toBe("$99.99");
  expect(formatCurrency(1.5)).toBe("$1.50");
  expect(formatCurrency(1234.56)).toBe("$1,234.56");
});

test("formatCurrency rounds to 2 decimal places", () => {
  expect(formatCurrency(99.999)).toBe("$100.00");
  expect(formatCurrency(99.995)).toBe("$100.00");
  expect(formatCurrency(99.994)).toBe("$99.99");
  expect(formatCurrency(1.234)).toBe("$1.23");
  expect(formatCurrency(1.235)).toBe("$1.24");
});

test("formatCurrency formats zero", () => {
  expect(formatCurrency(0)).toBe("$0.00");
  expect(formatCurrency(-0)).toBe("-$0.00"); // Intl.NumberFormat preserves -0
});

test("formatCurrency formats negative numbers", () => {
  expect(formatCurrency(-100)).toBe("-$100.00");
  expect(formatCurrency(-99.99)).toBe("-$99.99");
  expect(formatCurrency(-1234.56)).toBe("-$1,234.56");
});

test("formatCurrency formats large numbers with thousands separators", () => {
  expect(formatCurrency(1000000)).toBe("$1,000,000.00");
  expect(formatCurrency(1234567.89)).toBe("$1,234,567.89");
  expect(formatCurrency(999999.99)).toBe("$999,999.99");
});

test("formatCurrency formats very small positive numbers", () => {
  expect(formatCurrency(0.01)).toBe("$0.01");
  expect(formatCurrency(0.001)).toBe("$0.00");
  expect(formatCurrency(0.005)).toBe("$0.01");
  expect(formatCurrency(0.004)).toBe("$0.00");
});

test("formatCurrency formats very small negative numbers", () => {
  expect(formatCurrency(-0.01)).toBe("-$0.01");
  expect(formatCurrency(-0.001)).toBe("-$0.00"); // Rounds to -0.00
  expect(formatCurrency(-0.005)).toBe("-$0.01");
});

// formatPercentage tests

test("formatPercentage formats positive integers with default 2 decimals", () => {
  expect(formatPercentage(5)).toBe("5.00%");
  expect(formatPercentage(100)).toBe("100.00%");
  expect(formatPercentage(0)).toBe("0.00%");
});

test("formatPercentage formats decimals with default 2 decimals", () => {
  expect(formatPercentage(5.5)).toBe("5.50%");
  expect(formatPercentage(99.99)).toBe("99.99%");
  expect(formatPercentage(12.345)).toBe("12.35%");
});

test("formatPercentage formats negative percentages", () => {
  expect(formatPercentage(-5)).toBe("-5.00%");
  expect(formatPercentage(-12.34)).toBe("-12.34%");
  expect(formatPercentage(-0.5)).toBe("-0.50%");
});

test("formatPercentage respects custom decimal places", () => {
  expect(formatPercentage(5.12345, 0)).toBe("5%");
  expect(formatPercentage(5.12345, 1)).toBe("5.1%");
  expect(formatPercentage(5.12345, 2)).toBe("5.12%");
  expect(formatPercentage(5.12345, 3)).toBe("5.123%");
  expect(formatPercentage(5.12345, 4)).toBe("5.1235%"); // toFixed uses banker's rounding
});

test("formatPercentage rounds correctly with custom decimals", () => {
  expect(formatPercentage(5.555, 0)).toBe("6%");
  expect(formatPercentage(5.555, 1)).toBe("5.6%");
  expect(formatPercentage(5.555, 2)).toBe("5.55%"); // toFixed rounds 5.555 down
  expect(formatPercentage(5.556, 2)).toBe("5.56%"); // But 5.556 rounds up
  expect(formatPercentage(5.444, 1)).toBe("5.4%");
});

test("formatPercentage formats zero with various decimal places", () => {
  expect(formatPercentage(0, 0)).toBe("0%");
  expect(formatPercentage(0, 1)).toBe("0.0%");
  expect(formatPercentage(0, 2)).toBe("0.00%");
  expect(formatPercentage(0, 3)).toBe("0.000%");
});

test("formatPercentage formats very small percentages", () => {
  expect(formatPercentage(0.001, 2)).toBe("0.00%");
  expect(formatPercentage(0.001, 3)).toBe("0.001%");
  expect(formatPercentage(0.009, 2)).toBe("0.01%");
});

test("formatPercentage formats very large percentages", () => {
  expect(formatPercentage(1000)).toBe("1000.00%");
  expect(formatPercentage(9999.99)).toBe("9999.99%");
  expect(formatPercentage(12345.6789, 3)).toBe("12345.679%");
});
