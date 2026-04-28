import type { ReactNode } from "react";

import { FeatureFlagContext, type FeatureFlagValues } from "@/lib/feature-flags";

export const FeatureFlagProvider = ({
  children,
  flags,
}: {
  children: ReactNode;
  flags: FeatureFlagValues;
}) => {
  return <FeatureFlagContext.Provider value={flags}>{children}</FeatureFlagContext.Provider>;
};
