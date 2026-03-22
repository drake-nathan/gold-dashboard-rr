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

const patchUserTokenIdentifier = (
  doc: Pick<
    | Doc<"alertBatches">
    | Doc<"alertHistory">
    | Doc<"alerts">
    | Doc<"userCreditCards">
    | Doc<"userSettings">,
    "userId" | "userTokenIdentifier"
  >,
) => {
  if (doc.userTokenIdentifier) {
    return;
  }

  return { userTokenIdentifier: getCanonicalTokenIdentifier(doc.userId) };
};

export const backfillAlertBatchesUserTokenIdentifier = migrations.define({
  migrateOne: (_ctx, doc) => patchUserTokenIdentifier(doc),
  table: "alertBatches",
});

export const backfillAlertHistoryUserTokenIdentifier = migrations.define({
  migrateOne: (_ctx, doc) => patchUserTokenIdentifier(doc),
  table: "alertHistory",
});

export const backfillAlertsUserTokenIdentifier = migrations.define({
  migrateOne: (_ctx, doc) => patchUserTokenIdentifier(doc),
  table: "alerts",
});

export const backfillUserCreditCardsUserTokenIdentifier = migrations.define({
  migrateOne: (_ctx, doc) => patchUserTokenIdentifier(doc),
  table: "userCreditCards",
});

export const backfillUserSettingsUserTokenIdentifier = migrations.define({
  migrateOne: (_ctx, doc) => patchUserTokenIdentifier(doc),
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
