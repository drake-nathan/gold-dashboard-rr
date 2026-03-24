import { v } from "convex/values";

interface AuthCtx {
  auth: {
    getUserIdentity(): Promise<null | { tokenIdentifier?: null | string }>;
  };
}

export const reviewStatusValidator = v.union(
  v.literal("action_needed"),
  v.literal("auto_matched"),
  v.literal("fallback"),
  v.literal("manual_matched"),
  v.literal("unmatched"),
);

export type ReviewStatus =
  | "action_needed"
  | "auto_matched"
  | "fallback"
  | "manual_matched"
  | "unmatched";

export const isAdmin = (tokenIdentifier: null | string): boolean => {
  if (!tokenIdentifier) return false;

  const adminUserIds = process.env.ADMIN_USER_IDS;
  if (!adminUserIds) return false;

  const adminIds = adminUserIds.split(",").map((id) => id.trim());
  return adminIds.includes(tokenIdentifier);
};

export const getAuthenticatedTokenIdentifier = async (
  ctx: AuthCtx,
): Promise<null | string> => {
  const identity = await ctx.auth.getUserIdentity();
  return identity?.tokenIdentifier ?? null;
};

export const requireAdmin = async (ctx: AuthCtx): Promise<string> => {
  const tokenIdentifier = await getAuthenticatedTokenIdentifier(ctx);
  if (!isAdmin(tokenIdentifier)) {
    throw new Error("Unauthorized: Admin access required");
  }
  return tokenIdentifier ?? "";
};
