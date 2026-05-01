/**
 * User Settings - Convex Functions
 *
 * Manages user preferences and migration tracking.
 * Used by authenticated users; anonymous users continue to use localStorage.
 */

import { v } from "convex/values";

import {
  type MutationCtx,
  type QueryCtx,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { type AuthUserIdentity, requireAuthIdentity } from "./lib/authIdentity";
import { getUserAlertEntitlements } from "./subscriptionEntitlements";

const defaultDigestWeeklyDayOfWeek = 1; // Monday

const digestFrequencyValidator = v.union(v.literal("off"), v.literal("daily"), v.literal("weekly"));

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
      digestFrequency: settings.digestFrequency ?? "off",
      digestLastSentAt: settings.digestLastSentAt,
      digestWeeklyDayOfWeek: settings.digestWeeklyDayOfWeek ?? defaultDigestWeeklyDayOfWeek,
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
 * Update the authenticated user's market digest preferences. Pro-gated.
 */
export const updateDigestPreferences = mutation({
  args: {
    frequency: digestFrequencyValidator,
    weeklyDayOfWeek: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await requireAuthIdentity(ctx);
    const { alertEntitlements } = await getUserAlertEntitlements(ctx, identity);
    if (args.frequency !== "off" && !alertEntitlements.canSendAlerts) {
      throw new Error("Active Pro subscription required to enable the email digest");
    }

    if (
      args.weeklyDayOfWeek !== undefined &&
      (!Number.isInteger(args.weeklyDayOfWeek) ||
        args.weeklyDayOfWeek < 0 ||
        args.weeklyDayOfWeek > 6)
    ) {
      throw new Error("weeklyDayOfWeek must be an integer between 0 and 6");
    }

    const now = Date.now();
    const existing = await getSettingsByIdentity(ctx, identity);

    if (existing) {
      const updates: Record<string, unknown> = {
        digestFrequency: args.frequency,
        updatedAt: now,
        userId: identity.subject,
        userTokenIdentifier: identity.tokenIdentifier,
      };
      if (args.weeklyDayOfWeek !== undefined) {
        updates.digestWeeklyDayOfWeek = args.weeklyDayOfWeek;
      }
      await ctx.db.patch(existing._id, updates);
    } else {
      await ctx.db.insert("userSettings", {
        costcoMembershipEnabled: false,
        createdAt: now,
        digestFrequency: args.frequency,
        digestWeeklyDayOfWeek: args.weeklyDayOfWeek ?? defaultDigestWeeklyDayOfWeek,
        lastSelectedCardId: undefined,
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
 * Internal: list users with active digest subscriptions for the cron pipeline.
 * Returns userId/userTokenIdentifier pairs along with their preferences.
 */
export const listDigestSubscribers = internalQuery({
  args: {
    frequency: digestFrequencyValidator,
  },
  handler: async (ctx, args) => {
    const settings = await ctx.db
      .query("userSettings")
      .withIndex("by_digest_frequency", (q) => q.eq("digestFrequency", args.frequency))
      .collect();

    return settings.map((entry) => ({
      digestLastSentAt: entry.digestLastSentAt,
      digestWeeklyDayOfWeek: entry.digestWeeklyDayOfWeek ?? defaultDigestWeeklyDayOfWeek,
      userId: entry.userId,
      userTokenIdentifier: entry.userTokenIdentifier,
    }));
  },
});

/**
 * Internal: stamp the user's last digest send timestamp. Used to dedupe daily runs.
 */
export const markDigestSent = internalMutation({
  args: {
    sentAt: v.number(),
    userTokenIdentifier: v.string(),
  },
  handler: async (ctx, args) => {
    const settings = await ctx.db
      .query("userSettings")
      .withIndex("by_user_token_identifier", (q) =>
        q.eq("userTokenIdentifier", args.userTokenIdentifier),
      )
      .unique();
    if (!settings) {
      return { success: false };
    }
    await ctx.db.patch(settings._id, {
      digestLastSentAt: args.sentAt,
      updatedAt: args.sentAt,
    });
    return { success: true };
  },
});

/**
 * Internal: switch a user's digest frequency to "off". Used by the unsubscribe endpoint.
 */
export const disableDigestForUser = internalMutation({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const settingsByToken = await ctx.db
      .query("userSettings")
      .withIndex("by_user_token_identifier", (q) => q.eq("userTokenIdentifier", args.userId))
      .unique();

    let target = settingsByToken;
    target ??=
      (await ctx.db
        .query("userSettings")
        .filter((q) => q.eq(q.field("userId"), args.userId))
        .unique()) ?? null;

    if (!target) {
      return { changed: false, success: true };
    }

    if ((target.digestFrequency ?? "off") === "off") {
      return { changed: false, success: true };
    }

    const now = Date.now();
    await ctx.db.patch(target._id, {
      digestFrequency: "off",
      updatedAt: now,
    });
    return { changed: true, success: true };
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
