import { v } from "convex/values";

export const troyOuncesPerGram = 1 / 31.1034768;
export const categoryWeightToleranceOz = 0.05;

export const categoryWeightGroupValidator = v.union(
  v.literal("1oz"),
  v.literal("50g"),
  v.literal("100g"),
  v.literal("other"),
);

export type AlertCategoryWeightGroup = "1oz" | "50g" | "100g" | "other";

const categoryWeightGroupTargetsOz = {
  "1oz": 1,
  "50g": 50 * troyOuncesPerGram,
  "100g": 100 * troyOuncesPerGram,
} as const satisfies Record<Exclude<AlertCategoryWeightGroup, "other">, number>;

export const matchesCategoryWeightGroup = (
  weightGroup: AlertCategoryWeightGroup,
  estimatedWeightOz: number,
): boolean => {
  if (weightGroup === "other") {
    return Object.values(categoryWeightGroupTargetsOz).every(
      (targetWeight) => Math.abs(estimatedWeightOz - targetWeight) > categoryWeightToleranceOz,
    );
  }

  return (
    Math.abs(estimatedWeightOz - categoryWeightGroupTargetsOz[weightGroup]) <=
    categoryWeightToleranceOz
  );
};
