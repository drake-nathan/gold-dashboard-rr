# Tasks

## Now

- Alerts: error-state polish + remaining test coverage, then ramp `alerts-beta` to all signed-in users → [.epics/alerts.md]
- Observability strategy docs + rollout plan → [.epics/observability-overhaul.md]

## Epics

- **Alerts & Subscriptions** — [.epics/alerts.md] — In Progress
- **Environment Config Hardening** — [.epics/environment-config-hardening.md] — In Progress
- **Observability Overhaul** — [.epics/observability-overhaul.md] — In Progress
- **Filters & Sorting** — weight, brand, price range, "only deals" toggle — Not Started

## Up Next

- Define a canonical env schema and replace ad hoc env validation/access across app, Convex, Docker, and hosted config → [.epics/environment-config-hardening.md]
- Standardize remaining UI primitive composition on Base UI `render` and reduce compatibility-only `asChild` usage
- Remove temporary Convex `dashboard:getStats` compatibility query after stale cached clients age out
- Fix dashboard filter URL updates so rapid changes do not clobber other search params → [.tasks/dashboard-filter-url-state.md]
- Replace hardcoded dashboard OG/site URL with the canonical site URL source
- Split `app/features/credit-cards/hooks/use-user-credit-cards.ts` → [.tasks/split-user-credit-cards-hook.md]
- Loading skeletons instead of empty states
- Error boundaries around product grid
- Placeholder images for missing product thumbnails
- Retry mechanism for failed data loads
- Create OG image (1200x630, see git history for design notes)
- Test on real mobile devices
- Data freshness indicators
- Fallback UI when market prices fail
- Structured logs for alerts, checkout, and auth flows
- Match status UI (currently manual via Convex dashboard)

## Later

- Split `app/routes/dashboard/cards/card-manager-drawer.tsx`
- Price history charts for individual products
- Stock availability notifications (extend alerts system)
- Trending products (best spreads over time)
- Favorites / watchlist
- Product comparison tool (side-by-side)
- Animations / transitions
- Pagination / virtual scrolling for large product lists
- Image optimization (lazy loading, srcset)
- Export product data to CSV
- RSS feed for deals
- Multi-currency support
- Credit card: more presets, color/icon customization, bulk import/export

## Testing

- Browser coverage for route modules excluded from coverage (`dashboard`, `alerts`, `admin`, `root`)
