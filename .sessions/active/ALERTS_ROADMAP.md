# Alerts Feature Roadmap

> **Created:** December 27, 2024
> **Status:** Planning
> **Goal:** Add subscription-based alert system for price/stock notifications

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

## Phase 0: Dev Environment Setup ✅

**Status:** Complete
**Estimated Sessions:** 1

### Goal

Set up proper dev/prod Convex separation. Dev environment will use a static snapshot of prod data with all cron jobs disabled to avoid duplicate API calls.

### Strategy: Static Snapshot

**Why this approach:**

- Dev env is for testing **user features** (auth, subscriptions, alerts), not live data
- Admin product matches (pureProductId mappings) are included in the snapshot
- No need for complex sync infrastructure
- Zero API costs in dev
- Refresh snapshot manually when needed (every few weeks)

### Tasks

#### 0.1 Create Dev Convex Deployment ✅

- [x] Dev deployment exists: `https://nautical-chickadee-997.convex.cloud`
- [x] Updated `.env.local` to use dev deployment
- [x] Production URL commented out for reference

#### 0.2 Disable Cron Jobs in Dev ✅

- [x] Updated `convex/crons.ts` to check `ENABLE_CRONS` env var
- [x] Pushed to dev (crons disabled - no env var set)
- [x] Added `ENABLE_CRONS=true` to prod Convex dashboard
- [x] Redeployed prod to maintain cron functionality

#### 0.3 Export Prod Data Snapshot ✅

- [x] Created `scripts/export-prod-snapshot.sh` - exports full prod to zip
- [x] Exported to `convex/seed/prod-snapshot-2025-12-27.zip`

#### 0.4 Import Snapshot to Dev ✅

- [x] Created `scripts/import-dev-snapshot.sh` - imports only essential tables
- [x] Imported: costcoProducts (46), pureProducts (65), collectPurePrices (14,514), marketPrices (4)
- [x] Skipped: priceHistory, stockHistory, marketPriceHistory, fetchRuns (large/debug)

#### 0.5 Configure Dev Environment Variables ✅

- [x] `.env.local` already configured with dev Convex URL
- [x] Clerk dev keys already present (pk*test*, sk*test*)
- [x] `CONVEX_DEPLOYMENT=dev:nautical-chickadee-997` set

#### 0.6 Document Snapshot Refresh Process ✅

Documented in `scripts/snapshot.ts` with terminal UI.

**Commands:**

```bash
bun run snapshot:export   # Export from prod
bun run snapshot:import   # Import to dev
bun run snapshot:sync     # Export then import (full sync)
```

**When to refresh:**

- New products added to Costco
- Schema changes deployed to prod
- New admin product matches made

**What's included:**

- costcoProducts, pureProducts, collectPurePrices, marketPrices

**What's excluded (too large/not needed):**

- priceHistory, stockHistory, marketPriceHistory, fetchRuns

**Automatic cleanup:**

- Keeps only last 3 snapshots in `convex/seed/`
- Temp files cleaned up after import

### Testing (Dev Environment) ✅

- [x] `bun run dev` connects to dev Convex deployment
- [x] Dashboard loads with snapshot data (46 products, 65 Pure products)
- [x] No cron jobs running (ENABLE_CRONS not set in dev)
- [ ] Admin panel works with dev Clerk (to test in Phase 1)

### Deployment

- N/A (dev environment only)

### Deliverables

- Separate dev Convex deployment
- Prod data snapshot imported to dev
- Cron jobs disabled in dev
- Clear documentation for snapshot refresh

---

## Phase 1: Production Auth Launch

**Status:** Complete ✅
**Estimated Sessions:** 1-2

### Prerequisites

- [x] Clerk prod environment created
- [x] Clerk prod API keys available

### Tasks

#### 1.1 Configure Clerk Production Environment ✅

