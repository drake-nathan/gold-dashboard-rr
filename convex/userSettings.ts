/**
 * User Settings - Convex Functions
 *
 * Manages user preferences and migration tracking.
 * Used by authenticated users; anonymous users continue to use localStorage.
 */

import { v } from "convex/values";

import { type MutationCtx, type QueryCtx, mutation, query } from "./_generated/server";
import { type AuthUserIdentity, requireAuthIdentity } from "./lib/authIdentity";

const getSettingsByIdentity = async (ctx: MutationCtx | QueryCtx, identity: AuthUserIdentity) => {
  return ctx.db
    .query("userSettings")
    .withIndex("by_user_token_identifier", (q) =>
      q.eq("userTokenIdentifier", identity.tokenIdentifier),
    )
    .unique();
};

/**
 * Get settings for the authenticated user
 * Returns null if no settings exist yet
 */
export const getSettings = query({
  args: {},
  handler: async (ctx) => {
    const identity = await requireAuthIdentity(ctx);
    const settings = await getSettingsByIdentity(ctx, identity);

    if (!settings) {
      return null;
    }

    return {
      costcoMembershipEnabled: settings.costcoMembershipEnabled,
      lastSelectedCardId: settings.lastSelectedCardId,
      localStorageMigrated: settings.localStorageMigrated,
    };
  },
});

/**
 * Update user settings (creates if doesn't exist)
 */
export const updateSettings = mutation({
  args: {
    costcoMembershipEnabled: v.optional(v.boolean()),
    lastSelectedCardId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await requireAuthIdentity(ctx);
    const now = Date.now();
    const existing = await getSettingsByIdentity(ctx, identity);

    if (existing) {
      // Update existing settings
      const updates: Record<string, unknown> = {
        updatedAt: now,
        userId: identity.subject,
        userTokenIdentifier: identity.tokenIdentifier,
      };

      if (args.lastSelectedCardId !== undefined) {
        updates.lastSelectedCardId = args.lastSelectedCardId;
      }
      if (args.costcoMembershipEnabled !== undefined) {
        updates.costcoMembershipEnabled = args.costcoMembershipEnabled;
      }

      await ctx.db.patch(existing._id, updates);
    } else {
      // Create new settings
      await ctx.db.insert("userSettings", {
        costcoMembershipEnabled: args.costcoMembershipEnabled ?? false,
        createdAt: now,
        lastSelectedCardId: args.lastSelectedCardId,
        localStorageMigrated: false,
        updatedAt: now,
        userId: identity.subject,
        userTokenIdentifier: identity.tokenIdentifier,
      });
    }

    return { success: true };
  },
});

/**
 * Mark localStorage migration as complete
 */
export const markMigrationComplete = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await requireAuthIdentity(ctx);
    const now = Date.now();
    const existing = await getSettingsByIdentity(ctx, identity);

    if (existing) {
      await ctx.db.patch(existing._id, {
        localStorageMigrated: true,
        updatedAt: now,
        userId: identity.subject,
        userTokenIdentifier: identity.tokenIdentifier,
      });
    } else {
      // Create settings with migration marked complete
      await ctx.db.insert("userSettings", {
        costcoMembershipEnabled: false,
        createdAt: now,
        lastSelectedCardId: undefined,
        localStorageMigrated: true,
        updatedAt: now,
        userId: identity.subject,
        userTokenIdentifier: identity.tokenIdentifier,
      });
    }

    return { success: true };
  },
});

/**
 * Check if migration is needed (for determining if we should run migration)
 */
export const needsMigration = query({
  args: {},
  handler: async (ctx) => {
    const identity = await requireAuthIdentity(ctx);
    const settings = await getSettingsByIdentity(ctx, identity);

    // If no settings exist or migration not marked complete, migration is needed
    return !settings?.localStorageMigrated;
  },
});
