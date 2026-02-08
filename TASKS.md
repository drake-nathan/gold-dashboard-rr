# Tasks

> Active epic: [Alerts & Subscriptions](.sessions/alerts.md)

## Active

- [ ] Alerts: production rollout smoke test and monitoring
- [ ] Alerts: full alert edit UX (field-level update, not just toggle/delete)
- [ ] Alerts: one-click unsubscribe endpoint + tokenized link
- [ ] Alerts: polish email template branding
- [ ] Alerts: browser tests for /alerts UI
- [ ] Stripe: production smoke checklist (dashboard, real checkout, webhook verify)

## Short Term

### UI/UX

- [ ] Loading skeletons instead of empty states
- [ ] Error boundaries around product grid
- [ ] Placeholder images for missing product thumbnails
- [ ] Retry mechanism for failed data loads
- [ ] Test on real mobile devices
- [ ] Create OG image (1200x630, see git history for design notes)

### Filters & Sorting

- [ ] Weight range filter
- [ ] Brand filter
- [ ] Price range filter
- [ ] "Only deals" toggle (negative spreads only)

### Data Quality

- [ ] Data freshness indicators
- [ ] Fallback UI when market prices fail
- [ ] Pure product match logging/monitoring service
- [ ] Match status UI (currently manual via Convex dashboard)

## Medium Term

- [ ] Price history charts for individual products
- [ ] Stock availability notifications (extend alerts system)
- [ ] Trending products (best spreads over time)
- [ ] Favorites / watchlist
- [ ] Product comparison tool (side-by-side)
- [ ] Animations / transitions

## Backlog

- [ ] Pagination / virtual scrolling for large product lists
- [ ] Caching strategy for Convex queries
- [ ] Image optimization (lazy loading, srcset)
- [ ] Export product data to CSV
- [ ] RSS feed for deals
- [ ] Multi-currency support
- [ ] Credit card: more presets, color/icon customization, bulk import/export

## Testing

Current: 242 tests (221 unit + 21 browser)

- [ ] Week 4 UI component tests: swipeable-card, filters, calculator-controls (browser tests)
- [ ] Coverage goal: 15-20% overall, 70%+ business logic (short-term)
- [ ] Convex function integration tests (alerts CRUD, stripe webhook handlers)