- [x] Get Clerk production publishable key and secret key from Clerk dashboard
- [x] Get Clerk JWT issuer domain for Convex (`your-app.clerk.accounts.dev` format)
- [x] Add to Railway environment variables:
  - `VITE_CLERK_PUBLISHABLE_KEY` (prod key)
  - `CLERK_SECRET_KEY` (prod secret)
  - `CLERK_JWT_ISSUER_DOMAIN` (for Convex auth)
- [x] Update Docker build args if needed (already configured)

#### 1.2 Enable Auth Feature Flag ✅

- [x] Set `VITE_ENABLE_AUTH=true` in Railway
- [x] Test sign up / sign in flow in production (Google login works)
- [x] Verify admin access still works (admin panel accessible)

### Automated Tests

- [ ] Unit test: `convex/admin.ts` - `getAuthenticatedUserId` returns correct userId
- [ ] Unit test: `convex/admin.ts` - `isAdmin` correctly checks env var
- [ ] Integration test: Auth flow with Clerk test keys

### Manual Testing Checklist (Dev Environment)

Run these tests in dev before deploying to prod:

| Test                | Steps                                           | Expected Result                           |
| ------------------- | ----------------------------------------------- | ----------------------------------------- |
| New signup          | Click "Sign Up" → Create account                | Redirected to dashboard, UserButton shows |
| Existing login      | Click "Sign In" → Enter credentials             | Logged in, session persisted              |
| Admin access        | Log in as admin → Navigate to /admin            | Admin panel loads, can view products      |
| Non-admin access    | Log in as non-admin → Navigate to /admin        | "Access Denied" message                   |
| Sign out            | Click UserButton → Sign Out                     | Redirected, auth UI shows Sign In/Up      |
| Session persistence | Log in → Close browser → Reopen                 | Still logged in                           |
| Convex auth         | Check `ctx.auth.getUserIdentity()` in any query | Returns user object with subject (userId) |

### Deployment Steps

1. [x] Merge auth changes to main (auth code was already in place)
2. [x] Add env vars to Railway:
   - `VITE_CLERK_PUBLISHABLE_KEY` (prod)
   - `CLERK_SECRET_KEY` (prod)
   - `CLERK_JWT_ISSUER_DOMAIN` (prod)
   - `VITE_ENABLE_AUTH=true`
3. [x] Update Convex prod env vars in dashboard
4. [x] Deploy to Railway
5. [x] Smoke test in production:
   - [x] Sign up with new account (Google login)
   - [x] Sign in/out
   - [x] Admin access works
6. [x] Monitor for errors in Railway logs

### Deliverables

- Users can sign up and sign in on production
- Admin panel accessible to admins only
- Auth UI shows in header
- **Can stop here**: App is fully functional with auth, no alerts yet

---

## Phase 2: User Data Migration (localStorage → Convex)

**Status:** Complete ✅
**Estimated Sessions:** 2-3
**Depends On:** Phase 1

### Goal

Seamlessly migrate user's credit card settings from localStorage to their Convex account when they sign up. The migration should be:

- **Invisible:** User doesn't notice anything
- **Redundant:** localStorage backed up before deletion
- **One-time:** Only runs on first authenticated session

### Tasks

#### 2.1 Create Convex Schema ✅

- [x] Add `userCreditCards` table to `convex/schema.ts`:

  ```typescript
  userCreditCards: defineTable({
    userId: v.string(),           // Clerk user ID
    cardId: v.string(),           // Unique card ID
    name: v.string(),
    issuer: v.optional(v.string()),
    cardType: v.union(v.literal("cashback"), v.literal("travel")),
    pointsPerDollar: v.number(),
    valuePerPoint: v.number(),
    isPreset: v.boolean(),
    isCustomizable: v.boolean(),
    signupBonus: v.optional(v.object({
      enabled: v.boolean(),
      pointsBonus: v.number(),
      spendRequirement: v.number(),
    })),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_card", ["userId", "cardId"]),
  ```

- [x] Add `userSettings` table:
  ```typescript
  userSettings: defineTable({
    userId: v.string(),
    lastSelectedCardId: v.optional(v.string()),
    costcoMembershipEnabled: v.boolean(),
    pureFeeTierId: v.optional(v.string()),
    quantity: v.number(),
    localStorageMigrated: v.boolean(),  // Track migration status
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"]),
  ```

