import { components } from "./_generated/api";
import type { QueryCtx } from "./_generated/server";
import type { AuthUserIdentity } from "./lib/authIdentity";
import {
  type AlertEntitlements,
  determineAlertEntitlements,
  determineSubscriptionStatus,
  type SubscriptionStatusResult,
} from "./stripeUtils";

type SubscriptionLookupCtx = Pick<QueryCtx, "runQuery">;
type SubscriptionIdentity = AuthUserIdentity | string;

export interface UserAlertEntitlementsResult {
  alertEntitlements: AlertEntitlements;
  subscriptionStatus: SubscriptionStatusResult;
}

const getSubscriptionLookupKeys = (identity: SubscriptionIdentity): string[] => {
  if (typeof identity === "string") {
    return [identity];
  }

  if (identity.subject === identity.tokenIdentifier) {
    return [identity.tokenIdentifier];
  }

  return [identity.tokenIdentifier, identity.subject];
};

export const listSubscriptionsForIdentity = async (
  ctx: SubscriptionLookupCtx,
  identity: SubscriptionIdentity,
) => {
  const subscriptions = await Promise.all(
    getSubscriptionLookupKeys(identity).map((userId) =>
      ctx.runQuery(components.stripe.public.listSubscriptionsByUserId, { userId }),
    ),
  );

  const mergedSubscriptions = new Map(
    subscriptions.flat().map((subscription) => [subscription.stripeSubscriptionId, subscription]),
  );

  return [...mergedSubscriptions.values()];
};

/**
 * Resolve subscription status and alert entitlements for an authenticated user.
 * Reuse this in alert mutations/dispatch paths to keep gating consistent.
 */
export const getUserAlertEntitlements = async (
  ctx: SubscriptionLookupCtx,
  identity: SubscriptionIdentity,
): Promise<UserAlertEntitlementsResult> => {
  const subscriptions = await listSubscriptionsForIdentity(ctx, identity);
  const subscriptionStatus = determineSubscriptionStatus(subscriptions);

  return {
    alertEntitlements: determineAlertEntitlements(subscriptionStatus.status),
    subscriptionStatus,
  };
};

/**
 * Anonymous users have no alert permissions.
 */
export const getAnonymousAlertEntitlements = (): AlertEntitlements =>
  determineAlertEntitlements("anonymous");
