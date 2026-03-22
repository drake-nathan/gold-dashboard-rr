# Convex Backend

Read `convex/_generated/ai/guidelines.md` for Convex API rules and patterns.
Read `convex/schema.ts` for the full database schema.

## Architecture

- Pure bid prices live exclusively in `pureProducts` (single source of truth). `costcoProducts` stores only `pureProductId` as a JOIN key. Never denormalize bid prices.
- Fallback chain: product-specific Pure match -> generic `collectPurePrices` spot prices
- Market prices: Gold API for XAU/XAG/BTC (`convex/twelve.ts`), FMP for S&P 500 (`convex/fmp.ts`)
- Costco data: Dual API — Search API for discovery (~1 credit/call), Product API for verification (10 credits/product)
- `convex/twelve.ts` filename is legacy from Twelve Data migration; actually uses Gold API now
- User data: `userCreditCards` and `userSettings` keyed by Clerk userId

## Safety

Dev and prod share the same Convex deployment. Be cautious with:

- Schema changes (test carefully before deploying)
- Mutations that modify production data
- Cron jobs (ensure they don't run multiple times)

## Key Files

- `convex/schema.ts` — Database schema (source of truth)
- `convex/dashboard.ts` — Consolidated getStats query (all dashboard data in one query)
- `convex/costco.ts` — Costco product fetch (Search + Product APIs)
- `convex/pure.ts` — Collect Pure API integration (bid prices, spot prices)
- `convex/twelve.ts` — Gold API market prices (XAU, XAG, BTC)
- `convex/fmp.ts` — FMP S&P 500 integration
- `convex/crons.ts` — All cron job definitions
- `convex/userCards.ts` — User credit card CRUD (authenticated)
- `convex/alerts.ts` — Alert system CRUD and evaluation
- `convex/stripe.ts` — Stripe subscription webhooks and checkout
