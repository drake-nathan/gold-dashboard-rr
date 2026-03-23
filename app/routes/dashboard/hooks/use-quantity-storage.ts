import { useLocalStorage } from "usehooks-ts";
import { z } from "zod";

const STORAGE_KEY = "dashboard-gold-quantity";

export const DEFAULT_QUANTITY = 1;
export const MAX_QUANTITY = 10;

const quantityStorageSchema = z.object({
  quantity: z.number().int().min(1).max(MAX_QUANTITY),
});

type QuantityStorage = z.infer<typeof quantityStorageSchema>;

const defaultValue: QuantityStorage = {
  quantity: DEFAULT_QUANTITY,
};

// Custom deserializer with Zod validation
// Defined outside component to maintain stable reference
const deserializer = (value: string): QuantityStorage => {
  try {
    const parsed = JSON.parse(value);
    const validated = quantityStorageSchema.parse(parsed);
    return validated;
  } catch (error) {
    console.error("Failed to load quantity from localStorage:", error);
    return defaultValue;
  }
};

// Custom serializer with Zod validation
// Defined outside component to maintain stable reference
const serializer = (value: QuantityStorage): string => {
  try {
    const validated = quantityStorageSchema.parse(value);
    return JSON.stringify(validated);
  } catch (error) {
    console.error("Failed to save quantity to localStorage:", error);
    throw error;
  }
};

/**
 * Hook for managing quantity setting in localStorage using usehooks-ts
 *
 * Provides:
 * - Type-safe localStorage access with Zod validation
 * - Automatic syncing across tabs
 * - SSR-safe initialization
 * - Validates quantity is between 1 and MAX_QUANTITY
 */
export const useQuantityStorage = () => {
  const [storage, setStorage] = useLocalStorage<QuantityStorage>(STORAGE_KEY, defaultValue, {
    deserializer,
    // Match SSR output on the first client render, then hydrate from localStorage.
    initializeWithValue: false,
    serializer,
  });

  return [storage, setStorage] as const;
};
