import type { api } from "convex/_generated/api";
import type { FunctionReturnType } from "convex/server";

import type { CreditCard } from "../lib/credit-cards";
import type { PureFeeTier } from "../lib/pure-fee-tiers";

export interface CalculatorSettings {
  costcoMembershipEnabled: boolean;
  creditCard: CreditCard;
  pureFeeTier: PureFeeTier;
}

type GetStats = FunctionReturnType<typeof api.dashboard.getStats>;
export type ProductCardData = GetStats["goldProducts"]["bestSpread"][number];
