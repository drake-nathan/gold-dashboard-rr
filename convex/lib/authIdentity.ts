import { type QueryCtx, type MutationCtx } from "../_generated/server";

export interface AuthUserIdentity {
  subject: string;
  tokenIdentifier: string;
}

export const requireAuthIdentity = async (
  ctx: MutationCtx | QueryCtx,
): Promise<AuthUserIdentity> => {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Authentication required");
  }

  return {
    subject: identity.subject,
    tokenIdentifier: identity.tokenIdentifier,
  };
};