#### 2.2 Create Convex Functions ✅

- [x] Create `convex/userCards.ts`:
  - `getUserCards` query - fetch user's cards
  - `addCard` mutation - add custom card
  - `updateCard` mutation - update card values
  - `deleteCard` mutation - remove custom card
  - `resetPresetCard` mutation - reset to defaults
  - `migrateFromLocalStorage` mutation - bulk import cards

- [x] Create `convex/userSettings.ts`:
  - `getSettings` query - fetch user settings
  - `updateSettings` mutation - update any setting
  - `markMigrationComplete` mutation - set flag after migration
  - `needsMigration` query - check if migration is needed

#### 2.3 Implement Migration Logic ✅

- [x] Update `app/hooks/use-calculator-settings.ts`:
  - Check if user is authenticated
  - If authenticated: use Convex queries/mutations
  - If anonymous: use localStorage (existing behavior)
  - On first auth: trigger one-time migration

- [x] Created `app/hooks/use-user-credit-cards.ts`:
  - Abstracts data source (Convex vs localStorage) based on auth
  - Handles automatic migration on first auth
  - CRUD operations work for both authenticated and anonymous users

- [x] Created `app/hooks/use-user-settings.ts`:
  - Manages costcoMembershipEnabled setting
  - Uses Convex when authenticated, React state when anonymous

- [x] Migration helper integrated into `use-user-credit-cards.ts`:

  ```typescript
  async function migrateLocalStorageToConvex(userId: string) {
    const localData = loadCreditCards();

    // Only migrate custom cards and customized presets
    const cardsToMigrate = localData.cards.filter(
      (card) => !card.isPreset || hasBeenCustomized(card),
    );

    // Bulk insert to Convex
    await migrateFromLocalStorage({ cards: cardsToMigrate });

    // Migrate settings
    await updateSettings({
      lastSelectedCardId: localData.lastSelectedId,
      // ... other settings from localStorage
    });

    // Mark migration complete
    await markMigrationComplete();

    // Clear localStorage
    clearCreditCards();
  }
  ```

#### 2.4 Update Dashboard Components ✅

- [x] Update `useCalculatorSettings` hook to support both sources
- [x] Update `CardManagerDrawer` to use Convex mutations when authenticated
- [x] Add loading states during migration (toast notifications)
- [x] Handle edge cases (stale closure bug fixed with functional updates)

### Automated Tests

- [ ] Unit test: `convex/userCards.ts` - CRUD operations (getUserCards, addCard, updateCard, deleteCard)
- [ ] Unit test: `convex/userCards.ts` - migrateFromLocalStorage bulk import
- [ ] Unit test: `convex/userSettings.ts` - getSettings, updateSettings
- [ ] Unit test: Migration helper - filters custom vs preset cards correctly
- [ ] Unit test: `useCalculatorSettings` hook - switches between localStorage and Convex based on auth
- [ ] Browser test: CardManagerDrawer - works for both anonymous and authenticated users

### Manual Testing Checklist (Dev Environment)

| Test                            | Steps                                    | Expected Result                                      |
| ------------------------------- | ---------------------------------------- | ---------------------------------------------------- |
| Anonymous user                  | Don't sign in → Add custom card          | Card saved to localStorage, persists on refresh      |
| New user, empty localStorage    | Clear localStorage → Sign up             | User created, default cards shown, no migration runs |
| New user, existing localStorage | Add custom cards → Sign up               | Cards migrated to Convex, localStorage cleared       |
| Migration verification          | After migration → Check Convex dashboard | Custom cards in `userCreditCards` table              |
| Returning user                  | Sign out → Sign in again                 | Cards loaded from Convex (not localStorage)          |
| Card sync                       | Add card while signed in                 | Card appears immediately, persisted in Convex        |
| Failed migration recovery       | Simulate failed migration → Retry        | Migration completes on next auth check               |
| Offline behavior                | Go offline → Try to add card             | Graceful error message                               |

