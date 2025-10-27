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

### Convex Deployment Strategy

**Production-Only Setup**: This project uses a single Convex production deployment for both development and production.

**Rationale**:
- Read-only dashboard with public API data
- Semi-manual product mappings shouldn't be duplicated
- No user-generated data (yet)
- Simplifies workflow and prevents environment drift
- **Market price data**: Gold API fetches run every 5 minutes and build 24h history - duplicating across environments would waste API calls and create inconsistent data

**Important**: Always use the production deployment URL in `.env.local`. Never use `npx convex dev` which creates a separate dev deployment. Use `npx convex dev --once` to push changes, or better yet, use the production deployment directly.

**When to reconsider**: When implementing user authentication and settings persistence, a separate dev environment may be beneficial for testing with mock users.

### Environment Variables

- `.env.template` - Template file with empty values (committed to git)
- `.env.local` - Actual values with API keys and production deployment URL (gitignored)

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

#### marketPrices

Current market prices from Gold API for gold (XAU), silver (XAG), and bitcoin (BTC).

- Current price
- 24h percentage change (calculated from our historical data)
- Last updated timestamp

#### marketPriceHistory

Historical price data for calculating 24h percentage changes.

- Price snapshots every 5 minutes
- Automatically cleaned up after 30 days
- Used to calculate percentage change by comparing current price to price from ~24 hours ago

## Data Flow

1. Fetch products from Costco (via Unwrangle API)
2. Fetch spot prices and bids from Collect Pure API
3. Fetch market prices from Gold API (gold, silver, bitcoin) every 5 minutes
4. Match Costco products to Pure products via mapping table
5. Track price/stock changes in history tables
6. Calculate 24h percentage changes from market price history
7. Display comparison data in dashboard

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

Convex is configured to use the production deployment (`effervescent-dog-80`) for all development and production work.

**Authentication**: Clerk auth is currently disabled in `convex/auth.config.ts` until ready for implementation (see TODO.md).

To run Convex in development:

```bash
npx convex dev  # Connects to production deployment
```

