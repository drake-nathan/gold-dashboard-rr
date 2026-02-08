import type { GenericActionCtx, GenericDataModel } from "convex/server";

import { registerRoutes } from "@convex-dev/stripe";
import { httpRouter } from "convex/server";

import { components, internal } from "./_generated/api";

const http = httpRouter();
type StripeWebhookCtx = Pick<
  GenericActionCtx<GenericDataModel>,
  "runMutation" | "runQuery"
>;

const resolveUserIdFromSubscription = async (
  ctx: Pick<StripeWebhookCtx, "runQuery">,
  stripeSubscriptionId: string,
  fallbackUserId?: string,
): Promise<string | undefined> => {
  if (fallbackUserId) {
    return fallbackUserId;
  }

  const subscription = (await ctx.runQuery(
    components.stripe.public.getSubscription,
    { stripeSubscriptionId },
  )) as null | { userId?: string };

  return subscription?.userId;
};

const applySubscriptionStatusToAlerts = async (
  ctx: StripeWebhookCtx,
  args: {
    status: string;
    stripeSubscriptionId: string;
    userId?: string;
  },
): Promise<void> => {
  const userId = await resolveUserIdFromSubscription(
    ctx,
    args.stripeSubscriptionId,
    args.userId,
  );
  if (!userId) {
    return;
  }

  await ctx.runMutation(internal.alerts.applySubscriptionStatusToAlerts, {
    status: args.status,
    userId,
  });
};

// Register Stripe webhook handler at /stripe/webhook
registerRoutes(http, components.stripe, {
  events: {
    "customer.subscription.deleted": async (ctx, event) => {
      const subscription = event.data.object;
      const metadataUserId =
        typeof subscription.metadata.userId === "string" ?
          subscription.metadata.userId
        : undefined;

      await applySubscriptionStatusToAlerts(ctx, {
        status: "canceled",
        stripeSubscriptionId: subscription.id,
        userId: metadataUserId,
      });
    },
    "customer.subscription.updated": async (ctx, event) => {
      const subscription = event.data.object;
      const metadataUserId =
        typeof subscription.metadata.userId === "string" ?
          subscription.metadata.userId
        : undefined;

      await applySubscriptionStatusToAlerts(ctx, {
        status: subscription.status,
        stripeSubscriptionId: subscription.id,
        userId: metadataUserId,
      });
    },
  },
  webhookPath: "/stripe/webhook",
});

export default http;
