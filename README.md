# Dashboard.Gold

A real-time precious metals price tracking dashboard that monitors Costco gold/silver products and compares them with Collect Pure bid prices to identify arbitrage opportunities.

## What It Does

- **Tracks Costco Products**: Monitors precious metals (gold/silver bars and coins) from Costco
- **Calculates Arbitrage**: Compares Costco prices (after cashback) with Collect Pure bid prices to find profit opportunities
- **Market Context**: Displays current prices for Gold (XAU), Silver (XAG), Bitcoin (BTC), and S&P 500 with trend indicators
- **Cashback Calculator**: Factors in Costco Executive membership (2%) and credit card rewards (up to 3.15%)
- **Real-time Updates**: Live data via WebSocket subscriptions

## Tech Stack

- **Frontend**: React Router 7, TypeScript 6 + tsgo, Tailwind CSS v4
- **Runtime**: Bun
- **Backend/Database**: Convex (serverless backend with real-time sync)
- **APIs**:
  - Unwrangle API (Costco product data)
  - Collect Pure API (precious metals bid prices)
  - Gold API (XAU/XAG/BTC prices)
  - Financial Modeling Prep API (S&P 500 data)

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) installed
- Convex account ([convex.dev](https://convex.dev))
- API keys (see Environment Setup below)

### Installation

1. **Clone and install dependencies**:

   ```bash
   bun install
   ```

2. **Configure environment variables**:

   Copy `.env.template` to `.env.local` and fill in the values used by the local app process:

   ```bash
   cp .env.template .env.local
   ```

   Required in `.env.local`:
   - `VITE_CONVEX_URL` - Your Convex deployment URL
   - `CONVEX_DEPLOYMENT` - Your Convex deployment (typically `dev:...` locally, `prod:...` in production)
   - `VITE_CLERK_PUBLISHABLE_KEY` - Clerk frontend key
   - `VITE_PUBLIC_POSTHOG_KEY` / `VITE_PUBLIC_POSTHOG_HOST` - PostHog client config

   Convex-only secrets such as `UNWRANGLE_API_KEY`, `PURE_API_KEY`, `GOLD_API_KEY`, and `FMP_API_KEY`
   are read by Convex functions from the target deployment's environment, not from `.env.local`.

3. **Set up Convex**:

   This project uses separate Convex deployments:
   - Local dev and Railway Preview point at Convex dev
   - Railway production points at Convex prod
   - Production data can be copied into dev with `bun run snapshot:sync`

   ```bash
   # Deploy schema and functions to your dev deployment first
   CONVEX_DEPLOYMENT=dev:your-dev-deployment npx convex deploy

   # Set Convex env vars on each deployment that needs them
   CONVEX_DEPLOYMENT=dev:your-dev-deployment npx convex env set UNWRANGLE_API_KEY "your-key"
   CONVEX_DEPLOYMENT=dev:your-dev-deployment npx convex env set PURE_API_KEY "your-key"
   CONVEX_DEPLOYMENT=dev:your-dev-deployment npx convex env set GOLD_API_KEY "your-key"
   CONVEX_DEPLOYMENT=dev:your-dev-deployment npx convex env set FMP_API_KEY "your-key"
   ```

4. **Start development server**:

   ```bash
   bun run dev
   ```

   Your app will be available at `http://localhost:5173`

### Initial Data Population

For local development, seed Convex dev from a production snapshot:

```bash
bun run snapshot:sync
```

Most data refreshes are driven by Convex cron jobs and internal-only functions, so they are not meant to
be triggered directly from the CLI. For local/dev environments, use snapshots as the default bootstrap.

```bash
# Public manual refresh wrapper for Pure prices, when needed
CONVEX_DEPLOYMENT=dev:your-dev-deployment npx convex run pure:manualFetchPrices
```

There is no public CLI wrapper today for the Costco, Gold API, or FMP refresh jobs.

## Available Scripts

```bash
bun run dev          # Start dev server with HMR
bun run build        # Production build
bun run ci           # Run the full CI suite locally
bun run ts           # Typecheck with tsgo (native Go compiler)
bun run lint         # Run OXLint
bun run format       # Format with oxfmt
```

## Convex Functions

The backend uses Convex for serverless functions and real-time data:

- **Cron Jobs**: Automatically fetch data every 5-20 minutes
- **Queries**: `dashboard.getStats` - Single query fetches all dashboard data
- **Mutations**: Product matching, price updates, stock tracking
- **Actions**: External API fetches (Costco, Pure, Gold API, FMP)

## Project Structure

```
├── app/
│   ├── components/        # React components
│   ├── routes/            # React Router pages
│   └── providers/         # Context providers (Convex, theme)
├── convex/
│   ├── schema.ts          # Database schema
│   ├── dashboard.ts       # Main query for frontend
│   ├── costco.ts          # Costco product fetching
│   ├── pure.ts            # Collect Pure integration
│   ├── marketPrices.ts    # Gold API integration (XAU/XAG/BTC)
│   ├── fmp.ts             # FMP API integration (S&P 500)
│   └── crons.ts           # Scheduled jobs
├── scripts/
│   └── snapshot.ts        # Prod-to-dev Convex snapshot sync tooling
├── CLAUDE.md              # Project documentation (symlinked as AGENTS.md)
└── TASKS.md               # Task board
```

## Documentation

- **[CLAUDE.md](./CLAUDE.md)** - Complete project documentation including tech stack, database schema, API integrations, and UI implementation
- **[TASKS.md](./TASKS.md)** - Task board with current priorities

## Key Features

- **Server-Side Rendering**: Fast initial page loads with React Router 7
- **Real-time Updates**: Live data sync via Convex WebSocket subscriptions
- **Smart Product Matching**: Automatic matching of Costco products to Pure bids with fallback system
- **Dark Mode**: Theme toggle with system preference detection
- **Responsive Design**: Mobile-first UI with Tailwind CSS v4
- **Type Safety**: Full TypeScript coverage with Convex schema validation

## License

Private project - All rights reserved

---

Built with React Router 7, Convex, and Bun.