### Deployment Steps

1. [x] Run `npx convex dev --once` to push schema changes to prod
2. [x] Verify tables created in Convex dashboard (`userCreditCards`, `userSettings`)
3. [x] Merge migration code to main
4. [x] Deploy to Railway
5. [x] Smoke test in production:
   - [x] Anonymous user can still use localStorage
   - [x] New signup triggers migration (if they have localStorage data)
   - [x] Returning user loads from Convex
6. [x] Monitor Convex logs for migration errors

### Deliverables

- Authenticated users' cards stored in Convex
- Anonymous users continue using localStorage
- Seamless one-time migration on first auth
- No data loss during migration
- **Can stop here**: Users have accounts with persisted settings, ready for subscriptions

---

## Phase 3: Stripe Integration

**Status:** Core complete (prod rollout checklist pending)
**Estimated Sessions:** 2-3
**Depends On:** Phase 2 ✅

### Pricing Model

- **Free Tier:** View dashboard, no alerts
- **Pro Tier:** $8/month - Unlimited alerts (email)
- Future: Add SMS tier when LLC is formed

### Tasks

### Phase 3 Progress Update (2026-02-08)

- [x] Stripe checkout + portal integration shipped (`convex/stripe.ts` + frontend UI)
- [x] Stripe webhooks wired (`convex/http.ts`)
- [x] Subscription status + entitlement logic implemented (`convex/stripeUtils.ts`, `convex/subscriptionEntitlements.ts`)
- [x] Convex-level enforcement added for alert permissions
- [x] Pause-on-billing-state transitions implemented for enabled alerts
- [ ] Final production smoke checklist + monitoring handoff (see Deployment Steps below)

#### 3.1 Stripe Setup

- [ ] Create Stripe account (or use existing)
- [ ] Create product and price in Stripe dashboard:
  - Product: "Dashboard.Gold Pro"
  - Price: $X/month recurring
- [ ] Get API keys (publishable + secret)
- [ ] Set up webhook endpoint URL

#### 3.2 Add Stripe to Convex

- [ ] Add env vars to Railway:
  - `STRIPE_SECRET_KEY`
  - `STRIPE_WEBHOOK_SECRET`
  - `STRIPE_PRICE_ID` (for the Pro subscription)

- [ ] Add to `convex/schema.ts`:
  ```typescript
  userSubscriptions: defineTable({
    userId: v.string(),
    stripeCustomerId: v.string(),
    stripeSubscriptionId: v.optional(v.string()),
    status: v.union(
      v.literal("active"),
      v.literal("canceled"),
      v.literal("past_due"),
      v.literal("free")
    ),
    currentPeriodEnd: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_stripe_customer", ["stripeCustomerId"]),
  ```

#### 3.3 Create Stripe Functions

- [ ] Create `convex/stripe.ts`:
  - `createCheckoutSession` action - generate Stripe Checkout URL
  - `createPortalSession` action - customer portal for managing sub
  - `getSubscriptionStatus` query - check if user is Pro

- [ ] Create `convex/http.ts` (webhook handler):
  - Handle `checkout.session.completed` - activate subscription
  - Handle `customer.subscription.updated` - sync status
  - Handle `customer.subscription.deleted` - cancel subscription
  - Handle `invoice.payment_failed` - mark past_due

#### 3.4 Frontend Integration

- [ ] Create subscription management UI:
  - Show current plan status
  - "Upgrade to Pro" button → Stripe Checkout
  - "Manage Subscription" → Stripe Customer Portal
  - Show billing cycle / renewal date

- [ ] Add subscription check to alert features:
  - Gate alert creation behind Pro subscription
  - Show upgrade prompt for free users

### Automated Tests

- [ ] Unit test: `convex/stripe.ts` - createCheckoutSession generates valid URL
- [ ] Unit test: `convex/stripe.ts` - getSubscriptionStatus returns correct status
- [ ] Unit test: `convex/http.ts` - webhook signature verification
- [ ] Unit test: `convex/http.ts` - each webhook event handler (checkout.completed, subscription.updated, etc.)
- [ ] Unit test: Subscription gating logic - isPro check works correctly

