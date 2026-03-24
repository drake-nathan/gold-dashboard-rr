import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import type { ActionCtx, MutationCtx, QueryCtx } from "../_generated/server";
import { getUserAlertEntitlements } from "../subscriptionEntitlements";
import {
  type AlertHistoryDoc,
  alertBatchMaxSendAttempts,
  alertBatchMissingConfigDeferMinutes,
  defaultPendingBatchProcessLimit,
  formatAlertDigest,
  getAlertBatchRetryDelayMs,
  getAlertDeliveryConfig,
  getPendingAlertHistoryForBatch,
  getStoredIdentity,
  getStoredUserKey,
  resolveAlertRecipientEmail,
  sendAlertEmail,
  buildUnsubscribeUrl,
} from "./core";

export const listPendingAlertBatchesHelper = async (
  ctx: QueryCtx,
  args: {
    limit?: number;
    now?: number;
  },
) => {
  const now = args.now ?? Date.now();
  const limit = args.limit ?? defaultPendingBatchProcessLimit;
  if (limit <= 0) {
    throw new Error("limit must be greater than 0");
  }

  return ctx.db
    .query("alertBatches")
    .withIndex("by_pending", (q) => q.eq("sent", false).lte("scheduledFor", now))
    .order("asc")
    .take(limit);
};

export const markAlertBatchProcessedHelper = async (
  ctx: MutationCtx,
  args: {
    batchId: Id<"alertBatches">;
    errorMessage?: string;
    processedAt: number;
    status: "sent" | "skipped";
  },
) => {
  const batch = await ctx.db.get(args.batchId);
  if (!batch) {
    return { alreadyProcessed: false, historyUpdated: 0, success: false };
  }

  if (batch.sent) {
    return { alreadyProcessed: true, historyUpdated: 0, success: true };
  }

  const matchedHistory = await getPendingAlertHistoryForBatch(ctx, batch);
  const shouldMarkSent = args.status === "sent";

  await Promise.all(
    matchedHistory.map((history: AlertHistoryDoc) =>
      ctx.db.patch(history._id, {
        notificationError: shouldMarkSent
          ? undefined
          : (args.errorMessage ?? "Alert delivery skipped"),
        notificationSent: shouldMarkSent,
      }),
    ),
  );

  await ctx.db.patch(batch._id, {
    lastAttemptedAt: args.processedAt,
    lastAttemptError: shouldMarkSent ? undefined : (args.errorMessage ?? "Alert delivery skipped"),
    sent: true,
    sentAt: args.processedAt,
    terminalFailureAt: shouldMarkSent ? undefined : args.processedAt,
  });

  return {
    alreadyProcessed: false,
    historyUpdated: matchedHistory.length,
    success: true,
  };
};

export const deferAlertBatchForMissingConfigHelper = async (
  ctx: MutationCtx,
  args: {
    batchId: Id<"alertBatches">;
    deferredAt: number;
  },
) => {
  const batch = await ctx.db.get(args.batchId);
  if (!batch) {
    return { deferredUntil: null, success: false };
  }

  if (batch.sent) {
    return { deferredUntil: null, success: true };
  }

  const deferMs = alertBatchMissingConfigDeferMinutes * 60 * 1000;
  const deferredUntil = Math.max(batch.scheduledFor, args.deferredAt + deferMs);
  await ctx.db.patch(batch._id, {
    lastAttemptedAt: args.deferredAt,
    lastAttemptError: "Alert delivery deferred: missing RESEND_API_KEY or RESEND_FROM_EMAIL",
    scheduledFor: deferredUntil,
  });

  return { deferredUntil, success: true };
};

export const recordAlertBatchSendFailureHelper = async (
  ctx: MutationCtx,
  args: {
    batchId: Id<"alertBatches">;
    errorMessage: string;
    failedAt: number;
  },
) => {
  const batch = await ctx.db.get(args.batchId);
  if (!batch) {
    return { gaveUp: false, nextScheduledFor: null, sendAttempts: 0, success: false };
  }

  if (batch.sent) {
    return {
      gaveUp: false,
      nextScheduledFor: null,
      sendAttempts: batch.sendAttempts ?? 0,
      success: true,
    };
  }

  const sendAttempts = (batch.sendAttempts ?? 0) + 1;
  if (sendAttempts >= alertBatchMaxSendAttempts) {
    const finalError = `Alert delivery failed after ${sendAttempts} attempts: ${args.errorMessage}`;
    const matchedHistory = await getPendingAlertHistoryForBatch(ctx, batch);
    await Promise.all(
      matchedHistory.map((history: AlertHistoryDoc) =>
        ctx.db.patch(history._id, {
          notificationError: finalError,
          notificationSent: false,
        }),
      ),
    );

    await ctx.db.patch(batch._id, {
      lastAttemptedAt: args.failedAt,
      lastAttemptError: finalError,
      sendAttempts,
      sent: true,
      sentAt: args.failedAt,
      terminalFailureAt: args.failedAt,
    });

    return { gaveUp: true, nextScheduledFor: null, sendAttempts, success: true };
  }

  const retryDelayMs = getAlertBatchRetryDelayMs(sendAttempts);
  const nextScheduledFor = args.failedAt + retryDelayMs;
  await ctx.db.patch(batch._id, {
    lastAttemptedAt: args.failedAt,
    lastAttemptError: args.errorMessage,
    scheduledFor: nextScheduledFor,
    sendAttempts,
  });

  return { gaveUp: false, nextScheduledFor, sendAttempts, success: true };
};

