# Tasks

## Now

- Reconcile docs/tooling drift (README mentions ESLint/Prettier, market-prices doc references twelve.ts)
- Split `app/routes/alerts.tsx` into smaller modules
- Split `app/components/admin/*` oversized files
- Split `app/hooks/use-user-credit-cards.ts`
- Alerts: UI polish + test coverage → [.epics/alerts.md]

## Epics

- **Alerts & Subscriptions** — [.epics/alerts.md] — In Progress
- **Filters & Sorting** — weight, brand, price range, "only deals" toggle — Not Started

## Up Next

- Convex integration tests (alerts CRUD, stripe webhooks)
- Performance guardrails for `dashboard.getStats` and admin queries
- UI component tests: swipeable-card, filters, calculator-controls
- Audit Convex auth: `identity.subject` vs `identity.tokenIdentifier` for user-owned records
- Replace alerts page dependency on `dashboard.getStats` with a minimal product-options query
- Guard unbounded `.collect()` in `dashboard.getStats` and `admin.getProductsForReview`
- Loading skeletons instead of empty states
- Error boundaries around product grid
- Placeholder images for missing product thumbnails
- Retry mechanism for failed data loads
- Create OG image (1200x630, see git history for design notes)
- Test on real mobile devices
- Data freshness indicators
- Fallback UI when market prices fail
- Sentry: structured logs for alerts, checkout, and auth flows
- Match status UI (currently manual via Convex dashboard)

## Later

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

