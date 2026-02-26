# Dashboard.Gold

A real-time precious metals price tracking dashboard that monitors Costco gold/silver products and compares them with Collect Pure bid prices to identify arbitrage opportunities.

## What It Does

- **Tracks Costco Products**: Monitors precious metals (gold/silver bars and coins) from Costco
- **Calculates Arbitrage**: Compares Costco prices (after cashback) with Collect Pure bid prices to find profit opportunities
- **Market Context**: Displays current prices for Gold (XAU), Silver (XAG), Bitcoin (BTC), and S&P 500 with trend indicators
- **Cashback Calculator**: Factors in Costco Executive membership (2%) and credit card rewards (up to 3.15%)
- **Real-time Updates**: Live data via WebSocket subscriptions

## Tech Stack

- **Frontend**: React Router 7, TypeScript, Tailwind CSS v4
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

   Copy `.env.template` to `.env.local` and fill in your values:

   ```bash
   cp .env.template .env.local
   ```

   Required variables:
   - `VITE_CONVEX_URL` - Your Convex deployment URL
   - `CONVEX_DEPLOYMENT` - Your Convex deployment (e.g., `prod:your-deployment-name`)
   - `UNWRANGLE_API_KEY` - Costco product data
   - `PURE_API_KEY` - Collect Pure bid prices
   - `GOLD_API_KEY` - Market prices (XAU/XAG/BTC)
   - `FMP_API_KEY` - S&P 500 data

3. **Set up Convex**:

   **Important**: This project uses a single **production-only** Convex deployment for both dev and prod. This avoids duplicating product mappings and wasting API calls on market data.

   ```bash
   # Deploy schema and functions to production
   CONVEX_DEPLOYMENT=prod:your-deployment-name npx convex deploy

   # Set environment variables in Convex
   CONVEX_DEPLOYMENT=prod:your-deployment-name npx convex env set UNWRANGLE_API_KEY "your-key"
   CONVEX_DEPLOYMENT=prod:your-deployment-name npx convex env set PURE_API_KEY "your-key"
   CONVEX_DEPLOYMENT=prod:your-deployment-name npx convex env set GOLD_API_KEY "your-key"
   CONVEX_DEPLOYMENT=prod:your-deployment-name npx convex env set FMP_API_KEY "your-key"
   ```

4. **Start development server**:

   ```bash
   bun run dev
   ```

   Your app will be available at `http://localhost:5173`

### Initial Data Population

Cron jobs will automatically fetch data, but you can manually trigger initial fetches:

```bash
# Fetch Collect Pure products and prices
CONVEX_DEPLOYMENT=prod:your-deployment-name npx convex run pure:fetchNewData

# Fetch Costco products (will auto-match to Pure products)
CONVEX_DEPLOYMENT=prod:your-deployment-name npx convex run costco:fetchNewData

# Fetch market prices
CONVEX_DEPLOYMENT=prod:your-deployment-name npx convex run twelve:fetchMarketPrices
CONVEX_DEPLOYMENT=prod:your-deployment-name npx convex run fmp:fetchSP500
```

## Available Scripts

```bash
bun run dev          # Start dev server with HMR
bun run build        # Production build
bun run typecheck    # Run TypeScript checks
bun run lint         # Run ESLint
bun run format       # Format with Prettier
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
│   ├── twelve.ts          # Gold API integration (XAU/XAG/BTC)
│   ├── fmp.ts             # FMP API integration (S&P 500)
│   └── crons.ts           # Scheduled jobs
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
