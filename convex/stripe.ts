import { StripeSubscriptions } from "@convex-dev/stripe";
import { v } from "convex/values";

import { components } from "./_generated/api";
import { type ActionCtx, action, query } from "./_generated/server";
import { requireAuthIdentity } from "./lib/authIdentity";
import {
  getAnonymousAlertEntitlements,
  getUserAlertEntitlements,
} from "./subscriptionEntitlements";

// Initialize the Stripe client from the component
const stripeClient = new StripeSubscriptions(components.stripe, {
  // Webhook events are handled automatically by the component
});

/**
 * Get the site URL from environment.
 * Throws if SITE_URL is not configured.
 */
const getSiteUrl = (): string => {
  const siteUrl = process.env.SITE_URL;
  if (!siteUrl) {
    throw new Error("SITE_URL environment variable is required for Stripe integration");
  }
  return siteUrl;
};

const getStripeCustomerForIdentity = async (
  ctx: ActionCtx,
  identity: Awaited<ReturnType<typeof requireAuthIdentity>>,
) => {
  for (const userId of [identity.tokenIdentifier, identity.subject]) {
    const customer = await ctx.runQuery(components.stripe.public.getCustomerByUserId, { userId });
    if (customer) {
      return {
        customerId: customer.stripeCustomerId,
        userId,
      };
    }

    if (userId === identity.subject) {
      break;
    }
  }

  const customer = await stripeClient.getOrCreateCustomer(ctx, {
    email: identity.email,
    name: identity.name,
    userId: identity.tokenIdentifier,
  });

  return { customerId: customer.customerId, userId: identity.tokenIdentifier };
};

/**
 * Create a Stripe Checkout session for subscribing to Pro
 * Returns a URL to redirect the user to Stripe Checkout
 */
export const createCheckoutSession = action({
  args: {
    // Kept for client compatibility; server enforces STRIPE_PRICE_ID.
    priceId: v.string(),
  },
  handler: async (ctx, args): Promise<{ error?: string; url?: string }> => {
    try {
      const identity = await requireAuthIdentity(ctx);
      const configuredPriceId = process.env.STRIPE_PRICE_ID;
      if (!configuredPriceId) {
        throw new Error("STRIPE_PRICE_ID environment variable is required for Stripe integration");
      }

      if (args.priceId !== configuredPriceId) {
        console.warn("Ignoring client-provided Stripe priceId mismatch", {
          configuredPriceId,
          providedPriceId: args.priceId,
          userId: identity.tokenIdentifier,
        });
      }

      const { customerId } = await getStripeCustomerForIdentity(ctx, identity);

      // Create the checkout session
      const siteUrl = getSiteUrl();
      const session = await stripeClient.createCheckoutSession(ctx, {
        cancelUrl: `${siteUrl}?checkout=canceled`,
        customerId,
        mode: "subscription",
        priceId: configuredPriceId,
        subscriptionMetadata: { userId: identity.tokenIdentifier },
        successUrl: `${siteUrl}?checkout=success`,
      });

      return { url: session.url ?? undefined };
    } catch (error) {
      console.error("Error creating checkout session:", error);
      return {
        error: error instanceof Error ? error.message : "Failed to create checkout",
      };
    }
  },
});

/**
 * Create a Stripe Customer Portal session for managing subscription
 * Returns a URL to redirect the user to the Stripe Portal
 */
export const createPortalSession = action({
  args: {},
  handler: async (ctx): Promise<{ error?: string; url?: string }> => {
    try {
      const identity = await requireAuthIdentity(ctx);
      const { customerId } = await getStripeCustomerForIdentity(ctx, identity);

      // Create portal session
      const siteUrl = getSiteUrl();
      const session = await stripeClient.createCustomerPortalSession(ctx, {
        customerId,
        returnUrl: siteUrl,
      });

      return { url: session.url };
    } catch (error) {
      console.error("Error creating portal session:", error);
      return {
        error: error instanceof Error ? error.message : "Failed to open portal",
      };
    }
  },
});

/**
 * Get the current user's subscription status
 * Returns subscription info or null if no active subscription
 */
export const getSubscriptionStatus = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return {
        alertEntitlements: getAnonymousAlertEntitlements(),
        isPro: false,
        status: "anonymous" as const,
      };
    }

    const { alertEntitlements, subscriptionStatus } = await getUserAlertEntitlements(ctx, {
      subject: identity.subject,
      tokenIdentifier: identity.tokenIdentifier,
    });

    return {
      alertEntitlements,
      ...subscriptionStatus,
      userId: identity.tokenIdentifier,
    };
  },
});
