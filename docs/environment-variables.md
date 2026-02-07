# Environment Variables

Comprehensive reference for managing environment variables across all environments.

## Environment Overview

| Environment     | Convex Deployment | Railway Service | Use Case            |
| --------------- | ----------------- | --------------- | ------------------- |
| Local dev       | Dev               | -               | Development         |
| Railway Preview | Dev               | Preview         | PR reviews, testing |
| Railway Prod    | Prod              | Prod            | Production          |

## Quick Reference

| Variable                     | Type   | Required  | Env-Specific | Description                                            |
| ---------------------------- | ------ | --------- | ------------ | ------------------------------------------------------ |
| **Convex**                   |
| `CONVEX_DEPLOYMENT`          | Server | Yes       | Yes          | Convex deployment identifier (`prod:xxx` or `dev:xxx`) |
| `VITE_CONVEX_URL`            | Client | Yes       | Yes          | Convex deployment URL                                  |
| `ENABLE_CRONS`               | Convex | No        | Yes          | Enable cron jobs (prod only)                           |
| **API Keys**                 |
| `UNWRANGLE_API_KEY`          | Convex | Yes       | No           | Costco product data API                                |
| `PURE_API_KEY`               | Convex | Yes       | No           | Collect Pure spot/bid prices                           |
| `GOLD_API_KEY`               | Convex | No        | No           | Gold API (not actively used)                           |
| `FMP_API_KEY`                | Convex | Yes       | No           | Financial Modeling Prep (S&P 500)                      |
| **Clerk Auth**               |
| `VITE_CLERK_PUBLISHABLE_KEY` | Client | Yes       | Yes          | Clerk frontend key (pk_test/pk_live)                   |
| `CLERK_SECRET_KEY`           | Convex | Yes       | Yes          | Clerk backend key (sk_test/sk_live)                    |
| `CLERK_JWT_ISSUER_DOMAIN`    | Convex | Yes       | Yes          | Clerk JWT issuer domain                                |
| `ADMIN_USER_IDS`             | Convex | No        | Yes          | Comma-separated admin Clerk user IDs                   |
| **Stripe**                   |
| `VITE_STRIPE_ENABLED`        | Client | No        | Yes          | Feature flag for Stripe UI                             |
| `STRIPE_SECRET_KEY`          | Convex | If Stripe | Yes          | Stripe backend key (sk_test/sk_live)                   |
| `STRIPE_WEBHOOK_SECRET`      | Convex | If Stripe | Yes          | Stripe webhook signing secret                          |
| `STRIPE_PRICE_ID`            | Convex | If Stripe | Yes          | Pro subscription price ID                              |
| `VITE_STRIPE_PRICE_ID`       | Client | If Stripe | Yes          | Same price ID (client-side)                            |
| `SITE_URL`                   | Convex | If Stripe | Yes          | Site URL for Stripe redirects                          |
| **Analytics**                |
| `VITE_PUBLIC_POSTHOG_KEY`    | Client | Yes       | Yes          | PostHog API key                                        |
| `VITE_PUBLIC_POSTHOG_HOST`   | Client | Yes       | No           | PostHog host URL                                       |

**Type Legend:**

- **Client**: VITE\_ prefix, embedded in browser bundle at build time
- **Server**: Used by Railway/Node.js at runtime
- **Convex**: Set in Convex dashboard, used by Convex functions

## Environment Matrix

Where each variable is configured:

| Variable                     |  `.env.local`  | Railway Prod | Railway Preview | Convex Dev | Convex Prod |
| ---------------------------- | :------------: | :----------: | :-------------: | :--------: | :---------: |
| `CONVEX_DEPLOYMENT`          |      dev       |     prod     |       dev       |     -      |      -      |
| `VITE_CONVEX_URL`            |    dev URL     |   prod URL   |     dev URL     |     -      |      -      |
| `ENABLE_CRONS`               |       -        |      -       |        -        |  `false`   |   `true`    |
| `UNWRANGLE_API_KEY`          |       -        |      -       |        -        |    same    |    same     |
| `PURE_API_KEY`               |       -        |      -       |        -        |    same    |    same     |
| `GOLD_API_KEY`               |       -        |      -       |        -        |    same    |    same     |
| `FMP_API_KEY`                |       -        |      -       |        -        |    same    |    same     |
| `VITE_CLERK_PUBLISHABLE_KEY` |      test      |     prod     |      test       |     -      |      -      |
| `CLERK_SECRET_KEY`           |       -        |      -       |        -        |    test    |    prod     |
| `CLERK_JWT_ISSUER_DOMAIN`    |       -        |      -       |        -        |    test    |    prod     |
| `ADMIN_USER_IDS`             |       -        |      -       |        -        | test users | prod users  |
| `VITE_STRIPE_ENABLED`        | `true`/`false` |    `true`    |     `false`     |     -      |      -      |
| `STRIPE_SECRET_KEY`          |       -        |      -       |        -        |    test    |    prod     |
| `STRIPE_WEBHOOK_SECRET`      |       -        |      -       |        -        |    test    |    prod     |
| `STRIPE_PRICE_ID`            |       -        |      -       |        -        |    test    |    prod     |
| `VITE_STRIPE_PRICE_ID`       |      test      |     prod     |      test       |     -      |      -      |
| `SITE_URL`                   |       -        |      -       |        -        | localhost  |  prod URL   |
| `VITE_PUBLIC_POSTHOG_KEY`    |      key       |     key      |       key       |     -      |      -      |
| `VITE_PUBLIC_POSTHOG_HOST`   |      host      |     host     |      host       |     -      |      -      |

