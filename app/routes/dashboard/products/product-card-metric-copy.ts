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
      label: "Cash left over:",
      tooltip:
        "Collect Pure pays you more than your Costco purchase price before any cashback or points.",
      value: formatCurrency(Math.abs(amount)),
    };
  }

  return {
    isGain: false,
    label: "Out-of-pocket cost:",
    tooltip:
      "Cash you still have tied up immediately after buying at Costco and selling to Pure, before any cashback or points.",
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
        label: "Cash left over after sale:",
        tooltip:
          "Collect Pure already leaves you ahead on cash before valuing any credit card rewards or points.",
        value: formatCurrency(Math.abs(amount)),
      };
    }

    return {
      isGain: true,
      label: "Cash left over after Costco 2%:",
      tooltip:
        "Your Costco Executive cashback already covers the initial spread, so you're ahead before valuing any points.",
      value: formatCurrency(Math.abs(amount)),
    };
  }

  if (!costcoMembershipEnabled) {
    return {
      isGain: false,
      label: "Out-of-pocket after sale:",
      tooltip:
        "Cash you still have tied up after selling to Pure, before valuing any credit card rewards or points.",
      value: formatCurrency(amount),
    };
  }

  return {
    isGain: false,
    label: "Out-of-pocket after Costco 2%:",
    tooltip:
      "Cash you still have tied up after selling to Pure and factoring in Costco Executive cashback.",
    value: formatCurrency(amount),
  };
};

export const getPointEconomicsDisplay = (pricePerPoint: number): PointEconomicsDisplay => {
  if (pricePerPoint < 0) {
    return {
      isBeingPaid: true,
      label: "Paid per Point:",
      tooltip:
        "A negative cost per point means the cashback already more than covers the spread, so you're getting paid while earning points.",
      value: `${(Math.abs(pricePerPoint) * 100).toFixed(2)}¢`,
    };
  }

  return {
    isBeingPaid: false,
    label: "Cost per Point:",
    tooltip:
      "Effective cash cost per point earned after selling to Pure and receiving Costco Executive cashback.",
    value: `${(pricePerPoint * 100).toFixed(2)}¢`,
  };
};
