import { formatCurrency } from "@/utils/format";

interface CashPositionDisplay {
  isGain: boolean;
  label: string;
  tooltip: string;
  value: string;
}

interface PointEconomicsDisplay {
  isBeingPaid: boolean;
  label: string;
  tooltip: string;
  value: string;
}

export const getInitialCashPositionDisplay = (amount: number): CashPositionDisplay => {
  if (amount < 0) {
    return {
      isGain: true,
      label: "Cash gain before rewards:",
      tooltip:
        "Pure payout already exceeds your Costco price before Costco cashback or card points.",
      value: formatCurrency(Math.abs(amount)),
    };
  }

  return {
    isGain: false,
    label: "Cash out-of-pocket:",
    tooltip: "Cash still tied up after the Pure sale, before Costco cashback or card points.",
    value: formatCurrency(amount),
  };
};

export const getPostCashbackCashPositionDisplay = (
  amount: number,
  costcoMembershipEnabled: boolean,
): CashPositionDisplay => {
  if (amount < 0) {
    if (!costcoMembershipEnabled) {
      return {
        isGain: true,
        label: "Net after sale:",
        tooltip:
          "Collect Pure already leaves you ahead on cash before valuing any credit card rewards or points.",
        value: formatCurrency(Math.abs(amount)),
      };
    }

    return {
      isGain: true,
      label: "Net after Executive 2%:",
      tooltip:
        "After the Pure sale and Costco Executive cashback, you're ahead on cash before valuing points.",
      value: formatCurrency(Math.abs(amount)),
    };
  }

  if (!costcoMembershipEnabled) {
    return {
      isGain: false,
      label: "Net cost after sale:",
      tooltip:
        "Cash you still have tied up after selling to Pure, before valuing any credit card rewards or points.",
      value: formatCurrency(amount),
    };
  }

  return {
    isGain: false,
    label: "Net cost after Executive 2%:",
    tooltip:
      "Cash still tied up after the Pure sale and Costco Executive cashback, before valuing points.",
    value: formatCurrency(amount),
  };
};

export const getPointEconomicsDisplay = (pricePerPoint: number): PointEconomicsDisplay => {
  if (pricePerPoint < 0) {
    return {
      isBeingPaid: true,
      label: "Cost per point:",
      tooltip:
        "A negative cost means the Pure sale plus Costco cashback already put you ahead before valuing points.",
      value: `-${(Math.abs(pricePerPoint) * 100).toFixed(2)}¢`,
    };
  }

  return {
    isBeingPaid: false,
    label: "Cost per point:",
    tooltip:
      "Effective cash cost for each point after the Pure sale and Costco Executive cashback.",
    value: `${(pricePerPoint * 100).toFixed(2)}¢`,
  };
};
