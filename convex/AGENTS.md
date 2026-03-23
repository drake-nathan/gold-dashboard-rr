# Convex Backend

Read `convex/_generated/ai/guidelines.md` for Convex API rules and patterns.
Read `convex/schema.ts` for the full database schema.

## Architecture

- Pure bid prices live exclusively in `pureProducts` (single source of truth). `costcoProducts` stores only `pureProductId` as a JOIN key. Never denormalize bid prices.
- Fallback chain: product-specific Pure match -> generic `collectPurePrices` spot prices
- Market prices: Gold API for XAU/XAG/BTC (`convex/marketPrices.ts`), FMP for S&P 500 (`convex/fmp.ts`)
- Costco data: Dual API — Search API for discovery (~1 credit/call), Product API for verification (10 credits/product)
- Dev data can be refreshed from production snapshots via `scripts/snapshot.ts`
- User data: `userCreditCards` and `userSettings` keyed by Clerk userId

## Safety

Dev and prod use separate Convex deployments. Be cautious with:

- Schema changes (test carefully before deploying)
- Mutations that modify production data
- Snapshot imports into dev
- Cron jobs (ensure they don't run multiple times)

## Key Files

- `convex/schema.ts` — Database schema (source of truth)
- `convex/dashboard.ts` — Dashboard summary and product queries
- `convex/costco.ts` — Costco product fetch (Search + Product APIs)
- `convex/pure.ts` — Collect Pure API integration (bid prices, spot prices)
- `convex/marketPrices.ts` — Gold API market prices (XAU, XAG, BTC)
- `convex/fmp.ts` — FMP S&P 500 integration
- `convex/crons.ts` — All cron job definitions
- `convex/userCards.ts` — User credit card CRUD (authenticated)
- `convex/alerts.ts` — Alert system CRUD and evaluation
- `convex/stripe.ts` — Stripe subscription webhooks and checkout