### Manual Testing Checklist (Dev Environment)

**Important:** Use Stripe TEST mode (test API keys, test card numbers)

| Test                           | Steps                                                                        | Expected Result                                       |
| ------------------------------ | ---------------------------------------------------------------------------- | ----------------------------------------------------- |
| Checkout flow                  | Click "Upgrade to Pro" → Complete checkout with test card `4242424242424242` | Redirected back, status shows "Pro"                   |
| Webhook: checkout completed    | Complete checkout → Check Convex                                             | `userSubscriptions` row created with `status: active` |
| Subscription status            | After checkout → Refresh page                                                | Pro badge shown, alerts enabled                       |
| Customer portal                | Click "Manage Subscription"                                                  | Stripe portal opens, can view/cancel                  |
| Cancel subscription            | In portal → Cancel                                                           | Status changes to "canceled", alerts disabled         |
| Webhook: subscription canceled | Cancel in portal → Check Convex                                              | Status updated to "canceled"                          |
| Failed payment                 | Use test card `4000000000000341`                                             | Status changes to "past_due"                          |
| Reactivate                     | After cancel → Upgrade again                                                 | New subscription created, status "active"             |
| Free user gating               | Don't subscribe → Try to create alert                                        | Upgrade prompt shown                                  |

**Stripe Test Cards:**

- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- Requires auth: `4000 0025 0000 3155`
- Failed payment: `4000 0000 0000 0341`

**Local Webhook Testing:**

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Forward webhooks to local Convex
stripe listen --forward-to localhost:3000/api/stripe-webhook

# Use the webhook secret it prints
```

### Deployment Steps

1. [ ] Create Stripe product and price in **production** dashboard
2. [ ] Add prod env vars to Railway:
   - `STRIPE_SECRET_KEY` (live key)
   - `STRIPE_WEBHOOK_SECRET` (from Stripe dashboard)
   - `STRIPE_PRICE_ID` (prod price ID)
3. [ ] Add webhook endpoint in Stripe dashboard: `https://your-app.com/api/stripe-webhook`
4. [ ] Push schema changes to Convex prod
5. [ ] Deploy to Railway
6. [ ] Smoke test in production:
   - [ ] Complete real checkout (use your own card, cancel after)
   - [ ] Verify webhook received (check Stripe dashboard)
   - [ ] Verify subscription status in app
7. [ ] Monitor Stripe webhook events for failures

### Deliverables

- Users can subscribe via Stripe Checkout
- Subscription status synced in Convex
- Pro features gated behind subscription check
- Customer portal for self-service management
- **Can stop here**: Users can subscribe, ready to build alerts

---

## Phase 4: Alert System

**Status:** In Progress (core implemented, rollout/polish pending)
**Estimated Sessions:** 3-4
**Depends On:** Phase 3

### Alert Types

1. **SKU Alerts** - Watch specific product
   - Back in stock
   - Price drop below $X
   - Price per oz drop below $X

2. **Category Alerts** - Watch category
   - All Gold / All Silver / All Metals
   - Specific weight (1oz Gold, 10oz Silver, etc.)
   - Specific brand (PAMP, RCM, etc.)

3. **Threshold Alerts** - Watch metrics
   - Any item below X% above spot
   - Any item with profit margin > $X
   - Any item with per-oz profit > $X

### Tasks

### Phase 4 Progress Update (2026-02-08)

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

#### 4.1 Schema Design

