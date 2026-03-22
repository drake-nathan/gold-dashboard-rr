/**
 * User Credit Cards - Convex Functions
 *
 * CRUD operations for user credit cards stored in Convex.
 * Used by authenticated users; anonymous users continue to use localStorage.
 */

import { v } from "convex/values";

import { CREDIT_CARD_PRESETS } from "../lib/credit-card-presets";
import { type MutationCtx, type QueryCtx, mutation, query } from "./_generated/server";
import { type AuthUserIdentity, requireAuthIdentity } from "./lib/authIdentity";

// Signup bonus schema for validation
const signupBonusValidator = v.object({
  enabled: v.boolean(),
  pointsBonus: v.number(),
  spendRequirement: v.number(),
});

const presetCardsById = new Map<string, (typeof CREDIT_CARD_PRESETS)[number]>(
  CREDIT_CARD_PRESETS.map((card) => [card.id, card]),
);

const getCardsByIdentity = async (ctx: MutationCtx | QueryCtx, identity: AuthUserIdentity) => {
  const cardsByToken = await ctx.db
    .query("userCreditCards")
    .withIndex("by_user_token_identifier", (q) =>
      q.eq("userTokenIdentifier", identity.tokenIdentifier),
    )
    .collect();

  const cardsBySubject =
    identity.subject === identity.tokenIdentifier
      ? []
      : await ctx.db
          .query("userCreditCards")
          .withIndex("by_user", (q) => q.eq("userId", identity.subject))
          .collect();

  const cards = new Map(cardsBySubject.map((card) => [card._id, card]));
  for (const card of cardsByToken) {
    cards.set(card._id, card);
  }

  return [...cards.values()];
};

const getCardByIdentityAndCardId = async (
  ctx: MutationCtx | QueryCtx,
  identity: AuthUserIdentity,
  cardId: string,
) => {
  const cardByToken = await ctx.db
    .query("userCreditCards")
    .withIndex("by_user_token_identifier_and_card", (q) =>
      q.eq("userTokenIdentifier", identity.tokenIdentifier).eq("cardId", cardId),
    )
    .unique();

  if (cardByToken) {
    return cardByToken;
  }

  if (identity.subject === identity.tokenIdentifier) {
    return null;
  }

  return ctx.db
    .query("userCreditCards")
    .withIndex("by_user_and_card", (q) => q.eq("userId", identity.subject).eq("cardId", cardId))
    .unique();
};

/**
 * Get all credit cards for the authenticated user
 */
export const getUserCards = query({
  args: {},
  handler: async (ctx) => {
    const identity = await requireAuthIdentity(ctx);
    const cards = await getCardsByIdentity(ctx, identity);

    return cards.map((card) => ({
      cardType: card.cardType,
      id: card.cardId,
      isCustomizable: card.isCustomizable,
      isPreset: card.isPreset,
      issuer: card.issuer,
      name: card.name,
      pointsPerDollar: card.pointsPerDollar,
      signupBonus: card.signupBonus,
      valuePerPoint: card.valuePerPoint,
    }));
  },
});

/**
 * Add a new credit card
 */
export const addCard = mutation({
  args: {
    cardId: v.string(),
    cardType: v.union(v.literal("cashback"), v.literal("travel")),
    isCustomizable: v.boolean(),
    isPreset: v.boolean(),
    issuer: v.optional(v.string()),
    name: v.string(),
    pointsPerDollar: v.number(),
    signupBonus: v.optional(signupBonusValidator),
    valuePerPoint: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await requireAuthIdentity(ctx);
    const now = Date.now();

    // Check if card already exists for this user
    const existing = await getCardByIdentityAndCardId(ctx, identity, args.cardId);

    if (existing) {
      throw new Error(`Card with ID ${args.cardId} already exists`);
    }

    await ctx.db.insert("userCreditCards", {
      cardId: args.cardId,
      cardType: args.cardType,
      createdAt: now,
      isCustomizable: args.isCustomizable,
      isPreset: args.isPreset,
      issuer: args.issuer,
      name: args.name,
      pointsPerDollar: args.pointsPerDollar,
      signupBonus: args.signupBonus,
      updatedAt: now,
      userId: identity.subject,
      userTokenIdentifier: identity.tokenIdentifier,
      valuePerPoint: args.valuePerPoint,
    });

    return { success: true };
  },
});

/**
 * Update an existing credit card
 */
