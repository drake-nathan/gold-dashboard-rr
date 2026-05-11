export interface MatchablePureProduct {
  manufacturer?: null | string;
  productName: string;
  productType?: null | string;
  weight: number;
}

const genericPhrases = new Set([
  "fine gold",
  "fine silver",
  "gold bar",
  "gold coin",
  "in assay",
  "new in",
  "silver bar",
  "silver coin",
  "troy ounce",
]);

export const normalizeProductName = (value: string) =>
  value
    .toLowerCase()
    .replaceAll(/[^\s\w]/gu, " ")
    .replaceAll(/\s+/gu, " ")
    .trim();

export const scorePureProductCandidate = (
  costcoNameLower: string,
  pureProduct: MatchablePureProduct,
  weightInOz: number,
): null | {
  details: string[];
  score: number;
  weightMatch: true;
} => {
  const weightDiff = Math.abs(pureProduct.weight - weightInOz);
  if (weightDiff > 0.05) {
    return null;
  }

  const pureNameLower = normalizeProductName(pureProduct.productName);
  let score = 100;
  const details = ["weight"];

  if (pureProduct.manufacturer) {
    const manufacturer = pureProduct.manufacturer.toLowerCase();
    const manufacturerVariants = [manufacturer, manufacturer.replaceAll(/\s+/gu, "")];

    if (manufacturerVariants.some((variant) => costcoNameLower.includes(variant))) {
      score += 100;
      details.push(`brand:${manufacturer}`);
    } else if (manufacturer.length > 3) {
      score -= 50;
    }
  }

  if (pureProduct.productType) {
    const productType = pureProduct.productType.toLowerCase();
    if (costcoNameLower.includes(productType)) {
      score += 50;
      details.push(`type:${productType}`);
    }
  }

  const pureWords = pureNameLower.split(/\s+/u);
  for (let index = 0; index < pureWords.length - 1; index++) {
    const twoWord = `${pureWords[index]} ${pureWords[index + 1]}`;
    const threeWord =
      index < pureWords.length - 2
        ? `${pureWords[index]} ${pureWords[index + 1]} ${pureWords[index + 2]}`
        : null;

    if (threeWord && !genericPhrases.has(threeWord) && costcoNameLower.includes(threeWord)) {
      score += 75;
      details.push(`phrase:"${threeWord}"`);
    } else if (!genericPhrases.has(twoWord) && costcoNameLower.includes(twoWord)) {
      score += 40;
      details.push(`phrase:"${twoWord}"`);
    }
  }

  if (score < 150) {
    return null;
  }

  return {
    details,
    score,
    weightMatch: true,
  };
};
