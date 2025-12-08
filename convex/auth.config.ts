import type { AuthConfig } from "convex/server";

// Clerk JWT issuer domain - required for auth to work
// Set this in Convex dashboard: https://dashboard.convex.dev/d/effervescent-dog-80/settings/environment-variables
// Value should be your Clerk domain (e.g., "your-app.clerk.accounts.dev")
const issuerDomain = process.env.CLERK_JWT_ISSUER_DOMAIN ?? "";

export default {
  providers: issuerDomain
    ? [
        {
          applicationID: "convex",
          domain: issuerDomain,
        },
      ]
    : [],
} satisfies AuthConfig;
