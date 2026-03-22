# Alerts & Subscriptions

> **Status:** In Progress — Phase 4 (alert system core complete, production rollout pending)
> **Started:** 2024-12-27
> **Last updated:** 2026-02-08

**Goal:** Subscription-based alert system for price/stock notifications

## Overview

Add alerts to Dashboard.Gold that notify users when:

- A specific SKU comes back in stock or changes price
- A category of items (all gold, 1oz gold, silver, etc.) meets conditions
- Any item hits a profit margin or "above spot" threshold (e.g., below 0.5% above spot)

## Architecture Decisions

| Decision              | Choice                           | Rationale                                                       |
| --------------------- | -------------------------------- | --------------------------------------------------------------- |
| **Notifications**     | Email only (via Resend)          | SMS requires LLC for 10DLC registration. Add SMS later.         |
| **Pricing Model**     | Simple monthly tier ($X/mo)      | Keep it simple. Unlimited alerts for subscribers.               |
| **Alert Timing**      | Batched digests                  | Prevents spam when multiple items trigger. User-friendly.       |
| **Auth**              | Clerk (prod env exists)          | Already integrated, just needs prod env vars.                   |
| **Payments**          | Stripe Checkout + Webhooks       | Industry standard, Convex has good patterns for this.           |
| **Dev/Prod Strategy** | Static snapshot + disabled crons | Dev gets prod snapshot, no API calls. Manual refresh as needed. |

---

<!-- Phases 0-3 completed and removed — see git history for details -->

## Phase 4: Alert System

**Status:** In Progress (core implemented, rollout/polish pending)
**Estimated Sessions:** 3-4
**Depends On:** Phase 3

### Phase 4 Progress (2026-02-08)

- [x] Schema shipped: `alerts`, `alertHistory`, `alertBatches`
- [x] Alert CRUD + entitlement gating shipped (`convex/alerts.ts`)
- [x] Evaluation engine shipped and integrated with Costco update flows
- [x] Batch queueing shipped (15-minute scheduling windows)
- [x] Digest delivery action shipped (`processPendingAlertBatches`) with Resend integration
- [x] Digest headers improved (`reply_to` + `List-Unsubscribe`)
- [x] Alerts UI route shipped (`/alerts`) with create/list/enable-disable/delete
- [x] Product-card quick-create alert entrypoint shipped
- [x] Subscription prompts and send-state badges shipped in alerts UI
- [ ] Full edit-alert UX (beyond enable/disable toggle) still pending
- [ ] One-click unsubscribe endpoint/flow still pending (manage-link exists)
- [ ] Production rollout + full manual matrix still pending

### Remaining Work

- [ ] Finish alert edit UX in `/alerts` (field-level update flow, not just toggle/delete)
- [ ] Add one-click unsubscribe flow (endpoint + tokenized link) to complement manage-link
- [ ] Complete manual validation matrix (category + threshold E2E, subscription transitions, cooldown)
- [ ] Polish email template branding/layout for production
- [ ] Set Convex prod env vars (`RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `SITE_URL`, `UNSUBSCRIBE_SECRET`)
- [ ] Deploy to prod, create test alert, verify email delivery
- [ ] Verify cron-driven auto-send (`processPendingAlertBatches`)
- [ ] Monitor: Resend delivery rates, Convex logs, alertHistory table, spam/reputation

### Automated Tests

- [x] `convex/alerts.convex.test.ts` covers CRUD + entitlement behavior
- [x] `convex/alerts.convex.test.ts` covers evaluation (SKU + threshold + cooldown + entitlement skip)
- [x] `convex/alerts.convex.test.ts` covers batch delivery success + non-entitled skip
- [x] Manual E2E smoke executed in dev
- [ ] Expand browser-level tests for `/alerts` UI interactions

### Code Review Follow-ups (2026-02-08)

Completed:
- [x] P0: Bounded retry policy for failed alert sends
- [x] P1: Unified threshold math semantics across dashboard + alerts
- [x] P1: Clean `useSubscription` data flow typing
- [x] P1: Visibility for `deferredByMissingConfig` in production
- [x] P2: Explicit comment in `deleteAlert` re: subscription-agnostic deletes
- [x] P3: Simplified redundant `mergeAlertProducts` call
- [x] P3: CI deploy guard for missing `CONVEX_DEPLOY_KEY`

Outstanding:
- [ ] P2: Extract shared `UserButton` configuration (desktop + mobile header menus)

---

## Session Log

| Session | Date       | Phase         | Completed                                                                            |
| ------- | ---------- | ------------- | ------------------------------------------------------------------------------------ |
| 1       | 2024-12-27 | Planning      | Created roadmap, added Phase 0 (dev env), testing & deployment for all phases        |
| 2       | 2025-12-27 | Phase 0       | Dev env setup complete: crons disabled, prod snapshot imported, scripts created      |
| 3       | 2025-12-27 | Phase 1       | 1.1-1.2 complete: Clerk prod configured, auth enabled, Google login + admin verified |
| 4       | 2025-01-18 | Phase 2       | Complete: User data migration shipped, localStorage → Convex working in prod         |
| 5       | 2026-02-08 | Phase 3/4     | Stripe entitlement enforcement complete; alerts core shipped (UI, eval, digest send) |
| 6       | 2026-02-08 | Review triage | Validated external review findings, prioritized fixes, updated roadmap               |
| 7       | -          | -             | -                                                                                    |

---

## Notes

- Keep localStorage as fallback for anonymous users (never fully remove)
- Use Convex actions for external API calls (Stripe, Resend)
- Test webhooks locally with Stripe CLI before deploying
- Consider rate limiting on alert creation
- Monitor email deliverability in Resend dashboard
