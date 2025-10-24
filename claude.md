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

## UI Implementation

### Current State

The dashboard UI is fully implemented and functional. Located in `app/components/` and `app/routes/home.tsx`.

### Components

#### Dashboard (`app/components/dashboard.tsx`)

Main dashboard component that orchestrates the entire UI:

- **Page Header**: Minimal sticky header with title and auth placeholders
- **Stats Cards Row**: Uniform-width cards (140px) displaying:
  - Total Products count
  - Gold products count
  - Silver products count
  - Gold Spot price
  - Gold Bid price
  - Silver Spot price
  - Silver Bid price
  - Total Cashback percentage
  - Last Update timestamp
- **Filter/Calculator Bar**: Single row with filters on left, calculator settings on right
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

- **Loader** (`app/routes/home.tsx`): Pre-fetches data on server using `preloadQuery` from `convex/nextjs`
- **Component**: Uses `usePreloadedQuery` from `convex/react` for:
  - Immediate rendering with server data (no loading spinner)
  - Automatic WebSocket subscription for real-time updates
  - Seamless transition from server to live data

This provides optimal performance with instant page loads and real-time reactivity.

### Styling & Layout

- **Tailwind CSS v4**: All components use Tailwind for styling
- **Shadcn UI**: Pre-installed components in `app/components/ui/`
- **Responsive Design**: Mobile-first with breakpoints for sm/md/lg/xl/2xl
- **Card Grid**: 1 column (mobile) → 2-3 (tablet) → 4-5 (desktop)
- **Uniform Cards**: All stat cards have consistent 140px width for visual balance

### Data Flow

1. Server loader pre-fetches `api.dashboard.getStats` from Convex
2. Data includes:
   - Gold and silver products with spread calculations
   - Collect Pure spot/bid prices
   - Last fetch timestamp
3. Component transforms data to `ProductCardData` format
4. Dashboard passes data to product cards
5. Calculator settings adjust spread calculations in real-time
6. Filters modify displayed product list

### Key Files

- `app/routes/home.tsx` - Main route with loader and data transformation
- `app/components/dashboard.tsx` - Main dashboard layout and state
- `app/components/product-card.tsx` - Individual product card
- `app/components/calculator-settings.tsx` - Credit card presets and types
- `app/components/product-filters.tsx` - Filter types and constants
- `app/components/theme-toggle.tsx` - Dark mode toggle
- `app/providers/theme-provider.tsx` - Theme context with localStorage
- `app/providers/convex-provider.tsx` - Convex client setup

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