- [x] Add to `convex/schema.ts`:

  ```typescript
  alerts: defineTable({
    userId: v.string(),
    name: v.string(),                    // User-friendly name
    type: v.union(
      v.literal("sku"),
      v.literal("category"),
      v.literal("threshold")
    ),
    enabled: v.boolean(),

    // SKU alert config
    productId: v.optional(v.string()),   // Specific product

    // Category alert config
    metalType: v.optional(v.union(v.literal("gold"), v.literal("silver"))),
    weight: v.optional(v.number()),      // Weight in oz
    brand: v.optional(v.string()),

    // Threshold alert config
    aboveSpotThreshold: v.optional(v.number()),  // e.g., 0.5 for 0.5%
    profitThreshold: v.optional(v.number()),     // Dollar amount

    // Trigger conditions
    triggerOn: v.union(
      v.literal("in_stock"),
      v.literal("price_drop"),
      v.literal("threshold_met")
    ),

    // Notification settings
    lastTriggered: v.optional(v.number()),
    cooldownMinutes: v.number(),         // Min time between alerts

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_enabled", ["enabled"]),

  alertHistory: defineTable({
    alertId: v.id("alerts"),
    userId: v.string(),
    triggeredAt: v.number(),
    products: v.array(v.object({
      productId: v.string(),
      productName: v.string(),
      reason: v.string(),              // "Back in stock", "0.3% above spot", etc.
    })),
    notificationSent: v.boolean(),
    notificationError: v.optional(v.string()),
  })
    .index("by_alert", ["alertId"])
    .index("by_user", ["userId"]),

  alertBatches: defineTable({
    userId: v.string(),
    alerts: v.array(v.object({
      alertId: v.id("alerts"),
      alertName: v.string(),
      products: v.array(v.object({
        productId: v.string(),
        productName: v.string(),
        reason: v.string(),
      })),
    })),
    scheduledFor: v.number(),          // When to send
    sent: v.boolean(),
    sentAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_pending", ["sent", "scheduledFor"]),
  ```

#### 4.2 Alert Evaluation Engine

- [x] Implement evaluation engine (currently in `convex/alerts.ts`):
  - `evaluateAlertsForProducts` internal mutation - run on price/stock updates
  - SKU/category/threshold matching helpers
  - Batch queue merge behavior per user + window

- [x] Integrate with Costco update flows:
  - `fetchNewData` (Costco) triggers evaluation
  - `verifyInStockProducts` triggers evaluation
- [ ] Evaluate adding threshold-only sweeps on additional price update paths if needed

#### 4.3 Batch Processing & Email

- [x] Implement notifications pipeline (currently in `convex/alerts.ts`):
  - `processPendingAlertBatches` action
  - `sendAlertEmail` helper (Resend)
  - `formatAlertDigest` helper (HTML + text)
  - `markAlertBatchProcessed` mutation (history + batch status updates)
  - Cron wiring every 15 minutes (`convex/crons.ts`)

- [ ] Set up Resend:
  - [x] Create Resend account
  - [x] Add domain verification
  - [x] Get API key
  - [x] Configure dev/test sending
  - [ ] Add/update prod deployment env vars (`RESEND_API_KEY`, `RESEND_FROM_EMAIL`, optional `RESEND_REPLY_TO_EMAIL`)

- [ ] Design email template:
  - [x] Initial digest template with alert grouping
  - [x] Manage alerts link
  - [x] `reply_to` + `List-Unsubscribe` header
  - [ ] Polish template branding/layout for production

#### 4.4 Alert Management UI

- [x] Create `/alerts` route:
  - [x] List all user alerts
  - [x] Create new alert form
  - [ ] Edit existing alert form
  - [x] Enable/disable toggle
  - [x] Delete alert

- [ ] Alert creation wizard:
  - Step 1: Choose type (SKU, Category, Threshold)
  - Step 2: Configure conditions
  - Step 3: Set notification preferences
  - Preview matching products

- [x] Add "Create Alert" button to product cards:
  - [x] Quick action to create SKU alert for that product

#### 4.5 Subscription Gating

- [x] Check subscription status before:
  - [x] Creating new alerts
  - [x] Enabling disabled alerts
  - [x] Sending notification emails

- [x] Show subscription prompt when:
  - [x] Free user tries to create alert
  - Alert limit reached (if implementing limits)

### Automated Tests

