# Gold Dashboard - Project Documentation

## Project Overview
A gold/silver price tracking dashboard that monitors Costco precious metals products and compares them with Collect Pure's spot prices and bids.

## Tech Stack
- **Framework**: React Router 7 (migrated from Next.js)
- **Runtime**: Bun
- **Backend/Database**: Convex
- **Styling**: Tailwind CSS v4
- **Language**: TypeScript
- **Features**:
  - Server-Side Rendering (SSR)
  - React Compiler (babel-plugin-react-compiler)

**Note**: RSC (React Server Components) was removed as it's experimental in RR7 and added unnecessary complexity.

## Migration Notes
This project was recently migrated from Next.js to React Router 7 + Vite. Some remnants from the Next.js setup may still exist.

### Key Migration Changes
- Environment variables: Changed from `NEXT_PUBLIC_*` to `VITE_*` prefix for client-side vars
- Build system: Switched from Next.js to Vite
- Routing: Now using React Router 7

## Environment Setup

### Environment Variables
- `.env` - Template file with empty values (committed to git)
- `.env.local` - Actual values with API keys (gitignored)

Required environment variables:
```bash
# Convex
CONVEX_DEPLOYMENT=dev:nautical-chickadee-997
VITE_CONVEX_URL=https://nautical-chickadee-997.convex.cloud

# API Keys
UNWRANGLE_API_KEY=<your-key>
PURE_API_KEY=<your-key>
```

### Validation
Environment variables are validated using `@t3-oss/env-core`:
- Client vars (`app/env.client.ts`): Must have `VITE_` prefix
- Server vars (`app/env.server.ts`): Regular env vars

## Database Schema (Convex)

### Tables

#### costcoProducts
Main products table tracking Costco precious metals:
- Product details (name, brand, categories, UPC, etc.)
- Metal specifics (type, weight, purity)
- Current state (price, price per ounce, stock status)
- Timestamps for tracking changes

#### priceHistory
Tracks all price changes over time for products.

#### stockHistory
Tracks stock status changes (in/out of stock).

#### collectPurePrices
Spot prices and bids from Collect Pure API for different metals (gold, silver, platinum, palladium).

#### collectPureProductBids
Product-specific bids from Collect Pure that can be matched to Costco products.

#### costcoPureProductMappings
Mapping table to link Costco products to Pure products with search criteria.

#### fetchRuns
Monitoring/debugging table tracking fetch operations from both Costco and Collect Pure sources.

## Data Flow
1. Fetch products from Costco (via Unwrangle API)
2. Fetch spot prices and bids from Collect Pure API
3. Match Costco products to Pure products via mapping table
4. Track price/stock changes in history tables
5. Display comparison data in dashboard

## Known Issues / Notes

### Babel Preset
The vite config references `@babel/preset-typescript` but it's not in package.json. This might cause issues later if babel complains. Monitor during development.

### Environment Variable Flow
In React Router 7 with SSR:
1. **Server-side** (loader in `app/root.tsx`): Reads from `process.env.VITE_CONVEX_URL`
2. **Client-side** (Layout component): Receives env var from loader via `useRouteLoaderData("root")`
3. This pattern is necessary because:
   - Layout component runs during SSR (where `import.meta.env` isn't available)
   - Layout is also used in error boundaries (where loader data may be undefined)
   - We use a safe fallback for error scenarios

### Vite Config
- Removed RSC plugins (`unstable_reactRouterRSC`, `@vitejs/plugin-rsc`)
- Using standard `reactRouter()` plugin from `@react-router/dev/vite`
- Server-side env import is commented out in `vite.config.ts:8`:
  ```ts
  // import "./app/env.server";
  ```
  This would validate server env vars at build time but is currently disabled.

## Scripts
```bash
bun install          # Install dependencies
bun run dev          # Start dev server
bun run build        # Production build
bun run typecheck    # Run TypeScript checks
bun run lint         # Run ESLint
bun run format       # Format with Prettier
```

## Convex Setup
Convex is already configured. The convex folder was copied from the previous Next.js project and is working correctly.

To run Convex in development:
```bash
npx convex dev
```

## Project Status
- ✅ Dependencies installed
- ✅ Environment variables configured
- ✅ Type checking passes
- ⏳ Dev server not yet tested
