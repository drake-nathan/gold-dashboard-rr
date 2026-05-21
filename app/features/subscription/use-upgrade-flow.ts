import { createContext, useContext } from "react";

export type UpgradeFlowSource =
  | "alerts_page"
  | "announcement_modal"
  | "header"
  | "mobile_menu"
  | "product_card";

export interface UpgradeFlowContextValue {
  open: (source: UpgradeFlowSource) => void;
}

export const UpgradeFlowContext = createContext<null | UpgradeFlowContextValue>(null);

export const useUpgradeFlow = (): UpgradeFlowContextValue => {
  const value = useContext(UpgradeFlowContext);
  if (!value) {
    throw new Error("useUpgradeFlow must be used inside <UpgradeFlowProvider />");
  }
  return value;
};