- [x] `convex/alerts.convex.test.ts` covers CRUD + entitlement behavior
- [x] `convex/alerts.convex.test.ts` covers evaluation (SKU + threshold + cooldown + entitlement skip)
- [x] `convex/alerts.convex.test.ts` covers batch delivery success + non-entitled skip
- [x] Manual E2E smoke executed in dev (create -> evaluate -> process -> receive digest)
- [ ] Expand browser-level tests for `/alerts` UI interactions
- [ ] Add production smoke verification records post-deploy

### Manual Testing Checklist (Dev Environment)

**Important:** Use Resend test mode or verified test email addresses

| Test                    | Steps                                                        | Expected Result                                     |
| ----------------------- | ------------------------------------------------------------ | --------------------------------------------------- |
| Create SKU alert        | Pick product → "Create Alert" → Save                         | Alert created, shows in /alerts                     |
| Create category alert   | /alerts → New → Gold, 1oz → Save                             | Alert created with category filter                  |
| Create threshold alert  | /alerts → New → Below 0.5% above spot → Save                 | Alert created with threshold                        |
| Alert list              | Navigate to /alerts                                          | All user's alerts shown with enable/disable toggles |
| Edit alert              | Click alert → Modify → Save                                  | Changes persisted                                   |
| Delete alert            | Click alert → Delete → Confirm                               | Alert removed                                       |
| SKU alert trigger       | Create alert for OOS product → Mark in stock (in dev)        | Alert triggered, added to batch                     |
| Category alert trigger  | Create "all gold" alert → Change gold product price (in dev) | Alert triggered for matching products               |
| Threshold alert trigger | Create "below 1% above spot" → Adjust product (in dev)       | Alert triggered when threshold met                  |
| Batch collection        | Trigger multiple alerts                                      | All collected in single batch                       |
| Email digest            | Wait for batch processing (or trigger manually)              | Email received with all alerts                      |
| Cooldown                | Trigger same alert twice quickly                             | Second trigger ignored until cooldown expires       |
| Subscription gating     | Unsubscribe → Try to create alert                            | Upgrade prompt shown                                |
| Unsubscribe email       | Click unsubscribe link in email                              | Alert disabled or settings updated                  |

**Testing Alert Triggers in Dev:**
Since dev has static data, you can trigger alerts by:

1. Temporarily modifying product data in Convex dashboard
2. Calling internal functions directly from Convex dashboard
3. Creating a test endpoint that simulates price/stock changes

**Resend Testing:**

- Use your verified email domain
- Check Resend dashboard for delivery status
- Test with `onboarding@resend.dev` for initial testing

### Deployment Steps

1. [x] Set up Resend account and verify domain
2. [ ] Set Convex prod env vars:
   - `RESEND_API_KEY`
   - `RESEND_FROM_EMAIL`
   - optional `RESEND_REPLY_TO_EMAIL` (defaults to `support@dashboard.gold`)
   - `SITE_URL=https://dashboard.gold`
3. [ ] Confirm `ENABLE_CRONS=true` in Convex prod
4. [ ] Deploy latest app/Convex code to production
5. [ ] Create test alert on production account
6. [ ] Trigger alert manually (via Convex dashboard) to verify email
7. [ ] Verify cron-driven auto send without manual `processPendingAlertBatches`
8. [ ] Monitor:
   - Resend dashboard for delivery rates
   - Convex logs for evaluation errors
   - `alertHistory` table for trigger records
   - Spam placement / domain reputation trend

### Remaining Recommendations (Post-Checkpoint)

1. Finish alert edit UX in `/alerts` (field-level update flow, not just toggle/delete).
2. Add one-click unsubscribe flow (endpoint + tokenized link) to complement manage-link behavior.
3. Complete manual validation matrix:
   - category + threshold end-to-end
   - subscription transitions (active -> past_due/unpaid/canceled)
   - cooldown verification
4. Add lightweight operational visibility (batch send failures/skips view or admin query).
5. Run production smoke and capture explicit pass/fail notes in this roadmap.

### Code Review Follow-ups (2026-02-08)

Action items:

