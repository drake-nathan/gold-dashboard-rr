# Tasks

> Active epic: [Alerts & Subscriptions](.sessions/alerts.md)

## Active — Alerts Refinement (pre-prod)

### Step 1: Feature Completion ✅

- [x] Alerts: full alert edit UX (field-level update via dialog, shared form fields)
- [x] Alerts: one-click unsubscribe endpoint + tokenized HMAC link (RFC 8058)
- [x] Alerts: polish email template branding (table layout, gold theme, CTA button)
- [x] Extract shared `UserButton` config → `user-button-with-pro.tsx`

### Step 2: UI Polish

- [ ] Alerts UI: review /alerts page design, spacing, responsive behavior
- [ ] Alerts UI: empty states, loading states, error handling
- [ ] Subscription flow: upgrade prompts, gating UX, plan status display
- [ ] Product card alert entrypoint: review quick-create UX
- [ ] Email digest: test rendering across clients (Gmail, Apple Mail, Outlook)

### Step 3: Test Coverage Audit

- [ ] Audit alert evaluation engine for edge cases worth covering
- [ ] Audit alert CRUD + entitlement gating for gaps
- [ ] Browser tests for /alerts UI (create, list, toggle, delete flows)
- [ ] Review existing 242 tests — prune any that test implementation details

### Step 4: Staging Validation

- [ ] Set Convex dev env var: `UNSUBSCRIBE_SECRET` (generate: `openssl rand -hex 32`)
- [ ] Deploy to Railway preview (dev Convex) for full staging run
- [ ] Verify feature flags: auth gating, subscription gating, cron guards
- [ ] Manual test matrix: SKU/category/threshold alert create → trigger → digest
- [ ] Manual test matrix: subscription transitions (active → past_due → canceled)
- [ ] Manual test matrix: cooldown, batch merging, retry/dead-letter behavior
- [ ] Manual test: anonymous user sees no alerts, free user sees upgrade prompt
- [ ] Manual test: email delivery (Resend test mode), unsubscribe flow
- [ ] Mobile device testing for /alerts and subscription flows

### Step 5: Production Rollout

- [ ] Set Convex prod env vars (RESEND_API_KEY, RESEND_FROM_EMAIL, SITE_URL, UNSUBSCRIBE_SECRET)
- [ ] Stripe: production smoke (real checkout, webhook verify, portal)
- [ ] Deploy to prod
- [ ] Create test alert on prod account, trigger manually, verify email
- [ ] Verify cron-driven auto-send (processPendingAlertBatches)
- [ ] Monitor: Resend delivery rates, Convex logs, alertHistory table, spam/reputation

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
- [ ] Sentry: add intentional structured logs for alerts, checkout, and auth flows
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
