import { expect, test } from "vitest";

import {
  getInitialCashPositionDisplay,
  getPointEconomicsDisplay,
  getPostCashbackCashPositionDisplay,
} from "./product-card-metric-copy";

test("describes a positive immediate spread as out-of-pocket cost", () => {
  expect(getInitialCashPositionDisplay(1932.14)).toEqual({
    isGain: false,
    label: "Out-of-pocket cost:",
    tooltip:
      "Cash you still have tied up immediately after buying at Costco and selling to Pure, before any cashback or points.",
    value: "$1,932.14",
  });
});

test("describes a negative immediate spread as cash left over", () => {
  expect(getInitialCashPositionDisplay(-12.34)).toEqual({
    isGain: true,
    label: "Cash left over:",
    tooltip:
      "Collect Pure pays you more than your Costco purchase price before any cashback or points.",
    value: "$12.34",
  });
});

test("describes a negative post-cashback position as cash left over", () => {
  expect(getPostCashbackCashPositionDisplay(-7.89, true)).toEqual({
    isGain: true,
    label: "Cash left over after Costco 2%:",
    tooltip:
      "Your Costco Executive cashback already covers the initial spread, so you're ahead before valuing any points.",
    value: "$7.89",
  });
});

test("describes a non-member post-sale position without referencing Costco cashback", () => {
  expect(getPostCashbackCashPositionDisplay(7.89, false)).toEqual({
    isGain: false,
    label: "Out-of-pocket after sale:",
    tooltip:
      "Cash you still have tied up after selling to Pure, before valuing any credit card rewards or points.",
    value: "$7.89",
  });
});

test("describes a negative price per point as being paid for points", () => {
  expect(getPointEconomicsDisplay(-0.1323)).toEqual({
    isBeingPaid: true,
    label: "Paid per Point:",
    tooltip:
      "A negative cost per point means the cashback already more than covers the spread, so you're getting paid while earning points.",
    value: "13.23¢",
  });
});

test("describes a positive price per point as a normal cost", () => {
  expect(getPointEconomicsDisplay(0.0185)).toEqual({
    isBeingPaid: false,
    label: "Cost per Point:",
    tooltip:
      "Effective cash cost per point earned after selling to Pure and receiving Costco Executive cashback.",
    value: "1.85¢",
  });
});
