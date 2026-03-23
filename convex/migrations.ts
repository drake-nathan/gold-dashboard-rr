import { Migrations } from "@convex-dev/migrations";

import { components, internal } from "./_generated/api";
import type { DataModel, Doc } from "./_generated/dataModel";

export const migrations = new Migrations<DataModel>(components.migrations);

const getCanonicalTokenIdentifier = (legacyUserId: string): string => {
  const issuer = process.env.CLERK_JWT_ISSUER_DOMAIN;
  if (!issuer) {
    throw new Error("CLERK_JWT_ISSUER_DOMAIN is required to backfill userTokenIdentifier");
  }

  // Inference: Convex token identifiers are `${issuer}|${subject}` for a fixed JWT provider.
  return `${issuer}|${legacyUserId}`;
};

const getMissingUserTokenIdentifier = (
  doc: Pick<
    | Doc<"alertBatches">
    | Doc<"alertHistory">
    | Doc<"alerts">
    | Doc<"userCreditCards">
    | Doc<"userSettings">,
    "userId" | "userTokenIdentifier"
  >,
): null | string => {
  if (doc.userTokenIdentifier) {
    return null;
  }

  return getCanonicalTokenIdentifier(doc.userId);
};

export const backfillAlertBatchesUserTokenIdentifier = migrations.define({
  migrateOne: async (ctx, doc) => {
    const userTokenIdentifier = getMissingUserTokenIdentifier(doc);
    if (userTokenIdentifier) {
      await ctx.db.patch(doc._id, { userTokenIdentifier });
    }
  },
  table: "alertBatches",
});

export const backfillAlertHistoryUserTokenIdentifier = migrations.define({
  migrateOne: async (ctx, doc) => {
    const userTokenIdentifier = getMissingUserTokenIdentifier(doc);
    if (userTokenIdentifier) {
      await ctx.db.patch(doc._id, { userTokenIdentifier });
    }
  },
  table: "alertHistory",
});

export const backfillAlertsUserTokenIdentifier = migrations.define({
  migrateOne: async (ctx, doc) => {
    const userTokenIdentifier = getMissingUserTokenIdentifier(doc);
    if (userTokenIdentifier) {
      await ctx.db.patch(doc._id, { userTokenIdentifier });
    }
  },
  table: "alerts",
});

export const backfillUserCreditCardsUserTokenIdentifier = migrations.define({
  migrateOne: async (ctx, doc) => {
    const userTokenIdentifier = getMissingUserTokenIdentifier(doc);
    if (userTokenIdentifier) {
      await ctx.db.patch(doc._id, { userTokenIdentifier });
    }
  },
  table: "userCreditCards",
});

export const backfillUserSettingsUserTokenIdentifier = migrations.define({
  migrateOne: async (ctx, doc) => {
    const userTokenIdentifier = getMissingUserTokenIdentifier(doc);
    if (userTokenIdentifier) {
      await ctx.db.patch(doc._id, { userTokenIdentifier });
    }
  },
  table: "userSettings",
});

export const backfillAlertProductOptions = migrations.define({
  migrateOne: async (ctx, doc) => {
    const existing = await ctx.db
      .query("alertProductOptions")
      .withIndex("by_product_id", (q) => q.eq("productId", doc.productId))
      .unique();

    const nextOption = {
      metalType: doc.metalType,
      name: doc.name,
      productId: doc.productId,
    };

    if (!existing) {
      await ctx.db.insert("alertProductOptions", nextOption);
      return;
    }

    if (existing.metalType === nextOption.metalType && existing.name === nextOption.name) {
      return;
    }

    await ctx.db.patch(existing._id, nextOption);
  },
  table: "costcoProducts",
});

export const runUserTokenIdentifierBackfill = migrations.runner([
  internal.migrations.backfillUserCreditCardsUserTokenIdentifier,
  internal.migrations.backfillUserSettingsUserTokenIdentifier,
  internal.migrations.backfillAlertsUserTokenIdentifier,
  internal.migrations.backfillAlertHistoryUserTokenIdentifier,
  internal.migrations.backfillAlertBatchesUserTokenIdentifier,
]);

export const runAlertProductOptionsBackfill = migrations.runner(
  internal.migrations.backfillAlertProductOptions,
);

export const run = migrations.runner();
