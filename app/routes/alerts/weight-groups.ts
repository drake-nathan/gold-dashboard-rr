export const troyOuncesPerGram = 1 / 31.103_476_8;
export const categoryWeightToleranceOz = 0.05;

export const categoryWeightGroups = ["any", "1oz", "50g", "100g", "other"] as const;

export type CategoryWeightGroup = (typeof categoryWeightGroups)[number];
export type StoredCategoryWeightGroup = Exclude<CategoryWeightGroup, "any">;

const storedCategoryWeightGroups = categoryWeightGroups.filter(
  (group) => group !== "any",
) as StoredCategoryWeightGroup[];

const categoryWeightGroupTargetsOz = {
  "1oz": 1,
  "50g": 50 * troyOuncesPerGram,
  "100g": 100 * troyOuncesPerGram,
} as const satisfies Record<Exclude<StoredCategoryWeightGroup, "other">, number>;

export const categoryWeightGroupControlLabels: Record<CategoryWeightGroup, string> = {
  "1oz": "1 oz",
  "50g": "50 g",
  "100g": "100 g",
  any: "Any",
  other: "Other",
};

export const categoryWeightGroupFilterLabels: Record<StoredCategoryWeightGroup, string> = {
  "1oz": "1 oz",
  "50g": "50 g",
  "100g": "100 g",
  other: "Other weight",
};

export const inferCategoryWeightGroup = ({
  weight,
  weightGroup,
}: {
  weight?: number;
  weightGroup?: null | string;
}): CategoryWeightGroup => {
  if (isStoredCategoryWeightGroup(weightGroup)) {
    return weightGroup;
  }

  if (weight === undefined) {
    return "any";
  }

  for (const [group, targetWeight] of Object.entries(categoryWeightGroupTargetsOz)) {
    if (Math.abs(weight - targetWeight) <= categoryWeightToleranceOz) {
      return group as Exclude<StoredCategoryWeightGroup, "other">;
    }
  }

  return "other";
};

export const isStoredCategoryWeightGroup = (
  value: null | string | undefined,
): value is StoredCategoryWeightGroup => {
  return storedCategoryWeightGroups.includes(value as StoredCategoryWeightGroup);
};

export const formatStoredCategoryWeightGroup = (group: StoredCategoryWeightGroup): string => {
  return categoryWeightGroupFilterLabels[group];
};

export const formatLegacyWeightOz = (weight: number): string => {
  const rounded = Number.isInteger(weight)
    ? String(weight)
    : weight.toFixed(2).replace(/\.?0+$/, "");
  return `${rounded} oz`;
};
