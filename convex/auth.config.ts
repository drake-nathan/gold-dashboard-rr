import type { AuthConfig } from "convex/server";

// TODO: Enable Clerk auth when ready to implement authentication
// See TODO.md for implementation plan

// const issuerDomain = process.env.CLERK_JWT_ISSUER_DOMAIN;

// if (!issuerDomain) {
//   throw new Error("CLERK_JWT_ISSUER_DOMAIN environment variable is required");
// }

export default {
  providers: [
    // Clerk auth disabled until implementation - see TODO.md
    // {
    //   applicationID: "convex",
    //   domain: issuerDomain,
    // },
  ],
} satisfies AuthConfig;