**Important**: Since dev and prod share the same deployment, be cautious with:
- Schema changes (test carefully before deploying)
- Mutations that modify data
- Cron jobs (ensure they don't run multiple times)

## Market Price Tracking (Gold API)

**Integration**: `convex/twelve.ts` (Note: file name is legacy from Twelve Data migration)

### Overview

Tracks real-time prices for gold, silver, and bitcoin using the free Gold API (https://gold-api.com). These prices are displayed on the dashboard for market context.

### Assets Tracked

- **Gold (XAU)**: Spot price in USD per troy ounce
- **Silver (XAG)**: Spot price in USD per troy ounce
- **Bitcoin (BTC)**: Price in USD

### Implementation Details

**Fetch Frequency**: Every 5 minutes via cron job (`convex/crons.ts`)

**API Endpoint**: `https://api.gold-api.com/price/{symbol}`
- No authentication required for real-time prices
- No rate limits on free tier
- Returns current price only (no historical data)

**24h Percentage Change Calculation**:
- We maintain our own price history in `marketPriceHistory` table
- Every fetch adds a snapshot to history
- Percentage change calculated by comparing current price to price from ~24 hours ago (±30 min window)
- History older than 30 days is automatically cleaned up

**Functions**:
- `fetchMarketPrices()`: Internal action called by cron, fetches all 3 assets
- `upsertMarketPrice()`: Internal mutation that updates current price, adds to history, calculates % change
- `getMarketPrices()`: Public query returning all current prices (now included in `dashboard.getStats`)
- `getMarketPrice()`: Public query for specific asset
- `getPriceHistory()`: Debug query to view historical snapshots

**Data Access**:
- Market prices are included in `api.dashboard.getStats` for efficient frontend loading
- Single query fetches all dashboard data (products, Pure prices, market prices)

**Note**: The `GOLD_API_KEY` environment variable exists but is NOT used for real-time price fetches (only needed for historical data API which we don't use). We build our own history instead.

### Relationship with Pure API

Gold API and Pure API serve different purposes:
- **Gold API**: General market prices for dashboard display with 24h trends
- **Pure API**: Product-specific bid prices for calculating Costco arbitrage opportunities
- Both track gold/silver spots, but Pure spots are used for spread calculations (more accurate for actual bids)
- Gold/Silver overlap is intentional - provides data redundancy and validation

## UI Implementation

### Current State

The dashboard UI is fully implemented and functional. Located in `app/components/dashboard/` and `app/routes/dashboard.tsx`.

### Components

#### Dashboard (`app/components/dashboard/index.tsx`)

Main dashboard component that orchestrates the entire UI:

- **Page Header**: Minimal sticky header with title and auth placeholders
- **Stats Cards Row** (`app/components/dashboard/stats.tsx`):
  - **Market Prices** (left side, 180px cards):
    - Gold (XAU) spot price with 24h trend indicator
    - Silver (XAG) spot price with 24h trend indicator
    - Bitcoin (BTC) price with 24h trend indicator
  - **Dashboard Stats** (right side, 140px cards):
    - Total Cashback percentage
    - Last Update timestamp
  - **Trend Indicators**: Green ↗️ for positive change, Red ↘️ for negative change (appears after 24h of data accumulation)
- **Filter/Calculator Bar** (`app/components/dashboard/filters.tsx`): Single row with filters on left, calculator settings on right
- **Product Grid**: Responsive grid of product cards

#### Product Card (`app/components/product-card.tsx`)

Individual product display with:

- Product image thumbnail and name
- Stock status badge (In Stock/Out of Stock)
- Metal type badge (Gold/Silver)
- Weight information
- Pricing breakdown:
  - Costco price
  - Price after cashback
  - Price per oz (before and after cashback)
  - Pure bid price
  - Spread calculation (color-coded: green for profit, red for loss)
- Links to Costco and Collect Pure
- Aligned sections using `min-h-[*]` for consistent card heights

#### Filter/Calculator Bar

Integrated controls for:

- **Filters** (left side):
  - Show Out of Stock toggle
  - Metal Type selector (All/Gold/Silver)
  - Sort options (by spread or price, asc/desc)
- **Calculator** (right side):
  - Costco Executive membership toggle (2% cashback)
  - Credit card selector with presets:
    - Chase Freedom Unlimited (3.15%)
    - Capital One Venture X (2.0%)
    - Robinhood Gold Card (3.0%)

#### Theme Toggle (`app/components/theme-toggle.tsx`)

Dark mode toggle using Shadcn's theme provider. Supports light/dark/system modes.

### Server-Side Rendering

The dashboard uses Convex's `preloadQuery` pattern (adapted from Next.js):

- **Loader** (`app/routes/dashboard.tsx`): Pre-fetches data on server using `preloadQuery` from `convex/nextjs`
- **Single Query**: `api.dashboard.getStats` fetches all data (products, Pure prices, market prices) in one query
- **Component**: Uses `usePreloadedQuery` from `convex/react` for:
  - Immediate rendering with server data (no loading spinner)
  - Automatic WebSocket subscription for real-time updates
  - Seamless transition from server to live data

This provides optimal performance with instant page loads and real-time reactivity.

### Styling & Layout

- **Tailwind CSS v4**: All components use Tailwind for styling
- **Shadcn UI**: Pre-installed components in `app/components/ui/`
- **Lucide Icons**: Used for trend indicators (TrendingUp, TrendingDown)
- **Responsive Design**: Mobile-first with breakpoints for sm/md/lg/xl/2xl
- **Card Grid**: 1 column (mobile) → 2-3 (tablet) → 4-5 (desktop)
- **Stat Cards**: Market price cards are 180px wide, other stats are 140px

### Data Flow

1. Server loader pre-fetches `api.dashboard.getStats` from Convex (single consolidated query)
2. Data includes:
   - Gold and silver products with spread calculations
   - Collect Pure spot/bid prices
   - Market prices (gold, silver, bitcoin) with 24h trends
   - Last fetch timestamp
3. Component transforms data to `ProductCardData` format
4. Dashboard passes data to stats and product cards
5. Calculator settings adjust spread calculations in real-time
6. Filters modify displayed product list

### Key Files

- `app/routes/dashboard.tsx` - Main route with loader and data transformation
- `app/components/dashboard/index.tsx` - Main dashboard layout and state
- `app/components/dashboard/stats.tsx` - Market prices and stats cards with trend indicators
- `app/components/dashboard/filters.tsx` - Filter and calculator bar
- `app/components/product-card.tsx` - Individual product card
- `app/components/calculator-settings.tsx` - Credit card presets and types
- `app/components/product-filters.tsx` - Filter types and constants
- `app/components/theme-toggle.tsx` - Dark mode toggle
- `app/providers/theme-provider.tsx` - Theme context with localStorage
- `app/providers/convex-provider.tsx` - Convex client setup
- `convex/dashboard.ts` - Consolidated getStats query with all dashboard data

### Future Enhancements

See `TODO.md` for planned features including:

- Clerk authentication integration
- User settings persistence
- Price history charts
- Favorites/watchlist
- Product comparison tools

## Project Status

- ✅ Dependencies installed
- ✅ Environment variables configured
- ✅ Type checking passes
- ✅ Dev server running
- ✅ UI fully implemented with SSR and real-time updates
