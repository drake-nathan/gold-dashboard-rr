import type { QueryCtx } from "./_generated/server";

import { components } from "./_generated/api";
import {
  type AlertEntitlements,
  determineAlertEntitlements,
  determineSubscriptionStatus,
  type SubscriptionStatusResult,
} from "./stripeUtils";

type SubscriptionLookupCtx = Pick<QueryCtx, "runQuery">;

export interface UserAlertEntitlementsResult {
  alertEntitlements: AlertEntitlements;
  subscriptionStatus: SubscriptionStatusResult;
}

/**
 * Resolve subscription status and alert entitlements for an authenticated user.
 * Reuse this in alert mutations/dispatch paths to keep gating consistent.
 */
export const getUserAlertEntitlements = async (
  ctx: SubscriptionLookupCtx,
  userId: string,
): Promise<UserAlertEntitlementsResult> => {
  const subscriptions = await ctx.runQuery(
    components.stripe.public.listSubscriptionsByUserId,
    { userId },
  );

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
