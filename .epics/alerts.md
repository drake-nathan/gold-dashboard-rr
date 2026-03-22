# Alerts & Subscriptions

> **Status:** In Progress
> **Started:** 2024-12-27

**Goal:** Subscription-based alert system for price/stock notifications.

<!-- Phases 0-3 shipped. Phase 4 core shipped (CRUD, eval engine, batch digest, UI). See git history. -->

## Plan

### UI Polish

- Review /alerts page design, spacing, responsive behavior
- Empty states, loading states, error handling
- Subscription flow: upgrade prompts, gating UX, plan status display
- Product card alert entrypoint: review quick-create UX
- Email digest: test rendering across clients (Gmail, Apple Mail, Outlook)
- Extract shared `UserButton` configuration (desktop + mobile header menus)

### Test Coverage

- Audit alert evaluation engine for edge cases worth covering
- Audit alert CRUD + entitlement gating for gaps
- Browser tests for /alerts UI (create, list, toggle, delete flows)
- Review existing tests — prune any that test implementation details

### Staging Validation

- Set Convex dev env var: `UNSUBSCRIBE_SECRET` (generate: `openssl rand -hex 32`)
- Deploy to Railway preview (dev Convex) for full staging run
- Verify feature flags: auth gating, subscription gating, cron guards
- Manual test matrix: SKU/category/threshold alert create → trigger → digest
- Manual test matrix: subscription transitions (active → past_due → canceled)
- Manual test matrix: cooldown, batch merging, retry/dead-letter behavior
- Manual test: anonymous user sees no alerts, free user sees upgrade prompt
- Manual test: email delivery (Resend test mode), unsubscribe flow
- Mobile device testing for /alerts and subscription flows

### Production Rollout

- Set Convex prod env vars (RESEND_API_KEY, RESEND_FROM_EMAIL, SITE_URL, UNSUBSCRIBE_SECRET)
- Stripe: production smoke (real checkout, webhook verify, portal)
- Deploy to prod
- Create test alert on prod account, trigger manually, verify email
- Verify cron-driven auto-send (processPendingAlertBatches)
- Monitor: Resend delivery rates, Convex logs, alertHistory table, spam/reputation

## Decisions

| Decision              | Choice                           | Rationale                                                       |
| --------------------- | -------------------------------- | --------------------------------------------------------------- |
| **Notifications**     | Email only (via Resend)          | SMS requires LLC for 10DLC registration. Add SMS later.         |
| **Pricing Model**     | Simple monthly tier ($X/mo)      | Keep it simple. Unlimited alerts for subscribers.               |
| **Alert Timing**      | Batched digests                  | Prevents spam when multiple items trigger. User-friendly.       |
| **Auth**              | Clerk (prod env exists)          | Already integrated, just needs prod env vars.                   |
| **Payments**          | Stripe Checkout + Webhooks       | Industry standard, Convex has good patterns for this.           |
| **Dev/Prod Strategy** | Static snapshot + disabled crons | Dev gets prod snapshot, no API calls. Manual refresh as needed. |

## Notes

- Keep localStorage as fallback for anonymous users (never fully remove)
- Use Convex actions for external API calls (Stripe, Resend)
- Test webhooks locally with Stripe CLI before deploying
- Consider rate limiting on alert creation
- Monitor email deliverability in Resend dashboard
