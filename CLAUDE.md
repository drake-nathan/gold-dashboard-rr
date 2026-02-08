# Dashboard.Gold - Project Documentation

## Project Overview

A gold/silver price tracking dashboard that monitors Costco precious metals products and compares them with Collect Pure's spot prices and bids.

## Task Management

### System

- **`TASKS.md`** — The task board. All pending work lives here (Active / Short Term / Medium Term / Backlog / Testing). No completed items — delete them when done. Git history is the archive.
- **`.sessions/<name>.md`** — Session files for active epics only. Each starts with a status header. Delete when the epic ships.
- **`AGENTS.md`** — Symlink to `CLAUDE.md` for multi-agent compatibility.

### Rules for Agents

1. **Read `TASKS.md` first** at the start of any task-oriented session to understand current priorities.
2. **Update `TASKS.md` as you work:**
   - Check off / delete items when complete.
   - Add new items you discover in the appropriate section — inform the user when you do.
   - Keep the file under 150 lines. If it grows past that, consolidate or split into an epic.
3. **Session files** (`.sessions/<name>.md`):
   - Create only for multi-session epics (3+ sessions expected).
   - Always start with: `> **Status:** In Progress | Complete | Paused`
   - Link from TASKS.md Active section.
   - Delete when the epic is complete.
4. **No archive directories.** Git history preserves everything.

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

## React Best Practices

