import { type ActionCtx, type MutationCtx, type QueryCtx } from "../_generated/server";

export interface AuthUserIdentity {
  email?: string;
  name?: string;
  subject: string;
  tokenIdentifier: string;
}

type AuthContext = ActionCtx | MutationCtx | QueryCtx;

export const requireAuthIdentity = async (ctx: AuthContext): Promise<AuthUserIdentity> => {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Authentication required");
  }

  return {
    email: identity.email,
    name: identity.name,
    subject: identity.subject,
    tokenIdentifier: identity.tokenIdentifier,
  };
};
