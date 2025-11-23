import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here.
   * This way you can ensure the app isn't built with invalid env vars.
   */
  server: {
    // Convex
    CONVEX_DEPLOYMENT: z.string().min(1),
    CONVEX_DEPLOY_KEY: z.string().min(1),
    VITE_CONVEX_URL: z.string().url(), // Needed for SSR preloadQuery

    // External APIs
    UNWRANGLE_API_KEY: z.string().min(1),
    PURE_API_KEY: z.string().uuid(),
    GOLD_API_KEY: z.string().min(1),
    FMP_API_KEY: z.string().min(1),

    // Clerk Auth
    CLERK_SECRET_KEY: z.string().min(1),
    CLERK_JWT_ISSUER_DOMAIN: z.string().url(),

    // Node environment
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
  },

  /**
   * For server-side variables, we can pass process.env directly.
   */
  runtimeEnv: process.env,
  /**
   * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
   * useful for Docker builds.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  /**
   * Makes it so that empty strings are treated as undefined. `SOME_VAR: z.string()` and
   * `SOME_VAR=''` will throw an error.
   */
  emptyStringAsUndefined: true,
});
