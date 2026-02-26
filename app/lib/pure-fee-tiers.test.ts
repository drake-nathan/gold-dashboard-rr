/**
 * @vitest-environment happy-dom
 */
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import {
  formatTierDisplay,
  getFeeRateForMetal,
  loadPureFeeTier,
  PURE_FEE_TIERS,
  savePureFeeTier,
} from "./pure-fee-tiers";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    clear: () => {
      store = {};
    },
    getItem: (key: string) => store[key] || null,
    removeItem: (key: string) => {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete store[key];
    },
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
  };
})();

beforeEach(() => {
  // Setup localStorage mock
  Object.defineProperty(window, "localStorage", {
    value: localStorageMock,
    writable: true,
  });
  localStorageMock.clear();
});

afterEach(() => {
  localStorageMock.clear();
});

// Test loadPureFeeTier
test("loadPureFeeTier: returns default tier when localStorage is empty", () => {
  const tierId = loadPureFeeTier();

  expect(tierId).toBe(PURE_FEE_TIERS[0].id);
});

test("loadPureFeeTier: returns stored tier when localStorage has valid data", () => {
  const testTierId = PURE_FEE_TIERS[1].id;
  localStorage.setItem(
    "dashboard-gold-pure-fee-tier",
    JSON.stringify({ selectedTierId: testTierId }),
  );

  const tierId = loadPureFeeTier();

  expect(tierId).toBe(testTierId);
});

test("loadPureFeeTier: returns default tier when localStorage has invalid JSON", () => {
  localStorage.setItem("dashboard-gold-pure-fee-tier", "invalid json");

  const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
  const tierId = loadPureFeeTier();

  expect(tierId).toBe(PURE_FEE_TIERS[0].id);
  expect(consoleSpy).toHaveBeenCalledWith(
    "Failed to load Pure fee tier from localStorage:",
    expect.any(Error),
  );

  consoleSpy.mockRestore();
});

test("loadPureFeeTier: returns default tier when stored tier ID doesn't exist", () => {
  localStorage.setItem(
    "dashboard-gold-pure-fee-tier",
    JSON.stringify({ selectedTierId: "non-existent-tier" }),
  );

  const tierId = loadPureFeeTier();

  expect(tierId).toBe(PURE_FEE_TIERS[0].id);
});

test("loadPureFeeTier: returns default tier when localStorage has invalid schema", () => {
  localStorage.setItem("dashboard-gold-pure-fee-tier", JSON.stringify({ wrongKey: "value" }));

  const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
  const tierId = loadPureFeeTier();

  expect(tierId).toBe(PURE_FEE_TIERS[0].id);
  expect(consoleSpy).toHaveBeenCalled();

  consoleSpy.mockRestore();
});

// Test savePureFeeTier
test("savePureFeeTier: successfully saves tier ID to localStorage", () => {
  const testTierId = PURE_FEE_TIERS[2].id;
  savePureFeeTier(testTierId);

  const stored = localStorage.getItem("dashboard-gold-pure-fee-tier");

  expect(stored).toBeTruthy();

  const parsed = JSON.parse(stored as string);

  expect(parsed.selectedTierId).toBe(testTierId);
});

test("savePureFeeTier: throws error when data fails validation", () => {
  const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

  // Mock setItem to throw
  const originalSetItem = localStorage.setItem;
  localStorage.setItem = vi.fn(() => {
    throw new Error("Storage error");
  });

  expect(() => {
    savePureFeeTier("test-id");
  }).toThrow();

  localStorage.setItem = originalSetItem;
  consoleSpy.mockRestore();
});

// Test getFeeRateForMetal
test("getFeeRateForMetal: returns bullion rate for gold (lowercase)", () => {
  const tier = PURE_FEE_TIERS[0];

  expect(getFeeRateForMetal(tier, "gold")).toBe(tier.bullionFeeRate);
});

test("getFeeRateForMetal: returns bullion rate for Gold (capitalized)", () => {
  const tier = PURE_FEE_TIERS[0];

  expect(getFeeRateForMetal(tier, "Gold")).toBe(tier.bullionFeeRate);
});

test("getFeeRateForMetal: returns silver/plat/palladium rate for silver", () => {
  const tier = PURE_FEE_TIERS[0];

  expect(getFeeRateForMetal(tier, "silver")).toBe(tier.silverPlatPalladiumFeeRate);
});

test("getFeeRateForMetal: returns silver/plat/palladium rate for Silver", () => {
  const tier = PURE_FEE_TIERS[0];

  expect(getFeeRateForMetal(tier, "Silver")).toBe(tier.silverPlatPalladiumFeeRate);
});

test("getFeeRateForMetal: returns silver/plat/palladium rate for Platinum", () => {
  const tier = PURE_FEE_TIERS[0];

  expect(getFeeRateForMetal(tier, "Platinum")).toBe(tier.silverPlatPalladiumFeeRate);
});

test("getFeeRateForMetal: returns silver/plat/palladium rate for Palladium", () => {
  const tier = PURE_FEE_TIERS[0];

  expect(getFeeRateForMetal(tier, "Palladium")).toBe(tier.silverPlatPalladiumFeeRate);
});

// Test formatTierDisplay
test("formatTierDisplay: formats tier with correct percentage rates", () => {
  const tier = PURE_FEE_TIERS[0]; // Pure Copper: 0.75% / 1%
  const display = formatTierDisplay(tier);

  expect(display).toBe("Pure Copper (0.75% / 1.00%)");
});

test("formatTierDisplay: formats tier with different rates correctly", () => {
  const tier = PURE_FEE_TIERS[2]; // Pure Gold: 0.625% / 0.83%
  const display = formatTierDisplay(tier);

  expect(display).toBe("Pure Gold (0.63% / 0.83%)"); // 0.00625 * 100 = 0.625, rounds to 0.63
});

test("formatTierDisplay: formats tier with 0.5% rate", () => {
  const tier = PURE_FEE_TIERS[3]; // Pure Plum: 0.5% / 0.65%
  const display = formatTierDisplay(tier);

  expect(display).toBe("Pure Plum (0.50% / 0.65%)");
});

// Test PURE_FEE_TIERS constants
test("pURE_FEE_TIERS: has correct number of tiers", () => {
  expect(PURE_FEE_TIERS).toHaveLength(4);
});

test("pURE_FEE_TIERS: all tiers have required properties", () => {
  PURE_FEE_TIERS.forEach((tier) => {
    expect(tier).toHaveProperty("id");
    expect(tier).toHaveProperty("name");
    expect(tier).toHaveProperty("bullionFeeRate");
    expect(tier).toHaveProperty("silverPlatPalladiumFeeRate");
    expect(tier).toHaveProperty("requiredQuarterlySales");
  });
});
