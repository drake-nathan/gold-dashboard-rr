# Market Price Tracking

## Gold API Integration

**File**: `convex/marketPrices.ts`

### Assets Tracked

- **Gold (XAU)**: Spot price in USD per troy ounce
- **Silver (XAG)**: Spot price in USD per troy ounce
- **Bitcoin (BTC)**: Price in USD

### Implementation

- **Fetch**: Every 5 minutes via cron job (`convex/crons.ts`)
- **API**: `https://api.gold-api.com/price/{symbol}` — no auth required, no rate limits
- **24h % Change**: Calculated from our own `marketPriceHistory` table (compare current to ~24h ago with ±30 min window)
- **History cleanup**: Entries older than 30 days auto-deleted

### Functions

- `fetchMarketPrices()` — Internal action called by cron
- `upsertMarketPrice()` — Internal mutation: updates price, adds history, calculates % change
- `getMarketPrices()` — Public query (included in `dashboard.getStats`)
- `getMarketPrice()` — Public query for specific asset
- `getPriceHistory()` — Debug query

**Note**: `GOLD_API_KEY` env var exists but is NOT used for real-time fetches (only for historical data API which we don't use).

---

## FMP (Financial Modeling Prep) Integration

**File**: `convex/fmp.ts`

### Asset Tracked

- **S&P 500 (^GSPC)**: US stock market index

### Implementation

- **Market hours (8 AM - 6 PM ET)**: Every 5 minutes
- **Off-hours**: Every hour
- **API**: `https://financialmodelingprep.com/stable/quote?symbol=%5EGSPC` — requires `FMP_API_KEY`
- **Free tier**: 250 calls/day, using ~134/day
- **% Change**: FMP provides `changePercentage` directly (no manual calculation)
- **Market hours detection**: Auto-adjusts for Standard/Daylight time

### Functions

- `fetchSP500()` — Internal action called by cron
- `upsertSP500Price()` — Internal mutation
- `getSP500Price()` — Public query (included in `dashboard.getStats`)
- `getSP500History()` — Debug query

---

## Relationship Between APIs

- **Gold API**: General market prices for dashboard display with 24h trends
- **Pure API**: Product-specific bid prices for calculating Costco arbitrage opportunities
- Both track gold/silver spots, but Pure spots are used for spread calculations
- Gold/Silver overlap is intentional — data redundancy and validation