- [x] P0: Add bounded retry policy for failed alert sends (attempt count, backoff, max attempts/dead-letter behavior).
- [x] P1: Clarify and unify threshold math semantics ("above spot" denominator and data source) across dashboard + alerts.
- [x] P1: Clean `useSubscription` data flow typing (remove cast fallback path) and assert `alertEntitlements` in browser tests.
- [x] P1: Improve visibility for `deferredByMissingConfig` in production (explicit error logging/monitoring signal).
- [ ] P2: Extract shared `UserButton` configuration used by desktop and mobile header menus.
- [x] P2: Add explicit code comment in `deleteAlert` that deletes are intentionally allowed regardless of subscription state.
- [x] P3: Simplify redundant `mergeAlertProducts([], triggeredProducts)` call.
- [x] P3: Add guard for CI Convex deploy job when `CONVEX_DEPLOY_KEY` is missing to avoid noisy main-branch failures.

Completed in this fix-now batch:

- Added retry/defer behavior for alert batch delivery (`sendAttempts`, backoff, terminal failure handling).
- Added explicit logging and rescheduling when email delivery config is missing.
- Updated above-spot threshold math in alert evaluation to use spot/bid denominator (aligned with dashboard semantics).
- Removed stale `useSubscription` cast and expanded browser test coverage for query-provided alert entitlements.
- Added intentional-delete comment path in `deleteAlert`.
- Added CI deploy guard for missing `CONVEX_DEPLOY_KEY`.

Reviewed / no immediate change required:

- [x] `getSubscriptionStatus` already returns `alertEntitlements`; reviewer note was based on older code.
- [x] Costco evaluation integration exists in both `fetchNewData` and `verifyInStockProducts`.
- [x] `VITE_ENABLE_AUTH` is currently not referenced in codebase (auth is not feature-flagged now).
- [x] `CLAUDE.md` does not currently reference `VITE_ADSENSE_CLIENT_ID` (docs + Dockerfile still do).

### Deliverables

- Users can create SKU, category, and threshold alerts
- Alerts evaluated on data updates
- Batched email digests sent via Resend
- Pro subscription required for alerts
- Alert management UI
- **Feature complete**: Full alert system live!

---

## Future Enhancements (Post-MVP)

### SMS Notifications (Requires LLC)

- [ ] Form LLC or business entity
- [ ] Register for Twilio 10DLC
- [ ] Add phone number collection
- [ ] Create SMS templates (shorter than email)
- [ ] Add SMS as notification channel option
- [ ] Create higher-tier subscription with SMS

### Push Notifications

- [ ] Add service worker for PWA
- [ ] Implement web push notifications
- [ ] Add as free notification option

### Advanced Alert Features

- [ ] Alert scheduling (only during certain hours)
- [ ] Multiple notification channels per alert
- [ ] Alert sharing / public alerts
- [ ] Alert templates / presets
- [ ] Webhook notifications for power users

---

## Environment Variables Summary

### Phase 0 (Dev Environment)

```bash
# Dev Convex deployment
VITE_CONVEX_URL=https://nautical-chickadee-997.convex.cloud

# Dev Clerk (reuse existing dev app)
VITE_CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx
CLERK_JWT_ISSUER_DOMAIN=your-dev-app.clerk.accounts.dev
VITE_ENABLE_AUTH=true
```

### Phase 1 (Auth - Production)

```bash
VITE_CLERK_PUBLISHABLE_KEY=pk_live_xxx
CLERK_SECRET_KEY=sk_live_xxx
CLERK_JWT_ISSUER_DOMAIN=your-app.clerk.accounts.dev
VITE_ENABLE_AUTH=true
```

### Phase 3 (Stripe)

```bash
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PRICE_ID=price_xxx
```

### Phase 4 (Alerts)

```bash
RESEND_API_KEY=re_xxx
RESEND_FROM_EMAIL=alerts@dashboard.gold
RESEND_REPLY_TO_EMAIL=support@dashboard.gold
SITE_URL=https://dashboard.gold
```

---

## Session Log

Track progress across sessions here:

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