This project follows [React's "You Might Not Need an Effect" guidelines](https://react.dev/learn/you-might-not-need-an-effect):

### useEffect Usage Policy

**Only use useEffect for synchronizing with external systems:**

- ✅ Browser APIs (DOM, localStorage, matchMedia, history)
- ✅ Third-party integrations (Convex subscriptions, PostHog analytics)
- ✅ Non-React widgets or libraries

**Avoid useEffect for:**

- ❌ Transforming data for rendering (calculate during render instead)
- ❌ Handling user events (use event handlers directly)
- ❌ Caching expensive calculations (use `useMemo` instead)
- ❌ Resetting state on prop changes (use `key` prop to force recreation)
- ❌ Adjusting state when props change (derive state during render)
- ❌ Chaining Effects together (handle in event handlers or single Effect)

### Current Compliance

All `useEffect` calls in this codebase are compliant with React best practices:

- `app/providers/theme-provider.tsx` - DOM manipulation and matchMedia listener ✅
- `app/components/dashboard/index.tsx` - Browser history API (URL params) ✅
- `app/hooks/use-calculator-settings.ts` - **Refactored January 2025** to remove Effects for localStorage writes; now uses derived state with `useMemo` ✅

### Implementation Patterns

**Derived State**: Store minimal IDs, derive full objects during render

```typescript
const [selectedCardId, setSelectedCardId] = useState(initialId);
const selectedCard = useMemo(
  () => cards.find((c) => c.id === selectedCardId) ?? cards[0],
  [cards, selectedCardId],
);
```

**localStorage Writes**: Always in event handlers, never in Effects

```typescript
const updateSettings = (settings) => {
  setSelectedCardId(settings.creditCard.id);
  // Save immediately in handler
  setCreditCardsStorage({ cards, lastSelectedId: settings.creditCard.id });
};
```

## Migration Notes

This project was recently migrated from Next.js to React Router 7 + Vite. Some remnants from the Next.js setup may still exist.

### Key Migration Changes

- Environment variables: Changed from `NEXT_PUBLIC_*` to `VITE_*` prefix for client-side vars
- Build system: Switched from Next.js to Vite
- Routing: Now using React Router 7

## Environment Setup

### Deployment Strategy

This project uses **separate dev and prod environments**:

| Environment     | Convex Deployment | Railway Service | Use Case            |
| --------------- | ----------------- | --------------- | ------------------- |
| Local dev       | Dev               | -               | Development         |
| Railway Preview | Dev               | Preview         | PR reviews, testing |
| Railway Prod    | Prod              | Prod            | Production          |

**Key points:**

- Clerk and Stripe have separate test/prod API keys
- API keys (Unwrangle, Pure, Gold API, FMP) are shared across environments
- Cron jobs only run in Convex prod (`ENABLE_CRONS=true`)

### Environment Variables

See **[docs/environment-variables.md](docs/environment-variables.md)** for comprehensive documentation including:

- Complete variable reference with descriptions
- Environment matrix (what goes where)
- Setup checklists for local dev and Railway preview
- Troubleshooting guide

**Quick reference:**

- `.env.template` - Template file with empty values (committed to git)
- `.env.local` - Actual values for local dev (gitignored)
- Convex Dashboard - API keys and backend secrets
- Railway Dashboard - Runtime and build-time variables

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
- **Pure product mapping**: Only stores `pureProductId` for JOIN (not bid prices)
- Timestamps for tracking changes

#### priceHistory

Tracks all price changes over time for products.

#### stockHistory

Tracks stock status changes (in/out of stock).

#### collectPurePrices

Generic spot prices and bids from Collect Pure API for different metals (gold, silver, platinum, palladium). Used as fallback when no product-specific Pure match exists.

#### pureProducts

**Primary source for Pure bid prices**. Stores all Pure products with current bid prices:

- Pure product ID and name
- Metal type and weight
- Manufacturer and product type
- **Current bid price** (total and per oz)
- Last updated timestamp

This is the single source of truth for Pure bid prices. Dashboard JOINs this table with `costcoProducts` via `pureProductId`.

#### fetchRuns

Monitoring/debugging table tracking fetch operations from both Costco and Collect Pure sources.

#### marketPrices

Current market prices from Gold API and FMP for gold (XAU), silver (XAG), bitcoin (BTC), and S&P 500 (^GSPC).

- Current price
- 24h percentage change (calculated from our historical data for Gold API assets, provided directly by FMP for S&P 500)
- Last updated timestamp

#### marketPriceHistory

Historical price data for calculating 24h percentage changes.

- Price snapshots every 5 minutes
- Automatically cleaned up after 30 days
- Used to calculate percentage change by comparing current price to price from ~24 hours ago

## Data Flow

1. Fetch products from Costco (via Unwrangle Search API - discovers new products)
2. Verify in-stock products with Unwrangle Product API (accurate stock/price)
3. Fetch spot prices and bids from Collect Pure API (stored in `pureProducts` table)
4. Fetch market prices from Gold API (gold, silver, bitcoin) every 5 minutes
5. Fetch S&P 500 data from FMP API every 5 minutes during market hours (8 AM - 6 PM ET), hourly off-hours
6. Match Costco products to Pure products (only stores `pureProductId` on Costco products)
7. Track price/stock changes in history tables
8. Calculate 24h percentage changes from market price history (Gold API) or use API-provided change (FMP)
9. **Dashboard query JOINs Costco products with Pure products** to get fresh bid prices in real-time
10. Display comparison data with up-to-date spreads

### Unwrangle API Strategy (Costco Data)

**Dual API Approach** (implemented December 2024): Uses both Search API and Product API for optimal accuracy and credit efficiency.

| API                               | Purpose                                      | Cost               | Schedule                           |
| --------------------------------- | -------------------------------------------- | ------------------ | ---------------------------------- |
| **Search API** (`costco_search`)  | New product discovery, bulk stock/price data | ~1 credit/call     | Every 10 min during business hours |
| **Product API** (`costco_detail`) | Accurate stock/price verification            | 10 credits/product | Every hour during business hours   |

**Business Hours**: 9 AM - 6 PM CT (15:00 - 01:00 UTC)

**Credit Budget**: 100k/month, using ~30k/month with current setup

**Why Two APIs**:

- Search API is efficient for discovering new products and getting bulk data
- Search API stock/price can be stale or inaccurate
- Product API provides real-time accurate data but costs 10x per product
- Hybrid approach: Search for discovery, Product API for verification

**Functions** (`convex/costco.ts`):

- `fetchNewData()`: Search API - discovers products, updates DB, marks unseen as OOS
- `verifyInStockProducts()`: Product API - verifies all in-stock products
- `fetchProductDetails()`: Single product fetch via Product API

**Cron Jobs** (`convex/crons.ts`):

- `fetch-costco-search`: Every 10 min during business hours
- `verify-costco-products`: Every hour during business hours

### Pure Bid Price Architecture

**Important**: Costco products only store the `pureProductId` mapping - they do NOT store Pure bid prices. This ensures bid prices are always fresh:

- **Single source of truth**: Pure bid prices live exclusively in the `pureProducts` table
- **No data duplication**: Eliminates staleness issues from copied bid prices
- **Fresh data**: Dashboard query JOINs `costcoProducts` with `pureProducts` to get current bids
- **Fallback**: Generic spot prices from `collectPurePrices` used when no product-specific match exists

This architecture was implemented in January 2025 to fix stale bid price issues (see `convex/migrations.ts`).

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
bun run ci           # Run all checks (format, lint, typecheck) in parallel
bun run test         # Run unit tests (one-off)
bun run test:watch   # Run tests in watch mode
bun run test:browser # Run browser-mode tests (vitest-example/)
bun run typecheck    # Run TypeScript checks
bun run lint         # Run ESLint
bun run lint:fix     # Run ESLint with auto-fix
bun run format       # Format with Prettier
bun run format:check # Check formatting without fixing
```

### CI Script

A custom TypeScript CI script (`scripts/ci.ts`) with a visual status dashboard:

- **Command**: `bun run ci`
- **Checks**: Runs `format`, `lint:fix`, `typecheck`, `test`, and `test:browser` sequentially
- **Features**:
  - Real-time status updates with color-coded output
  - Individual timing for each check
  - Total run time summary
  - Continues running all checks even if one fails (to see all issues)
  - Exits with error code if any check fails

**Example Output**:

```
====== CI CHECKS ======

format       : SUCCESS (1.57s)
lint         : SUCCESS (3.44s)
typecheck    : SUCCESS (2.72s)
test         : SUCCESS (0.95s)
test:browser : SUCCESS (1.31s)

✓ All checks passed successfully!

Total run time: 10.00s
```

Sequential execution avoids race conditions with React Router's typegen and provides clear error isolation.

Use this before pushing to main to ensure code quality without the overhead of a full CI/CD pipeline during MVP phase.

## Testing

**Framework**: Vitest (configured via Vite)

**Test Types**:

- **Unit Tests**: `.test.ts` / `.test.tsx` for pure functions and logic
- **Browser Tests**: `.browser.test.tsx` for UI components and interactions

**Test Pattern**:

- Co-located test files with `.test.ts` / `.test.tsx` pattern (unit) or `.browser.test.tsx` (browser)
- Simple `test()` function calls (not `describe/it`)
- Focus on critical paths and edge cases, not 100% coverage

**Current Coverage**:

### Unit Tests (60 tests)

- ✅ `app/utils/product-calculations.ts` - Core business logic (14 tests)
  - Profit calculations with various cashback combinations
  - Above spot percentage calculations
  - Edge cases (missing bid prices, zero values, null data)
  - Color coding for profit/loss
  - Fee tier calculations
  - High-value credit card scenarios
- ✅ `app/lib/credit-cards.ts` - Credit card management (30 tests)
  - Zod schema validation (valid/invalid cards, edge cases)
  - Cashback percentage calculations
  - CRUD operations (add, update, delete, reset)
  - Preset card management and merging
  - Card sorting (presets first, alphabetical)
  - Default preset card validation
- ✅ `app/utils/format.test.ts` - Formatting utilities (16 tests)

### Browser Tests (9 tests)

Powered by Vitest Browser Mode with Playwright (headless Chromium):

- ✅ `app/components/ui/button.browser.test.tsx` - Button component (5 tests)
  - Rendering with different variants (default, destructive, outline)
  - Click interactions and event handlers
  - Disabled state
  - Different sizes (default, sm, lg, icon)
- ✅ `app/components/header/theme-toggle.browser.test.tsx` - Theme toggle (4 tests)
  - Button visibility
  - Dropdown menu interactions
  - Light/dark theme selection with DOM verification

**Test Structure**:

```
app/
├── utils/
│   ├── product-calculations.ts
│   ├── product-calculations.test.ts  ✅ 14 unit tests
│   ├── format.ts
│   └── format.test.ts                ✅ 16 unit tests
├── lib/
│   ├── credit-cards.ts
│   └── credit-cards.test.ts          ✅ 30 unit tests
├── components/
│   ├── ui/
│   │   ├── button.tsx
│   │   └── button.browser.test.tsx   ✅ 5 browser tests
│   └── header/
│       ├── theme-toggle.tsx
│       └── theme-toggle.browser.test.tsx  ✅ 4 browser tests
```

**Total**: 69 tests passing (60 unit + 9 browser)

**Running Tests**:

```bash
# Unit tests only
bun run test         # Run once
bun run test:watch   # Watch mode for TDD

# Browser tests only (headless Chromium)
bun run test:browser         # Run once
bun run test:browser:watch   # Watch mode

# All tests
bun run test && bun run test:browser
```

**Configuration**:

- Unit tests: `vitest.config.ts` (excludes `*.browser.test.{ts,tsx}`)
- Browser tests: `vitest.browser.config.ts` (includes only `*.browser.test.{ts,tsx}`)
- Path aliases (`@/*`) work automatically via `vite-tsconfig-paths`
- Browser tests run in headless mode for CI/CD compatibility

**Philosophy**: Write focused, effective tests that catch real bugs. Avoid testing implementation details or chasing coverage metrics.

**Documentation**: See `docs/browser-testing.md` for detailed browser testing guide including:

- How to write browser tests with vitest-browser-react
- Key API differences from unit tests (async render, query methods, interactions)
- Testing with providers (ThemeProvider, etc.)
- Troubleshooting common issues
- When to use browser tests vs unit tests

## Convex Setup

Convex is configured to use the production deployment (`effervescent-dog-80`) for all development and production work.

**Authentication**: Clerk auth is enabled in production. See `.sessions/alerts.md` for the full auth/subscription rollout history.

To run Convex in development:

```bash
npx convex dev  # Connects to production deployment
```

**Important**: Since dev and prod share the same deployment, be cautious with:

- Schema changes (test carefully before deploying)
- Mutations that modify data
- Cron jobs (ensure they don't run multiple times)

## Market Price Tracking

### Gold API Integration

**Integration**: `convex/twelve.ts` (Note: file name is legacy from Twelve Data migration)

#### Overview

Tracks real-time prices for gold, silver, and bitcoin using the free Gold API (https://gold-api.com). These prices are displayed on the dashboard for market context.

#### Assets Tracked

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

#### Relationship with Pure API

Gold API and Pure API serve different purposes:

- **Gold API**: General market prices for dashboard display with 24h trends
- **Pure API**: Product-specific bid prices for calculating Costco arbitrage opportunities
- Both track gold/silver spots, but Pure spots are used for spread calculations (more accurate for actual bids)
- Gold/Silver overlap is intentional - provides data redundancy and validation

### FMP (Financial Modeling Prep) Integration

**Integration**: `convex/fmp.ts`

#### Overview

Tracks S&P 500 index price using the Financial Modeling Prep API (https://site.financialmodelingprep.com). Provides market context alongside precious metals and bitcoin prices.

#### Asset Tracked

- **S&P 500 (^GSPC)**: US stock market index price

#### Implementation Details

**Fetch Frequency**:

- Market hours (8 AM - 6 PM ET): Every 5 minutes via cron job
- Off-hours: Every hour to maintain last known price
- API Call Estimate: ~134 calls/day (within 250/day free tier limit)

**API Endpoint**: `https://financialmodelingprep.com/stable/quote?symbol=%5EGSPC`

- Requires API key authentication (`FMP_API_KEY`)
- Returns current price with percentage change from previous close
- Free tier: 250 calls per day

**Percentage Change**:

- FMP provides `changePercentage` directly (previous close to current)
- No manual calculation needed (unlike Gold API)
- Still adds to `marketPriceHistory` for record-keeping

**Functions**:

- `fetchSP500()`: Internal action called by cron, fetches S&P 500 quote
- `upsertSP500Price()`: Internal mutation that updates current price and adds to history
- `getSP500Price()`: Public query returning current S&P 500 data (included in `dashboard.getStats`)
- `getSP500History()`: Debug query to view historical snapshots

**Market Hours Detection**:

- Automatically adjusts for Standard Time (Nov-Mar) and Daylight Time (Mar-Nov)
- Cron schedule covers both time zones (12-22 UTC for market hours)

**Data Access**:

- S&P 500 data is included in `api.dashboard.getStats` alongside other market prices
- Single consolidated query for all dashboard data

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
    - S&P 500 (^GSPC) index price with daily % change indicator
  - **Dashboard Stats** (right side, 140px cards):
    - Total Cashback percentage
    - Last Update timestamp
  - **Trend Indicators**: Green ↗️ for positive change, Red ↘️ for negative change
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
  - Credit card combobox selector with searchable dropdown
  - "Manage Cards" option to open card manager drawer

#### Credit Card Management System (`app/components/card-manager-drawer.tsx`, `app/lib/credit-cards.ts`)

**Implemented**: January 2025 - Full credit card management with local storage persistence

**Features**:

- **Custom Card Structure**: Cards defined by points per dollar and value per point
  - Points Per Dollar: Earn rate (e.g., 1.5x, 2x, 3x)
  - Value Per Point: Dollar value per point (e.g., 0.021 = 2.1¢)
  - Effective Cashback: Auto-calculated as `pointsPerDollar × valuePerPoint × 100`
- **Preset Cards**: Pre-configured cards with customizable values
  - Chase Freedom Unlimited: 1.5 pts/$ @ 2.1¢/pt = 3.15%
  - Capital One Venture X: 2.0 pts/$ @ 1¢/pt = 2.0%
  - Robinhood Gold Card: 3.0 pts/$ @ 1¢/pt = 3.0%
- **Custom Cards**: Add unlimited custom cards with your own values
- **Card Manager Drawer**: Responsive sheet component (full width mobile, max-w-lg desktop)
- **Add/Edit/Delete**: Full CRUD operations for custom cards
- **Preset Customization**: Modify preset card values (reset to defaults available)
- **Combobox Selector**: Searchable dropdown with card name/issuer filtering
- **Local Storage**: Zod-validated persistence with auto-save
- **Last Selected**: Remembers last selected card across sessions
- **Form Validation**: React Hook Form with Zod resolver for real-time validation
- **Toast Notifications**: Sonner toast notifications for success/error feedback
- **Confirmation Dialogs**: Reusable confirmation dialogs for delete/reset actions with danger variants

**Key Files**:

- `app/lib/credit-cards.ts` - Zod schemas, validation, CRUD utilities, storage helpers
- `app/components/card-manager-drawer.tsx` - Card management UI with React Hook Form and toast notifications
- `app/components/ui/confirmation-dialog.tsx` - Reusable confirmation dialog component
- `app/components/ui/sonner.tsx` - Sonner toast component with theme support
- `app/components/dashboard/calculator-controls.tsx` - Combobox selector with "Manage Cards"
- `app/components/calculator-settings.tsx` - Legacy type compatibility layer

**Data Structure** (Zod validated):

```typescript
{
  id: string;              // Unique identifier
  name: string;            // Card name (1-100 chars)
  issuer?: string;         // Optional issuer (Chase, AmEx, etc.)
  pointsPerDollar: number; // Earn rate (0-100)
  valuePerPoint: number;   // Value in dollars (0-1)
  isPreset: boolean;       // Whether it's a preset card
  isCustomizable: boolean; // Whether preset can be modified
}
```

**Local Storage Schema**:

```typescript
{
  cards: CreditCard[];     // All cards (presets + custom)
  lastSelectedId?: string; // Last selected card ID
}
```

**Migration to Database** (when auth is enabled):

- Local storage serves as fallback for anonymous users
- Create Convex table: `userCreditCards` with userId foreign key
- Replace `loadCreditCards()` with Convex query
- Replace `saveCreditCards()` with Convex mutations
- Keep local storage for offline/anonymous usage

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
   - Market prices (gold, silver, bitcoin, S&P 500) with trend indicators
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
- `app/components/dashboard/calculator-controls.tsx` - Credit card combobox selector
- `app/components/dashboard/filter-controls.tsx` - Filter controls (metal type, sort, out of stock)
- `app/components/product-card.tsx` - Individual product card
- `app/components/card-manager-drawer.tsx` - Credit card management drawer with React Hook Form
- `app/components/ui/confirmation-dialog.tsx` - Reusable confirmation dialog
- `app/components/ui/sonner.tsx` - Sonner toast component
- `app/components/calculator-settings.tsx` - Legacy credit card compatibility layer
- `app/components/theme-toggle.tsx` - Dark mode toggle
- `app/lib/credit-cards.ts` - Credit card schemas, validation, and storage utilities
- `app/utils/product-calculations.ts` - Product metric calculations with credit card support
- `app/providers/theme-provider.tsx` - Theme context with localStorage
- `app/providers/convex-provider.tsx` - Convex client setup
- `convex/dashboard.ts` - Consolidated getStats query with all dashboard data

### Future Enhancements

See `TASKS.md` for planned features including:

- Price history charts
- Favorites/watchlist
- Product comparison tools

## Docker Deployment

### Testing Docker Locally

To test the Docker container before deploying to Railway:

#### 1. Build the Docker Image

```bash
source .env.local && docker build \
  --build-arg VITE_CONVEX_URL="$VITE_CONVEX_URL" \
  --build-arg VITE_CLERK_PUBLISHABLE_KEY="$VITE_CLERK_PUBLISHABLE_KEY" \
  -t gold-dashboard:test \
  .
```

**Note**: VITE\_ variables must be passed as build args because they're embedded in the client bundle at build time.

#### 2. Run the Container

```bash
source .env.local && docker run -d \
  --name gold-dashboard-test \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e VITE_CONVEX_URL="$VITE_CONVEX_URL" \
  -e VITE_CLERK_PUBLISHABLE_KEY="$VITE_CLERK_PUBLISHABLE_KEY" \
  -e CONVEX_DEPLOYMENT="$CONVEX_DEPLOYMENT" \
  -e UNWRANGLE_API_KEY="$UNWRANGLE_API_KEY" \
  -e PURE_API_KEY="$PURE_API_KEY" \
  -e GOLD_API_KEY="$GOLD_API_KEY" \
  -e FMP_API_KEY="$FMP_API_KEY" \
  -e CLERK_SECRET_KEY="$CLERK_SECRET_KEY" \
  -e VITE_PUBLIC_POSTHOG_KEY="${VITE_PUBLIC_POSTHOG_KEY:-}" \
  -e VITE_PUBLIC_POSTHOG_HOST="${VITE_PUBLIC_POSTHOG_HOST:-}" \
  gold-dashboard:test
```

**Note**: VITE\_ variables need to be passed at BOTH build time (as build args) AND runtime (as env vars) because they're used by both the client bundle and server-side loaders/middleware.

#### 3. Test the Container

```bash
# Check logs
docker logs gold-dashboard-test

# Should show: [react-router-serve] http://localhost:3000 (http://172.17.0.2:3000)

# Test HTTP endpoint
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" http://localhost:3000

# Should return: HTTP Status: 200

# View in browser
open http://localhost:3000
```

#### 4. Clean Up

```bash
# Stop and remove container
docker stop gold-dashboard-test && docker rm gold-dashboard-test

# Remove image (optional)
docker rmi gold-dashboard:test
```

### Dockerfile Details

**Current build output path**: `./build/server/index.js`

**Important**: React Router 7's build output structure changed. The server bundle is now directly at `build/server/index.js`, not in a runtime-specific subdirectory.

If the container fails to start with "Cannot find module" error, verify the build output path:

```bash
docker run --rm gold-dashboard:test ls -la /app/build/server/
```

## Analytics (PostHog)

### Setup

PostHog is configured for user analytics and pageview tracking:

- **Provider**: `PostHogProvider` wraps the app in `app/root.tsx`
- **Package**: `posthog-js` with React integration (`posthog-js/react`)
- **Auto-tracking**: SPA navigation via `defaults: '2025-05-24'` config
- **Debug mode**: Enabled in development via `debug: import.meta.env.MODE === "development"`

### Environment Variables

PostHog requires two client-side env vars (must be set as both build args AND runtime env vars):

```bash
VITE_PUBLIC_POSTHOG_KEY=phc_xxxx  # Your PostHog API key
VITE_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com  # or eu.i.posthog.com for EU
```

**Important**: These variables are:

1. Embedded in the client bundle at build time (via Vite)
2. Checked server-side in `app/root.tsx` to validate they're set
3. Must be present in both `.env.local` (dev) and Railway env vars (prod)

### SSR Configuration

PostHog requires special SSR handling in `vite.config.ts`:

```typescript
ssr: {
  noExternal: ["posthog-js/react"],
}
```

This prevents SSR errors by bundling PostHog with the server code instead of treating it as an external module.

### Production Deployment

For Railway/Docker deployment, ensure:

1. `Dockerfile` includes PostHog env vars as build args (lines 18-19, 23-24)
2. Railway env vars include both `VITE_PUBLIC_POSTHOG_KEY` and `VITE_PUBLIC_POSTHOG_HOST`
3. Check browser console for PostHog initialization (should see PostHog debug messages in dev mode)

### Troubleshooting

**Issue**: PostHog not tracking in production but works locally

- **Cause**: Missing env vars in Railway/Docker build
- **Fix**: Verify Railway env vars include both PostHog variables
- **Check**: View Railway build logs for "VITE_PUBLIC_POSTHOG_KEY is not set" error

**Issue**: SSR errors with PostHog

- **Cause**: Incorrect `vite.config.ts` SSR externals
- **Fix**: Use `noExternal: ["posthog-js/react"]` (not `@posthog/react`)

## Project Status

- ✅ Dependencies installed
- ✅ Environment variables configured
- ✅ Type checking passes
- ✅ Dev server running
- ✅ UI fully implemented with SSR and real-time updates
- ✅ Docker container tested and working
- ✅ PostHog analytics configured for dev and prod
- ✅ Credit card management system with local storage (January 2025)
  - Custom card creation with Zod validation
  - Preset card customization (points per dollar & value per point)
  - Searchable combobox selector with "Manage Cards" option
  - Responsive drawer UI (Sheet component)
  - Auto-save to local storage with last selected card persistence
  - React Hook Form integration with real-time validation
  - Sonner toast notifications for user feedback
  - Confirmation dialogs for destructive actions (delete/reset)
- ✅ Clerk authentication enabled in production
- ✅ User data migration (localStorage → Convex) complete
- ✅ Stripe subscription integration (checkout, webhooks, entitlements)
- ✅ Alert system core (schema, CRUD, evaluation engine, email delivery) — production rollout pending
