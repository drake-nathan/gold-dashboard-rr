import { z } from "zod";

// Zod schema for Pure fee tier validation
export const pureFeeTierSchema = z.object({
  bullionFeeRate: z.number().min(0).max(1), // Gold fee rate (e.g., 0.0075 for 0.75%)
  id: z.string().min(1, "Tier ID is required"),
  name: z.string().min(1, "Tier name is required"),
  requiredQuarterlySales: z.number().nullable(), // null for no requirement (Copper tier)
  silverPlatPalladiumFeeRate: z.number().min(0).max(1), // Silver/Plat/Palladium fee rate
});

export type PureFeeTier = z.infer<typeof pureFeeTierSchema>;

// Schema for local storage
export const pureFeeTierStorageSchema = z.object({
  selectedTierId: z.string(),
});

export type PureFeeTierStorage = z.infer<typeof pureFeeTierStorageSchema>;

// Default Pure fee tiers from the table
export const PURE_FEE_TIERS: PureFeeTier[] = [
  {
    bullionFeeRate: 0.0075, // 0.75%
    id: "pure-copper",
    name: "Pure Copper",
    requiredQuarterlySales: null,
    silverPlatPalladiumFeeRate: 0.01, // 1%
  },
  {
    bullionFeeRate: 0.007, // 0.7%
    id: "pure-silver",
    name: "Pure Silver",
    requiredQuarterlySales: 50000,
    silverPlatPalladiumFeeRate: 0.0093, // 0.93%
  },
  {
    bullionFeeRate: 0.00625, // 0.625%
    id: "pure-gold",
    name: "Pure Gold",
    requiredQuarterlySales: 300000,
    silverPlatPalladiumFeeRate: 0.0083, // 0.83%
  },
  {
    bullionFeeRate: 0.005, // 0.5%
    id: "pure-plum",
    name: "Pure Plum",
    requiredQuarterlySales: 1200000,
    silverPlatPalladiumFeeRate: 0.0065, // 0.65%
  },
];

// Local storage key
const STORAGE_KEY = "dashboard-gold-pure-fee-tier";

// Load selected tier from local storage
export const loadPureFeeTier = (): string => {
  if (typeof window === "undefined") {
    return PURE_FEE_TIERS[0].id;
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return PURE_FEE_TIERS[0].id;
    }

    const parsed = JSON.parse(stored);
    const validated = pureFeeTierStorageSchema.parse(parsed);

    // Verify the tier still exists
    const tierExists = PURE_FEE_TIERS.some(
      (t) => t.id === validated.selectedTierId,
    );
    if (!tierExists) {
      return PURE_FEE_TIERS[0].id;
    }

    return validated.selectedTierId;
  } catch (error) {
    console.error("Failed to load Pure fee tier from localStorage:", error);
    return PURE_FEE_TIERS[0].id;
  }
};

// Save selected tier to local storage
export const savePureFeeTier = (tierId: string): void => {
  if (typeof window === "undefined") return;

  try {
    const data: PureFeeTierStorage = { selectedTierId: tierId };
    const validated = pureFeeTierStorageSchema.parse(data);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(validated));
  } catch (error) {
    console.error("Failed to save Pure fee tier to localStorage:", error);
    throw error;
  }
};

// Get fee rate for a specific metal type
// Accepts both lowercase and capitalized metal types
export const getFeeRateForMetal = (
  tier: PureFeeTier,
  metalType: "gold" | "Gold" | "Palladium" | "Platinum" | "silver" | "Silver",
): number => {
  const normalized = metalType.toLowerCase();
  if (normalized === "gold") {
    return tier.bullionFeeRate;
  }
  return tier.silverPlatPalladiumFeeRate;
};

// Format tier display name with fee rates
export const formatTierDisplay = (tier: PureFeeTier): string => {
  const goldRate = (tier.bullionFeeRate * 100).toFixed(2);
  const silverRate = (tier.silverPlatPalladiumFeeRate * 100).toFixed(2);
  return `${tier.name} (${goldRate}% / ${silverRate}%)`;
};
