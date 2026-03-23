import { useLocalStorage } from "usehooks-ts";

import {
  PURE_FEE_TIERS,
  type PureFeeTierStorage,
  pureFeeTierStorageSchema,
} from "@/lib/pure-fee-tiers";

const STORAGE_KEY = "dashboard-gold-pure-fee-tier";

const defaultValue: PureFeeTierStorage = {
  selectedTierId: PURE_FEE_TIERS[0].id,
};

// Custom deserializer with Zod validation and tier existence check
// Defined outside component to maintain stable reference
const deserializer = (value: string): PureFeeTierStorage => {
  try {
    const parsed = JSON.parse(value);
    const validated = pureFeeTierStorageSchema.parse(parsed);

    // Verify the tier still exists
    const tierExists = PURE_FEE_TIERS.some((t) => t.id === validated.selectedTierId);
    if (!tierExists) {
      console.warn(`Pure fee tier "${validated.selectedTierId}" no longer exists, using default`);
      return defaultValue;
    }

    return validated;
  } catch (error) {
    console.error("Failed to load Pure fee tier from localStorage:", error);
    return defaultValue;
  }
};

// Custom serializer with Zod validation
// Defined outside component to maintain stable reference
const serializer = (value: PureFeeTierStorage): string => {
  try {
    const validated = pureFeeTierStorageSchema.parse(value);
    return JSON.stringify(validated);
  } catch (error) {
    console.error("Failed to save Pure fee tier to localStorage:", error);
    throw error;
  }
};

/**
 * Hook for managing Pure fee tier selection in localStorage using usehooks-ts
 *
 * Provides:
 * - Type-safe localStorage access with Zod validation
 * - Automatic syncing across tabs
 * - SSR-safe initialization
 * - Validation that selected tier exists in PURE_FEE_TIERS
 */
export const usePureFeeTierStorage = () => {
  const [storage, setStorage] = useLocalStorage<PureFeeTierStorage>(STORAGE_KEY, defaultValue, {
    deserializer,
    // Match SSR output on the first client render, then hydrate from localStorage.
    initializeWithValue: false,
    serializer,
  });

  return [storage, setStorage] as const;
};