export const updateCard = mutation({
  args: {
    cardId: v.string(),
    cardType: v.optional(v.union(v.literal("cashback"), v.literal("travel"))),
    // Creation-only fields for upsert (preset cards may not exist in DB yet)
    isCustomizable: v.optional(v.boolean()),
    isPreset: v.optional(v.boolean()),
    issuer: v.optional(v.string()),
    name: v.optional(v.string()),
    pointsPerDollar: v.optional(v.number()),
    signupBonus: v.optional(signupBonusValidator),
    valuePerPoint: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await requireAuthIdentity(ctx);
    const card = await getCardByIdentityAndCardId(ctx, identity, args.cardId);

    const now = Date.now();

    if (!card) {
      const presetDefaults = args.isPreset ? presetCardsById.get(args.cardId) : undefined;

      // Upsert: card doesn't exist yet (e.g., default preset being customized for first time).
      // Preset cards can be hydrated from canonical defaults; non-presets must provide creation data.
      if (!presetDefaults && (!args.name || !args.cardType)) {
        throw new Error(`Card ${args.cardId} not found`);
      }

      await ctx.db.insert("userCreditCards", {
        cardId: args.cardId,
        cardType: args.cardType ?? presetDefaults?.cardType ?? "cashback",
        createdAt: now,
        isCustomizable: args.isCustomizable ?? presetDefaults?.isCustomizable ?? false,
        isPreset: args.isPreset ?? presetDefaults?.isPreset ?? false,
        issuer: args.issuer ?? presetDefaults?.issuer,
        name: args.name ?? presetDefaults?.name ?? args.cardId,
        pointsPerDollar: args.pointsPerDollar ?? presetDefaults?.pointsPerDollar ?? 0,
        signupBonus: args.signupBonus,
        updatedAt: now,
        userId: identity.subject,
        userTokenIdentifier: identity.tokenIdentifier,
        valuePerPoint: args.valuePerPoint ?? presetDefaults?.valuePerPoint ?? 0,
      });

      return { success: true };
    }

    // Build update object with only provided fields
    const updates: Record<string, unknown> = {
      updatedAt: now,
      userId: identity.subject,
      userTokenIdentifier: identity.tokenIdentifier,
    };

    if (args.name !== undefined) updates.name = args.name;
    if (args.issuer !== undefined) updates.issuer = args.issuer;
    if (args.cardType !== undefined) updates.cardType = args.cardType;
    if (args.pointsPerDollar !== undefined) {
      updates.pointsPerDollar = args.pointsPerDollar;
    }
    if (args.valuePerPoint !== undefined) {
      updates.valuePerPoint = args.valuePerPoint;
    }
    if (args.signupBonus !== undefined) updates.signupBonus = args.signupBonus;

    await ctx.db.patch(card._id, updates);

    return { success: true };
  },
});

/**
 * Delete a credit card (only custom cards can be deleted)
 */
export const deleteCard = mutation({
  args: {
    cardId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await requireAuthIdentity(ctx);
    const card = await getCardByIdentityAndCardId(ctx, identity, args.cardId);

    if (!card) {
      throw new Error(`Card ${args.cardId} not found`);
    }

    if (card.isPreset) {
      throw new Error("Cannot delete preset cards");
    }

    await ctx.db.delete(card._id);

    return { success: true };
  },
});

/**
 * Reset a preset card to default values
 * This removes the user's customized version so defaults are used
 */
export const resetPresetCard = mutation({
  args: {
    cardId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await requireAuthIdentity(ctx);
    const card = await getCardByIdentityAndCardId(ctx, identity, args.cardId);

    if (!card) {
      throw new Error(`Card ${args.cardId} not found`);
    }

    if (!card.isPreset) {
      throw new Error("Can only reset preset cards");
    }

    // Delete the customized version - frontend will use defaults
    await ctx.db.delete(card._id);

    return { success: true };
  },
});

/**
 * Reset all cards to defaults
 * Deletes all user cards (custom and customized presets) so defaults take over
 */
export const resetAllCards = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await requireAuthIdentity(ctx);
    const cards = await getCardsByIdentity(ctx, identity);

    for (const card of cards) {
      await ctx.db.delete(card._id);
    }

    return { deleted: cards.length, success: true };
  },
});

/**
 * Bulk import cards from localStorage migration
 * Only imports cards that don't already exist
 */
export const migrateFromLocalStorage = mutation({
  args: {
    cards: v.array(
      v.object({
        cardId: v.string(),
        cardType: v.union(v.literal("cashback"), v.literal("travel")),
        isCustomizable: v.boolean(),
        isPreset: v.boolean(),
        issuer: v.optional(v.string()),
        name: v.string(),
        pointsPerDollar: v.number(),
        signupBonus: v.optional(signupBonusValidator),
        valuePerPoint: v.number(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const identity = await requireAuthIdentity(ctx);
    const now = Date.now();

    // Get existing cards to avoid duplicates
    const existingCards = await getCardsByIdentity(ctx, identity);

    const existingIds = new Set(existingCards.map((c) => c.cardId));

    let imported = 0;
    let skipped = 0;

    for (const card of args.cards) {
      if (existingIds.has(card.cardId)) {
        skipped++;
        continue;
      }

      await ctx.db.insert("userCreditCards", {
        cardId: card.cardId,
        cardType: card.cardType,
        createdAt: now,
        isCustomizable: card.isCustomizable,
        isPreset: card.isPreset,
        issuer: card.issuer,
        name: card.name,
        pointsPerDollar: card.pointsPerDollar,
        signupBonus: card.signupBonus,
        updatedAt: now,
        userId: identity.subject,
        userTokenIdentifier: identity.tokenIdentifier,
        valuePerPoint: card.valuePerPoint,
      });

      imported++;
    }

    return { imported, skipped, success: true };
  },
});
