/**
 * User Credit Cards - Convex Functions
 *
 * CRUD operations for user credit cards stored in Convex.
 * Used by authenticated users; anonymous users continue to use localStorage.
 */

import { v } from "convex/values";

import type { MutationCtx, QueryCtx } from "./_generated/server";

import { mutation, query } from "./_generated/server";

// Helper to get authenticated user ID (throws if not authenticated)
const requireAuth = async (ctx: QueryCtx | MutationCtx): Promise<string> => {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Authentication required");
  }
  return identity.subject;
};

// Signup bonus schema for validation
const signupBonusValidator = v.object({
  enabled: v.boolean(),
  pointsBonus: v.number(),
  spendRequirement: v.number(),
});

/**
 * Get all credit cards for the authenticated user
 */
export const getUserCards = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuth(ctx);

    const cards = await ctx.db
      .query("userCreditCards")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

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
    const userId = await requireAuth(ctx);
    const now = Date.now();

    // Check if card already exists for this user
    const existing = await ctx.db
      .query("userCreditCards")
      .withIndex("by_user_and_card", (q) =>
        q.eq("userId", userId).eq("cardId", args.cardId),
      )
      .first();

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
      userId,
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
    issuer: v.optional(v.string()),
    name: v.optional(v.string()),
    pointsPerDollar: v.optional(v.number()),
    signupBonus: v.optional(signupBonusValidator),
    valuePerPoint: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);

    const card = await ctx.db
      .query("userCreditCards")
      .withIndex("by_user_and_card", (q) =>
        q.eq("userId", userId).eq("cardId", args.cardId),
      )
      .first();

    if (!card) {
      throw new Error(`Card ${args.cardId} not found`);
    }

    // Build update object with only provided fields
    const updates: Record<string, unknown> = { updatedAt: Date.now() };

    if (args.name !== undefined) updates.name = args.name;
    if (args.issuer !== undefined) updates.issuer = args.issuer;
    if (args.cardType !== undefined) updates.cardType = args.cardType;
    if (args.pointsPerDollar !== undefined)
      updates.pointsPerDollar = args.pointsPerDollar;
    if (args.valuePerPoint !== undefined)
      updates.valuePerPoint = args.valuePerPoint;
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
    const userId = await requireAuth(ctx);

    const card = await ctx.db
      .query("userCreditCards")
      .withIndex("by_user_and_card", (q) =>
        q.eq("userId", userId).eq("cardId", args.cardId),
      )
      .first();

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
    const userId = await requireAuth(ctx);

    const card = await ctx.db
      .query("userCreditCards")
      .withIndex("by_user_and_card", (q) =>
        q.eq("userId", userId).eq("cardId", args.cardId),
      )
      .first();

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
    const userId = await requireAuth(ctx);
    const now = Date.now();

    // Get existing cards to avoid duplicates
    const existingCards = await ctx.db
      .query("userCreditCards")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

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
        userId,
        valuePerPoint: card.valuePerPoint,
      });

      imported++;
    }

    return { imported, skipped, success: true };
  },
});