export const processPendingAlertBatchesHelper = async (
  ctx: ActionCtx,
  args: {
    limit?: number;
    now?: number;
  },
) => {
  const now = args.now ?? Date.now();
  const pendingBatches = await ctx.runQuery(internal.alerts.listPendingAlertBatches, {
    limit: args.limit,
    now,
  });
  const deliveryConfig = getAlertDeliveryConfig();

  let considered = 0;
  let deferredByMissingConfig = 0;
  let deferredRescheduled = 0;
  let exhaustedRetries = 0;
  let failedSends = 0;
  let retriesScheduled = 0;
  let sentBatches = 0;
  let skippedByEntitlement = 0;
  let skippedByMissingRecipient = 0;

  if (!deliveryConfig && pendingBatches.length > 0) {
    console.error("Alert delivery config missing; deferring pending batches", {
      pendingBatches: pendingBatches.length,
    });
  }

  for (const batch of pendingBatches) {
    considered++;
    const userKey = getStoredUserKey(batch);

    const { alertEntitlements, subscriptionStatus } = await getUserAlertEntitlements(
      ctx,
      getStoredIdentity(batch),
    );
    if (!alertEntitlements.canSendAlerts) {
      skippedByEntitlement++;
      await ctx.runMutation(internal.alerts.markAlertBatchProcessed, {
        batchId: batch._id,
        errorMessage: `Skipped: subscription status ${subscriptionStatus.status} cannot receive alerts`,
        processedAt: now,
        status: "skipped",
      });
      continue;
    }

    if (!deliveryConfig) {
      deferredByMissingConfig++;
      const deferResult = await ctx.runMutation(internal.alerts.deferAlertBatchForMissingConfig, {
        batchId: batch._id,
        deferredAt: now,
      });
      if (deferResult.success) {
        deferredRescheduled++;
      }
      continue;
    }

    const recipientEmail = await resolveAlertRecipientEmail(ctx, getStoredIdentity(batch));
    if (!recipientEmail) {
      skippedByMissingRecipient++;
      await ctx.runMutation(internal.alerts.markAlertBatchProcessed, {
        batchId: batch._id,
        errorMessage: "Skipped: no recipient email available for subscription",
        processedAt: now,
        status: "skipped",
      });
      continue;
    }

    const unsubscribeUrl = await buildUnsubscribeUrl(userKey);
    const digest = formatAlertDigest(batch, deliveryConfig.siteUrl, unsubscribeUrl ?? undefined);
    const sendResult = await sendAlertEmail(deliveryConfig, {
      html: digest.html,
      subject: digest.subject,
      text: digest.text,
      to: recipientEmail,
      unsubscribeUrl: unsubscribeUrl ?? undefined,
    });

    if (!sendResult.ok) {
      failedSends++;
      const failureResult = await ctx.runMutation(internal.alerts.recordAlertBatchSendFailure, {
        batchId: batch._id,
        errorMessage: sendResult.error,
        failedAt: now,
      });

      if (failureResult.gaveUp) exhaustedRetries++;
      else retriesScheduled++;

      console.error("Failed to send alert batch", {
        batchId: batch._id,
        error: sendResult.error,
        gaveUp: failureResult.gaveUp,
        nextScheduledFor: failureResult.nextScheduledFor,
        sendAttempts: failureResult.sendAttempts,
      });
      continue;
    }

    await ctx.runMutation(internal.alerts.markAlertBatchProcessed, {
      batchId: batch._id,
      processedAt: now,
      status: "sent",
    });
    sentBatches++;
  }

  return {
    considered,
    deferredByMissingConfig,
    deferredRescheduled,
    exhaustedRetries,
    failedSends,
    pendingCount: pendingBatches.length,
    retriesScheduled,
    sentBatches,
    skippedByEntitlement,
    skippedByMissingRecipient,
    success: true,
  };
};
