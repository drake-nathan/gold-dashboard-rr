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

export const runUserTokenIdentifierBackfill = migrations.runner([
  internal.migrations.backfillUserCreditCardsUserTokenIdentifier,
  internal.migrations.backfillUserSettingsUserTokenIdentifier,
  internal.migrations.backfillAlertsUserTokenIdentifier,
  internal.migrations.backfillAlertHistoryUserTokenIdentifier,
  internal.migrations.backfillAlertBatchesUserTokenIdentifier,
]);

export const run = migrations.runner();
