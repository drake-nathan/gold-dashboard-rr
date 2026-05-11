import { expect, test } from "vitest";

import {
  getInitialCashPositionDisplay,
  getPointEconomicsDisplay,
  getPostCashbackCashPositionDisplay,
} from "./product-card-metric-copy";

test("describes a positive immediate spread as out-of-pocket cost", () => {
  expect(getInitialCashPositionDisplay(1932.14)).toStrictEqual({
    isGain: false,
    label: "Cash out-of-pocket:",
    tooltip: "Cash still tied up after the Pure sale, before Costco cashback or card points.",
    value: "$1,932.14",
  });
});

test("describes a negative immediate spread as a cash gain", () => {
  expect(getInitialCashPositionDisplay(-12.34)).toStrictEqual({
    isGain: true,
    label: "Cash gain before rewards:",
    tooltip: "Pure payout already exceeds your Costco price before Costco cashback or card points.",
    value: "$12.34",
  });
});

test("describes a negative post-cashback position as cash left over", () => {
  expect(getPostCashbackCashPositionDisplay(-7.89, true)).toStrictEqual({
    isGain: true,
    label: "Net after Executive 2%:",
    tooltip:
      "After the Pure sale and Costco Executive cashback, you're ahead on cash before valuing points.",
    value: "$7.89",
  });
});

test("describes a non-member post-sale position without referencing Costco cashback", () => {
  expect(getPostCashbackCashPositionDisplay(7.89, false)).toStrictEqual({
    isGain: false,
    label: "Net cost after sale:",
    tooltip:
      "Cash you still have tied up after selling to Pure, before valuing any credit card rewards or points.",
    value: "$7.89",
  });
});

test("describes a negative price per point as being paid for points", () => {
  expect(getPointEconomicsDisplay(-0.1323)).toStrictEqual({
    isBeingPaid: true,
    label: "Cost per point:",
    tooltip:
      "A negative cost means the Pure sale plus Costco cashback already put you ahead before valuing points.",
    value: "-13.23¢",
  });
});

test("describes a positive price per point as a normal cost", () => {
  expect(getPointEconomicsDisplay(0.0185)).toStrictEqual({
    isBeingPaid: false,
    label: "Cost per point:",
    tooltip:
      "Effective cash cost for each point after the Pure sale and Costco Executive cashback.",
    value: "1.85¢",
  });
});
