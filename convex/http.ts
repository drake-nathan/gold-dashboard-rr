import { registerRoutes } from "@convex-dev/stripe";
import type { GenericActionCtx, GenericDataModel } from "convex/server";
import { httpRouter } from "convex/server";

import { components, internal } from "./_generated/api";
import { httpAction } from "./_generated/server";

const http = httpRouter();
type StripeWebhookCtx = Pick<GenericActionCtx<GenericDataModel>, "runMutation" | "runQuery">;

const resolveUserIdFromSubscription = async (
  ctx: Pick<StripeWebhookCtx, "runQuery">,
  stripeSubscriptionId: string,
  fallbackUserId?: string,
): Promise<string | undefined> => {
  if (fallbackUserId) {
    return fallbackUserId;
  }

  const subscription = (await ctx.runQuery(components.stripe.public.getSubscription, {
    stripeSubscriptionId,
  })) as null | { userId?: string };

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
  const userId = await resolveUserIdFromSubscription(ctx, args.stripeSubscriptionId, args.userId);
  if (!userId) {
    return;
  }

  await ctx.runMutation(internal.alerts.applySubscriptionStatusToAlerts, {
    status: args.status,
    userId,
  });
};

// --- Unsubscribe token utilities ---

const UNSUBSCRIBE_TOKEN_SEPARATOR = ".";

/**
 * Create an HMAC-SHA256 signature for the given data using the unsubscribe secret.
 */
const signUnsubscribeToken = async (userId: string, secret: string): Promise<string> => {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { hash: "SHA-256", name: "HMAC" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(userId));
  const signatureHex = [...new Uint8Array(signature)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `${userId}${UNSUBSCRIBE_TOKEN_SEPARATOR}${signatureHex}`;
};

/**
 * Verify an unsubscribe token and return the userId if valid.
 */
const verifyUnsubscribeToken = async (token: string, secret: string): Promise<null | string> => {
  const separatorIndex = token.indexOf(UNSUBSCRIBE_TOKEN_SEPARATOR);
  if (separatorIndex === -1) {
    return null;
  }

  const userId = token.slice(0, separatorIndex);
  const providedSignature = token.slice(separatorIndex + 1);

  if (!userId || !providedSignature) {
    return null;
  }

  const expectedToken = await signUnsubscribeToken(userId, secret);
  const expectedSignature = expectedToken.slice(
    expectedToken.indexOf(UNSUBSCRIBE_TOKEN_SEPARATOR) + 1,
  );

  // Constant-time comparison (bitwise ops intentional for security)
  if (providedSignature.length !== expectedSignature.length) {
    return null;
  }

  let mismatch = 0;
  for (let i = 0; i < providedSignature.length; i++) {
    mismatch |= providedSignature.charCodeAt(i) ^ expectedSignature.charCodeAt(i);
  }

  return mismatch === 0 ? userId : null;
};

// --- Unsubscribe HTTP endpoint ---

const unsubscribeHandler = httpAction(async (ctx, request) => {
  const secret = process.env.UNSUBSCRIBE_SECRET;
  if (!secret) {
    console.error("UNSUBSCRIBE_SECRET not configured");
    return new Response("Service unavailable", { status: 503 });
  }

  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  if (!token) {
    return new Response("Missing token", { status: 400 });
  }

  const userId = await verifyUnsubscribeToken(token, secret);
  if (!userId) {
    return new Response("Invalid or expired token", { status: 403 });
  }

  // Handle both POST (RFC 8058 one-click) and GET (user clicking link)
  if (request.method === "POST" || request.method === "GET") {
    const result = await ctx.runMutation(internal.alerts.disableAllAlertsForUser, { userId });

    if (request.method === "GET") {
      const siteUrl = process.env.SITE_URL ?? "";
      const alertsUrl = siteUrl ? `${siteUrl.replace(/\/+$/, "")}/alerts` : "";
      const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Unsubscribed</title>
<style>body{font-family:system-ui,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#fafafa;color:#333}
.card{background:#fff;border-radius:8px;padding:2rem;max-width:400px;text-align:center;box-shadow:0 1px 3px rgba(0,0,0,.1)}
a{color:#b8860b;text-decoration:none}</style></head>
<body><div class="card">
<h1>Alerts Disabled</h1>
<p>${result.disabledCount} alert${result.disabledCount === 1 ? "" : "s"} disabled.</p>
<p>You will no longer receive alert emails.</p>
${alertsUrl ? `<p><a href="${alertsUrl}">Manage your alerts</a></p>` : ""}
</div></body></html>`;

      return new Response(html, {
        headers: { "Content-Type": "text/html" },
        status: 200,
      });
    }

    // POST response (RFC 8058)
    return new Response("OK", { status: 200 });
  }

  return new Response("Method not allowed", { status: 405 });
});

http.route({
  handler: unsubscribeHandler,
  method: "POST",
  path: "/unsubscribe",
});

http.route({
  handler: unsubscribeHandler,
  method: "GET",
  path: "/unsubscribe",
});

// Register Stripe webhook handler at /stripe/webhook
registerRoutes(http, components.stripe, {
  events: {
    "customer.subscription.deleted": async (ctx, event) => {
      const subscription = event.data.object;
      const metadataUserId =
        typeof subscription.metadata.userId === "string" ? subscription.metadata.userId : undefined;

      await applySubscriptionStatusToAlerts(ctx, {
        status: "canceled",
        stripeSubscriptionId: subscription.id,
        userId: metadataUserId,
      });
    },
    "customer.subscription.updated": async (ctx, event) => {
      const subscription = event.data.object;
      const metadataUserId =
        typeof subscription.metadata.userId === "string" ? subscription.metadata.userId : undefined;

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
