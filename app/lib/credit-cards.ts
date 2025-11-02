import { z } from "zod";

// Zod schema for credit card validation
export const creditCardSchema = z.object({
  id: z.string().min(1, "Card ID is required"),
  isCustomizable: z.boolean().default(false), // Whether preset values can be customized
  isPreset: z.boolean().default(false),
  issuer: z.string().optional(),
  name: z
    .string()
    .min(1, "Card name is required")
    .max(100, "Card name is too long"),
  pointsPerDollar: z
    .number()
    .min(0)
    .max(100, "Points per dollar must be between 0 and 100"),
  valuePerPoint: z
    .number()
    .min(0)
    .max(1, "Value per point must be between 0 and 1"),
});

export type CreditCard = z.infer<typeof creditCardSchema>;

// Schema for the array of credit cards
export const creditCardsArraySchema = z.array(creditCardSchema);

// Schema for local storage data
export const creditCardsStorageSchema = z.object({
  cards: creditCardsArraySchema,
  lastSelectedId: z.string().optional(),
});

export type CreditCardsStorage = z.infer<typeof creditCardsStorageSchema>;

// Default preset cards with the new structure
export const DEFAULT_PRESET_CARDS: CreditCard[] = [
  {
    id: "freedom-unlimited",
    isCustomizable: true,
    isPreset: true,
    issuer: "Chase",
    name: "Chase Freedom Unlimited",
    pointsPerDollar: 1.5,
    valuePerPoint: 0.021, // 2.1 cents per point
  },
  {
    id: "venture-x",
    isCustomizable: true,
    isPreset: true,
    issuer: "Capital One",
    name: "Capital One Venture X",
    pointsPerDollar: 2.0,
    valuePerPoint: 0.01, // 1 cent per point
  },
  {
    id: "robinhood",
    isCustomizable: true,
    isPreset: true,
    issuer: "Robinhood",
    name: "Robinhood Gold Card",
    pointsPerDollar: 3.0,
    valuePerPoint: 0.01, // 1 cent per point (flat cashback)
  },
];

// Calculate effective cashback percentage
export const calculateCashbackPercentage = (card: CreditCard): number => card.pointsPerDollar * card.valuePerPoint * 100;

// Local storage key
const STORAGE_KEY = "dashboard-gold-credit-cards";

// Load credit cards from local storage with validation
export const loadCreditCards = (): CreditCardsStorage => {
  if (typeof window === "undefined") {
    return {
      cards: DEFAULT_PRESET_CARDS,
      lastSelectedId: DEFAULT_PRESET_CARDS[0].id,
    };
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      // Return defaults if nothing stored
      return {
        cards: DEFAULT_PRESET_CARDS,
        lastSelectedId: DEFAULT_PRESET_CARDS[0].id,
      };
    }

    const parsed = JSON.parse(stored);
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
      return userModified || defaultCard;
    });

    return {
      cards: [...mergedPresets, ...customCards],
      lastSelectedId: validated.lastSelectedId || DEFAULT_PRESET_CARDS[0].id,
    };
  } catch (error) {
    console.error("Failed to load credit cards from localStorage:", error);
    // Return defaults on error
    return {
      cards: DEFAULT_PRESET_CARDS,
      lastSelectedId: DEFAULT_PRESET_CARDS[0].id,
    };
  }
};

// Save credit cards to local storage
export const saveCreditCards = (data: CreditCardsStorage): void => {
  if (typeof window === "undefined") return;

  try {
    const validated = creditCardsStorageSchema.parse(data);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(validated));
  } catch (error) {
    console.error("Failed to save credit cards to localStorage:", error);
    throw error;
  }
};

// Add a new custom card
export const addCustomCard = (card: Omit<CreditCard, "id" | "isPreset">): CreditCard => {
  const newCard: CreditCard = {
    ...card,
    id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    isCustomizable: false,
    isPreset: false,
  };

  const validated = creditCardSchema.parse(newCard);
  return validated;
};

// Update a card (custom or preset)
export const updateCard = (cards: CreditCard[], cardId: string, updates: Partial<Omit<CreditCard, "id" | "isPreset">>): CreditCard[] => cards.map((card) => {
    if (card.id !== cardId) return card;

    const updatedCard = { ...card, ...updates };
    creditCardSchema.parse(updatedCard); // Validate
    return updatedCard;
  });

// Delete a custom card (presets cannot be deleted)
export const deleteCard = (cards: CreditCard[], cardId: string): CreditCard[] => {
  const card = cards.find((c) => c.id === cardId);
  if (!card || card.isPreset) {
    throw new Error("Cannot delete preset cards");
  }
  return cards.filter((c) => c.id !== cardId);
};

// Reset a preset card to default values
export const resetPresetCard = (cards: CreditCard[], cardId: string): CreditCard[] => {
  const defaultCard = DEFAULT_PRESET_CARDS.find((c) => c.id === cardId);
  if (!defaultCard) {
    throw new Error("Card is not a preset");
  }

  return cards.map((card) => (card.id === cardId ? defaultCard : card));
};

// Sort cards alphabetically (presets first, then custom)
export const sortCards = (cards: CreditCard[]): CreditCard[] => {
  const presets = cards
    .filter((c) => c.isPreset)
    .sort((a, b) => a.name.localeCompare(b.name));
  const custom = cards
    .filter((c) => !c.isPreset)
    .sort((a, b) => a.name.localeCompare(b.name));
  return [...presets, ...custom];
};
