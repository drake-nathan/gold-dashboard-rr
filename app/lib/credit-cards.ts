import { z } from "zod";

// Zod schema for signup bonus
export const signupBonusSchema = z.object({
  enabled: z.boolean().default(false),
  pointsBonus: z.number().min(0, "Points bonus must be 0 or greater").default(0),
  spendRequirement: z.number().min(0, "Spend requirement must be 0 or greater").default(0),
});

export type SignupBonus = z.infer<typeof signupBonusSchema>;

// Zod schema for credit card validation
export const creditCardSchema = z.object({
  cardType: z.enum(["cashback", "travel"]).default("travel"), // Type of rewards
  id: z.string().min(1, "Card ID is required"),
  isCustomizable: z.boolean().default(false), // Whether preset values can be customized
  isPreset: z.boolean().default(false),
  issuer: z.string().optional(),
  name: z.string().min(1, "Card name is required").max(100, "Card name is too long"),
  pointsPerDollar: z.number().min(0).max(100, "Points per dollar must be between 0 and 100"),
  signupBonus: signupBonusSchema.optional(),
  valuePerPoint: z.number().min(0).max(1, "Value per point must be between 0 and 1"),
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
// Costco card is first as it's the most relevant default for this dashboard
export const DEFAULT_PRESET_CARDS: CreditCard[] = [
  {
    cardType: "cashback",
    id: "costco-visa",
    isCustomizable: true,
    isPreset: true,
    issuer: "Citi",
    name: "Costco Anywhere Visa",
    pointsPerDollar: 2.0,
    valuePerPoint: 0.01, // 1 cent per point
  },
  {
    cardType: "travel",
    id: "freedom-unlimited",
    isCustomizable: true,
    isPreset: true,
    issuer: "Chase",
    name: "Freedom Unlimited",
    pointsPerDollar: 1.5,
    valuePerPoint: 0.021, // 2.1 cents per point
  },
  {
    cardType: "travel",
    id: "venture-x",
    isCustomizable: true,
    isPreset: true,
    issuer: "Capital One",
    name: "Capital One Venture X",
    pointsPerDollar: 2.0,
    valuePerPoint: 0.0185, // 1.85 cents per point
  },
  {
    cardType: "travel",
    id: "strata-premier",
    isCustomizable: true,
    isPreset: true,
    issuer: "Citi",
    name: "Strata Premier",
    pointsPerDollar: 1.0,
    valuePerPoint: 0.019, // 1.9 cents per point
  },
  {
    cardType: "cashback",
    id: "robinhood",
    isCustomizable: true,
    isPreset: true,
    issuer: "Robinhood",
    name: "Robinhood Gold Card",
    pointsPerDollar: 3.0,
    valuePerPoint: 0.01, // 1 cent per point (flat cashback)
  },
];

// Calculate base cashback percentage (without SUB)
export const calculateCashbackPercentage = (card: CreditCard): number =>
  card.pointsPerDollar * card.valuePerPoint * 100;

// Calculate SUB bonus cashback percentage
export const calculateSubBonusPercentage = (card: CreditCard): number => {
  if (
    !card.signupBonus?.enabled ||
    !card.signupBonus.pointsBonus ||
    !card.signupBonus.spendRequirement
  ) {
    return 0;
  }

  const bonusPointsPerDollar = card.signupBonus.pointsBonus / card.signupBonus.spendRequirement;
  return bonusPointsPerDollar * card.valuePerPoint * 100;
};

// Calculate total effective cashback percentage (base + SUB bonus)
export const calculateTotalCashbackPercentage = (card: CreditCard): number => {
  const baseCashback = calculateCashbackPercentage(card);
  const subBonus = calculateSubBonusPercentage(card);
  return baseCashback + subBonus;
};

// Local storage key (exported for use with useLocalStorage hook)
export const CREDIT_CARDS_STORAGE_KEY = "dashboard-gold-credit-cards";

// Load credit cards from local storage with validation
export const loadCreditCards = (): CreditCardsStorage => {
  if (typeof window === "undefined") {
    return {
      cards: DEFAULT_PRESET_CARDS,
      lastSelectedId: DEFAULT_PRESET_CARDS[0].id,
    };
  }

  try {
    const stored = localStorage.getItem(CREDIT_CARDS_STORAGE_KEY);
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
    const userModifiedPresets = validated.cards.filter((c) => presetIds.has(c.id));

    // Use user-modified preset values if they exist, otherwise use defaults
    const mergedPresets = DEFAULT_PRESET_CARDS.map((defaultCard) => {
      const userModified = userModifiedPresets.find((c) => c.id === defaultCard.id);
      return userModified ?? defaultCard;
    });

    return {
      cards: [...mergedPresets, ...customCards],
      lastSelectedId: validated.lastSelectedId ?? DEFAULT_PRESET_CARDS[0].id,
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
    localStorage.setItem(CREDIT_CARDS_STORAGE_KEY, JSON.stringify(validated));
  } catch (error) {
    console.error("Failed to save credit cards to localStorage:", error);
    throw error;
  }
};

// Clear all credit card data from local storage (resets to defaults)
export const clearCreditCards = (): void => {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem(CREDIT_CARDS_STORAGE_KEY);
  } catch (error) {
    console.error("Failed to clear credit cards from localStorage:", error);
    throw error;
  }
};

// Add a new custom card
export const addCustomCard = (
  card: Omit<CreditCard, "cardType" | "id" | "isPreset"> & {
    cardType?: "cashback" | "travel";
  },
): CreditCard => {
  const newCard: CreditCard = {
    ...card,
    cardType: card.cardType ?? "cashback", // Default to cashback if not specified
    id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
    isCustomizable: false,
    isPreset: false,
  };

  const validated = creditCardSchema.parse(newCard);
  return validated;
};

// Update a card (custom or preset)
export const updateCard = (
  cards: CreditCard[],
  cardId: string,
  updates: Partial<Omit<CreditCard, "id" | "isPreset">>,
): CreditCard[] =>
  cards.map((card) => {
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
  const presets = cards.filter((c) => c.isPreset).toSorted((a, b) => a.name.localeCompare(b.name));
  const custom = cards.filter((c) => !c.isPreset).toSorted((a, b) => a.name.localeCompare(b.name));
  return [...presets, ...custom];
};
