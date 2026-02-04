import { StripeSubscriptions } from "@convex-dev/stripe";
import { v } from "convex/values";

import { components } from "./_generated/api";
import { action, query } from "./_generated/server";
import { determineSubscriptionStatus } from "./stripeUtils";

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
    throw new Error(
      "SITE_URL environment variable is required for Stripe integration",
    );
  }
  return siteUrl;
};

/**
 * Create a Stripe Checkout session for subscribing to Pro
 * Returns a URL to redirect the user to Stripe Checkout
 */
export const createCheckoutSession = action({
  args: {
    priceId: v.string(),
  },
  handler: async (ctx, args): Promise<{ error?: string; url?: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { error: "You must be logged in to subscribe" };
    }

    try {
      // Get or create a Stripe customer linked to this Clerk user
      const customer = await stripeClient.getOrCreateCustomer(ctx, {
        email: identity.email,
        name: identity.name,
        userId: identity.subject,
      });

      // Create the checkout session
      const siteUrl = getSiteUrl();
      const session = await stripeClient.createCheckoutSession(ctx, {
        cancelUrl: `${siteUrl}?checkout=canceled`,
        customerId: customer.customerId,
        mode: "subscription",
        priceId: args.priceId,
        subscriptionMetadata: { userId: identity.subject },
        successUrl: `${siteUrl}?checkout=success`,
      });

      return { url: session.url ?? undefined };
    } catch (error) {
      console.error("Error creating checkout session:", error);
      return {
        error:
          error instanceof Error ? error.message : "Failed to create checkout",
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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { error: "You must be logged in to manage subscription" };
    }

    try {
      // Get the customer for this user
      const customer = await stripeClient.getOrCreateCustomer(ctx, {
        email: identity.email,
        name: identity.name,
        userId: identity.subject,
      });

      // Create portal session
      const siteUrl = getSiteUrl();
      const session = await stripeClient.createCustomerPortalSession(ctx, {
        customerId: customer.customerId,
        returnUrl: siteUrl,
      });

      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- session.url can be null
      return { url: session.url ?? undefined };
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
      return { isPro: false, status: "anonymous" as const };
    }

    // Query the component's subscriptions via public query
    const subscriptions = await ctx.runQuery(
      components.stripe.public.listSubscriptionsByUserId,
      { userId: identity.subject },
    );

    // Use utility function to determine status
    const result = determineSubscriptionStatus(subscriptions);

    return {
      ...result,
      userId: identity.subject,
    };
  },
});
