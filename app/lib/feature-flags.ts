import { createContext, useContext } from "react";

export const FEATURE_FLAGS = {
  PAID_FEATURES: "paid-features",
} as const;

export type FeatureFlagKey = (typeof FEATURE_FLAGS)[keyof typeof FEATURE_FLAGS];

export const ALL_FEATURE_FLAGS: FeatureFlagKey[] = Object.values(FEATURE_FLAGS);

export const FEATURE_FLAG_DEFAULTS: Record<FeatureFlagKey, boolean | string> = {
  [FEATURE_FLAGS.PAID_FEATURES]: true,
};

export type FeatureFlagValues = Partial<Record<FeatureFlagKey, boolean | string>>;

export const FeatureFlagContext = createContext<FeatureFlagValues>({});

export const useFeatureFlag = (key: FeatureFlagKey): boolean => {
  const flags = useContext(FeatureFlagContext);
  const value = flags[key] ?? FEATURE_FLAG_DEFAULTS[key];
  return Boolean(value);
};
