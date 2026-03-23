---
globs:
  - "convex/**/*.ts"
---

## Convex Architecture

Read `convex/schema.ts` for the full database schema.
Read `convex/_generated/ai/guidelines.md` for Convex API rules and patterns.

- **Pure bid prices** live exclusively in `pureProducts` (single source of truth). `costcoProducts` stores only `pureProductId` as a JOIN key. Never denormalize bid prices.
- **Fallback chain**: Product-specific Pure match -> generic `collectPurePrices` spot prices
- **Market prices**: Gold API for XAU/XAG/BTC (`convex/marketPrices.ts`), FMP for S&P 500 (`convex/fmp.ts`)
- **Costco data**: Dual API — Search API for discovery, Product API for verification
- Dev data can be seeded from production snapshots with `scripts/snapshot.ts`
- **User data**: `userCreditCards`, `userSettings` keyed by Clerk userId