**Notes:**

- `-` means not applicable for that location
- "same" means the same value is used across environments
- "test"/"prod" means different values for each environment

## Setup Checklists

### New Local Development Setup

1. Copy `.env.template` to `.env.local`
2. Set Convex dev deployment:
   ```bash
   CONVEX_DEPLOYMENT=dev:your-dev-deployment
   VITE_CONVEX_URL=https://your-dev-deployment.convex.cloud
   ```
3. Get Clerk **test** keys from [Clerk Dashboard](https://dashboard.clerk.com):
   ```bash
   VITE_CLERK_PUBLISHABLE_KEY=pk_test_xxx
   ```
4. Set PostHog keys (same for all environments):
   ```bash
   VITE_PUBLIC_POSTHOG_KEY=phc_xxx
   VITE_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
   ```
5. Optional - Stripe test mode:
   ```bash
   VITE_STRIPE_ENABLED=true
   VITE_STRIPE_PRICE_ID=price_test_xxx
   ```
6. Run `bun run dev`

### Railway Preview Deployment

Railway preview deployments should use the **dev** Convex deployment and **test** API keys:

1. In Railway preview environment variables:

   ```bash
   VITE_CONVEX_URL=https://your-dev-deployment.convex.cloud
   VITE_CLERK_PUBLISHABLE_KEY=pk_test_xxx
   VITE_STRIPE_ENABLED=false  # or use test keys
   VITE_PUBLIC_POSTHOG_KEY=phc_xxx
   VITE_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
   ```

2. Ensure Convex **dev** deployment has:
   - `CLERK_SECRET_KEY` = test key
   - `CLERK_JWT_ISSUER_DOMAIN` = test domain
   - `ENABLE_CRONS=false` (avoid duplicate cron runs)

### Adding a New Environment Variable

1. **Add to `.env.template`** with descriptive comment
2. **Add to `.env.local`** with actual value
3. **If `VITE_` prefix** (client-side):
   - Add to `Dockerfile` as build arg (lines 16-26)
   - Add to Railway as environment variable
4. **If used in Convex functions**:
   - Add to Convex dev dashboard
   - Add to Convex prod dashboard
5. **Update this document** with the new variable

## Variable Details

### Convex

| Variable            | Description                                                                                                   |
| ------------------- | ------------------------------------------------------------------------------------------------------------- |
| `CONVEX_DEPLOYMENT` | Format: `prod:deployment-name` or `dev:deployment-name`. Used by Convex CLI to target the correct deployment. |
| `VITE_CONVEX_URL`   | Full URL like `https://deployment-name.convex.cloud`. Used by frontend to connect to Convex.                  |
| `ENABLE_CRONS`      | Set to `"true"` only in Convex **prod** to prevent duplicate API calls. Cron jobs check this before running.  |

### API Keys

All API keys are **shared** across environments (no test/prod split):

| Variable            | Service                                                      | Dashboard                                   |
| ------------------- | ------------------------------------------------------------ | ------------------------------------------- |
| `UNWRANGLE_API_KEY` | [Unwrangle](https://unwrangle.com)                           | Costco product search & details             |
| `PURE_API_KEY`      | Collect Pure                                                 | Spot prices and bid prices                  |
| `GOLD_API_KEY`      | [Gold API](https://gold-api.com)                             | Not actively used (free tier needs no auth) |
| `FMP_API_KEY`       | [Financial Modeling Prep](https://financialmodelingprep.com) | S&P 500 quotes                              |

### Clerk Authentication

| Variable                     | Environment                                | Where to Find                   |
| ---------------------------- | ------------------------------------------ | ------------------------------- |
| `VITE_CLERK_PUBLISHABLE_KEY` | `pk_test_xxx` (dev) / `pk_live_xxx` (prod) | Clerk Dashboard > API Keys      |
| `CLERK_SECRET_KEY`           | `sk_test_xxx` (dev) / `sk_live_xxx` (prod) | Clerk Dashboard > API Keys      |
| `CLERK_JWT_ISSUER_DOMAIN`    | `https://xxx.clerk.accounts.dev`           | Clerk Dashboard > JWT Templates |
| `ADMIN_USER_IDS`             | Comma-separated Clerk user IDs             | Clerk Dashboard > Users         |

**Important**: Test and production Clerk environments are completely separate. Users created in test mode don't exist in production.

### Stripe

| Variable                | Test Mode                   | Production                  |
| ----------------------- | --------------------------- | --------------------------- |
| `STRIPE_SECRET_KEY`     | `sk_test_xxx`               | `sk_live_xxx`               |
| `STRIPE_WEBHOOK_SECRET` | `whsec_xxx` (test endpoint) | `whsec_xxx` (prod endpoint) |
| `STRIPE_PRICE_ID`       | `price_xxx` (test product)  | `price_xxx` (prod product)  |
| `SITE_URL`              | `http://localhost:5173`     | `https://dashboard.gold`    |

**Important**: Test and production Stripe environments use different Products/Prices. Create the Pro subscription product in both environments.

### PostHog Analytics

| Variable                   | Value                                                              |
| -------------------------- | ------------------------------------------------------------------ |
| `VITE_PUBLIC_POSTHOG_KEY`  | `phc_xxx` - Same key for all environments                          |
| `VITE_PUBLIC_POSTHOG_HOST` | `https://us.i.posthog.com` (US) or `https://eu.i.posthog.com` (EU) |

PostHog uses the same project for all environments. Use PostHog's environment property to filter dev vs prod events.

## Architecture Notes

### VITE\_ Prefix Variables

Variables with `VITE_` prefix have special behavior:

1. **Build time**: Embedded into the client JavaScript bundle by Vite
2. **Runtime**: Also needed by server-side loaders/middleware (SSR)

This means VITE\_ variables must be passed:

- As **build args** in Dockerfile (for client bundle)
- As **runtime env vars** in Railway (for SSR)

Current VITE\_ build args in Dockerfile:

- `VITE_CONVEX_URL`
- `VITE_CLERK_PUBLISHABLE_KEY`
- `VITE_PUBLIC_POSTHOG_KEY`
- `VITE_PUBLIC_POSTHOG_HOST`
- `VITE_ADSENSE_CLIENT_ID`

### Convex Environment Variables

Convex has its own environment variable system, separate from Railway:

- Set via [Convex Dashboard](https://dashboard.convex.dev) > Settings > Environment Variables
- Or via CLI: `npx convex env set VAR_NAME value`
- Accessed in Convex functions via `process.env.VAR_NAME`

Variables stored in Convex dashboard:

- All API keys (UNWRANGLE, PURE, GOLD_API, FMP)
- Clerk backend keys (CLERK_SECRET_KEY, CLERK_JWT_ISSUER_DOMAIN)
- Stripe backend keys
- `ENABLE_CRONS`
- `ADMIN_USER_IDS`
- `SITE_URL`

### Cron Job Control

The `ENABLE_CRONS` variable prevents duplicate API calls:

```typescript
// convex/crons.ts
if (process.env.ENABLE_CRONS !== "true") {
  return; // Skip cron execution
}
```

Set to `"true"` **only** in Convex prod deployment.

## Troubleshooting

### PostHog not tracking in production

**Cause**: Missing VITE\_ build args in Railway deployment.

**Fix**: Ensure Railway has these variables set (they're embedded at build time):

- `VITE_PUBLIC_POSTHOG_KEY`
- `VITE_PUBLIC_POSTHOG_HOST`

Trigger a redeploy after adding.

### Convex functions failing with "missing env var"

**Cause**: Environment variable not set in Convex dashboard.

**Fix**: Go to [Convex Dashboard](https://dashboard.convex.dev) > Settings > Environment Variables and add the missing variable.

### Clerk auth not working in preview

**Cause**: Mismatched Clerk environments (test frontend with prod backend, or vice versa).

**Fix**: Ensure Railway preview uses test Clerk publishable key AND Convex dev has test secret key.

### Stripe webhooks failing

**Cause**: Webhook secret doesn't match the endpoint.

**Fix**: Each Stripe endpoint (localhost, preview, production) needs its own webhook with its own signing secret. Create separate webhook endpoints in Stripe dashboard.

### "Convex URL not found" error on page load

**Cause**: `VITE_CONVEX_URL` not set or not passed as build arg.

**Fix**:

1. Check Railway environment variables
2. Check Dockerfile build args
3. Redeploy to rebuild with correct env vars
