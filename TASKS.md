# Tasks

## Now

- Convex auth + query hardening → [.epics/convex-auth-query-hardening.md]
- Reconcile docs/tooling drift → [.tasks/docs-source-of-truth.md]
- Split `app/routes/alerts.tsx` into smaller modules → [.tasks/split-alerts-route.md]
- Alerts: UI polish + test coverage → [.epics/alerts.md]

## Epics

- **Convex Auth + Query Hardening** — [.epics/convex-auth-query-hardening.md] — In Progress
- **Alerts & Subscriptions** — [.epics/alerts.md] — In Progress
- **Filters & Sorting** — weight, brand, price range, "only deals" toggle — Not Started

## Up Next

- UI component tests: swipeable-card, filters, calculator-controls
- Fix dashboard filter URL updates so rapid changes do not clobber other search params → [.tasks/dashboard-filter-url-state.md]
- Add composite indexes for alert batching/history lookup paths
- Add route tests for dashboard filters, alerts flows, and admin access → [.tasks/route-test-coverage.md]
- Add Convex tests for Stripe checkout, portal, and subscription status flows
- Replace hardcoded dashboard OG/site URL with the canonical site URL source
- Convert public page chrome into a shared layout route for dashboard and alerts → [.tasks/public-layout-route.md]
- Audit unconditional `checkIsAdmin` queries in header/mobile navigation → [.tasks/admin-check-callsite-audit.md]
- Split `app/components/admin/*` oversized files → [.tasks/split-admin-components.md]
- Split `app/hooks/use-user-credit-cards.ts` → [.tasks/split-user-credit-cards-hook.md]
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

- Split `convex/alerts.ts` by public API, batching, and email delivery concerns
- Split `convex/admin.ts` by review queries, matching workflows, and Pure ingestion
- Split `app/components/card-manager-drawer.tsx` and `app/components/admin/product-match-card.tsx`
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
- Performance regression fixtures for `dashboard.getStats` and admin review query shapes
