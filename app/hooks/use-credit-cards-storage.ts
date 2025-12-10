import { useLocalStorage } from "usehooks-ts";

import {
  CREDIT_CARDS_STORAGE_KEY,
  type CreditCardsStorage,
  creditCardsStorageSchema,
  DEFAULT_PRESET_CARDS,
} from "@/lib/credit-cards";

const defaultValue: CreditCardsStorage = {
  cards: DEFAULT_PRESET_CARDS,
  lastSelectedId: DEFAULT_PRESET_CARDS[0].id,
};

// Custom deserializer with Zod validation and preset merging
// Defined outside component to maintain stable reference
const deserializer = (value: string): CreditCardsStorage => {
  try {
    const parsed = JSON.parse(value);
    const validated = creditCardsStorageSchema.parse(parsed);

    // Merge with presets to ensure they're always available
    const presetIds = new Set(DEFAULT_PRESET_CARDS.map((c) => c.id));
    const customCards = validated.cards.filter((c) => !presetIds.has(c.id));
    const userModifiedPresets = validated.cards.filter((c) =>
      presetIds.has(c.id),
    );

    // Use user-modified preset values if they exist, otherwise use defaults
    const mergedPresets = DEFAULT_PRESET_CARDS.map((defaultCard) => {
      const userModified = userModifiedPresets.find(
        (c) => c.id === defaultCard.id,
      );
      return userModified ?? defaultCard;
    });

    return {
      cards: [...mergedPresets, ...customCards],
      lastSelectedId: validated.lastSelectedId || DEFAULT_PRESET_CARDS[0].id,
    };
  } catch (error) {
    console.error("Failed to load credit cards from localStorage:", error);
    return defaultValue;
  }
};

// Custom serializer with Zod validation
// Defined outside component to maintain stable reference
const serializer = (value: CreditCardsStorage): string => {
  try {
    const validated = creditCardsStorageSchema.parse(value);
    return JSON.stringify(validated);
  } catch (error) {
    console.error("Failed to save credit cards to localStorage:", error);
    throw error;
  }
};

/**
 * Hook for managing credit cards in localStorage using usehooks-ts
 *
 * Provides:
 * - Type-safe localStorage access with Zod validation
 * - Automatic syncing across tabs
 * - SSR-safe initialization
 * - Preset card merging (ensures presets are always available)
 */
export const useCreditCardsStorage = () => {
  const [storage, setStorage] = useLocalStorage<CreditCardsStorage>(
    CREDIT_CARDS_STORAGE_KEY,
    defaultValue,
    {
      deserializer,
      // Defer localStorage read until after hydration to prevent SSR mismatch
      initializeWithValue: false,
      serializer,
    },
  );

  return [storage, setStorage] as const;
};
