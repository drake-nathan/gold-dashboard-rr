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

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Notifications** | Email only (via Resend) | SMS requires LLC for 10DLC registration. Add SMS later. |
| **Pricing Model** | Simple monthly tier ($X/mo) | Keep it simple. Unlimited alerts for subscribers. |
| **Alert Timing** | Batched digests | Prevents spam when multiple items trigger. User-friendly. |
| **Auth** | Clerk (prod env exists) | Already integrated, just needs prod env vars. |
| **Payments** | Stripe Checkout + Webhooks | Industry standard, Convex has good patterns for this. |
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
- [x] Clerk dev keys already present (pk_test_, sk_test_)
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

**Status:** In Progress
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

| Test | Steps | Expected Result |
|------|-------|-----------------|
| New signup | Click "Sign Up" → Create account | Redirected to dashboard, UserButton shows |
| Existing login | Click "Sign In" → Enter credentials | Logged in, session persisted |
| Admin access | Log in as admin → Navigate to /admin | Admin panel loads, can view products |
| Non-admin access | Log in as non-admin → Navigate to /admin | "Access Denied" message |
| Sign out | Click UserButton → Sign Out | Redirected, auth UI shows Sign In/Up |
| Session persistence | Log in → Close browser → Reopen | Still logged in |
| Convex auth | Check `ctx.auth.getUserIdentity()` in any query | Returns user object with subject (userId) |

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
6. [ ] Monitor for errors in Railway logs

### Deliverables
- Users can sign up and sign in on production
- Admin panel accessible to admins only
- Auth UI shows in header
- **Can stop here**: App is fully functional with auth, no alerts yet

---

## Phase 2: User Data Migration (localStorage → Convex)

**Status:** Not Started
**Estimated Sessions:** 2-3
**Depends On:** Phase 1

### Goal
Seamlessly migrate user's credit card settings from localStorage to their Convex account when they sign up. The migration should be:
- **Invisible:** User doesn't notice anything
- **Redundant:** localStorage backed up before deletion
- **One-time:** Only runs on first authenticated session

### Tasks

#### 2.1 Create Convex Schema
- [ ] Add `userCreditCards` table to `convex/schema.ts`:
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

- [ ] Add `userSettings` table:
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

#### 2.2 Create Convex Functions
- [ ] Create `convex/userCards.ts`:
  - `getUserCards` query - fetch user's cards
  - `addCard` mutation - add custom card
  - `updateCard` mutation - update card values
  - `deleteCard` mutation - remove custom card
  - `resetPresetCard` mutation - reset to defaults
  - `migrateFromLocalStorage` mutation - bulk import cards

- [ ] Create `convex/userSettings.ts`:
  - `getSettings` query - fetch user settings
  - `updateSettings` mutation - update any setting
  - `markMigrationComplete` mutation - set flag after migration

#### 2.3 Implement Migration Logic
- [ ] Update `app/hooks/use-calculator-settings.ts`:
  - Check if user is authenticated
  - If authenticated: use Convex queries/mutations
  - If anonymous: use localStorage (existing behavior)
  - On first auth: trigger one-time migration

- [ ] Create migration helper:
  ```typescript
  async function migrateLocalStorageToConvex(userId: string) {
    const localData = loadCreditCards();

    // Only migrate custom cards and customized presets
    const cardsToMigrate = localData.cards.filter(
      card => !card.isPreset || hasBeenCustomized(card)
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

#### 2.4 Update Dashboard Components
- [ ] Update `useCalculatorSettings` hook to support both sources
- [ ] Update `CardManagerDrawer` to use Convex mutations when authenticated
- [ ] Add loading states during migration
- [ ] Handle edge cases (offline, failed migration, etc.)

### Automated Tests
- [ ] Unit test: `convex/userCards.ts` - CRUD operations (getUserCards, addCard, updateCard, deleteCard)
- [ ] Unit test: `convex/userCards.ts` - migrateFromLocalStorage bulk import
- [ ] Unit test: `convex/userSettings.ts` - getSettings, updateSettings
- [ ] Unit test: Migration helper - filters custom vs preset cards correctly
- [ ] Unit test: `useCalculatorSettings` hook - switches between localStorage and Convex based on auth
- [ ] Browser test: CardManagerDrawer - works for both anonymous and authenticated users

### Manual Testing Checklist (Dev Environment)

| Test | Steps | Expected Result |
|------|-------|-----------------|
| Anonymous user | Don't sign in → Add custom card | Card saved to localStorage, persists on refresh |
| New user, empty localStorage | Clear localStorage → Sign up | User created, default cards shown, no migration runs |
| New user, existing localStorage | Add custom cards → Sign up | Cards migrated to Convex, localStorage cleared |
| Migration verification | After migration → Check Convex dashboard | Custom cards in `userCreditCards` table |
| Returning user | Sign out → Sign in again | Cards loaded from Convex (not localStorage) |
| Card sync | Add card while signed in | Card appears immediately, persisted in Convex |
| Failed migration recovery | Simulate failed migration → Retry | Migration completes on next auth check |
| Offline behavior | Go offline → Try to add card | Graceful error message |

### Deployment Steps
1. [ ] Run `npx convex dev --once` to push schema changes to prod
2. [ ] Verify tables created in Convex dashboard (`userCreditCards`, `userSettings`)
3. [ ] Merge migration code to main
4. [ ] Deploy to Railway
5. [ ] Smoke test in production:
   - [ ] Anonymous user can still use localStorage
   - [ ] New signup triggers migration (if they have localStorage data)
   - [ ] Returning user loads from Convex
6. [ ] Monitor Convex logs for migration errors

### Deliverables
- Authenticated users' cards stored in Convex
- Anonymous users continue using localStorage
- Seamless one-time migration on first auth
- No data loss during migration
- **Can stop here**: Users have accounts with persisted settings, ready for subscriptions

---

## Phase 3: Stripe Integration

**Status:** Not Started
**Estimated Sessions:** 2-3
**Depends On:** Phase 2

### Pricing Model
- **Free Tier:** View dashboard, no alerts
- **Pro Tier:** $X/month - Unlimited alerts (email)
- Future: Add SMS tier when LLC is formed

### Tasks

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

| Test | Steps | Expected Result |
|------|-------|-----------------|
| Checkout flow | Click "Upgrade to Pro" → Complete checkout with test card `4242424242424242` | Redirected back, status shows "Pro" |
| Webhook: checkout completed | Complete checkout → Check Convex | `userSubscriptions` row created with `status: active` |
| Subscription status | After checkout → Refresh page | Pro badge shown, alerts enabled |
| Customer portal | Click "Manage Subscription" | Stripe portal opens, can view/cancel |
| Cancel subscription | In portal → Cancel | Status changes to "canceled", alerts disabled |
| Webhook: subscription canceled | Cancel in portal → Check Convex | Status updated to "canceled" |
| Failed payment | Use test card `4000000000000341` | Status changes to "past_due" |
| Reactivate | After cancel → Upgrade again | New subscription created, status "active" |
| Free user gating | Don't subscribe → Try to create alert | Upgrade prompt shown |

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

**Status:** Not Started
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

#### 4.1 Schema Design
- [ ] Add to `convex/schema.ts`:
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
- [ ] Create `convex/alertEngine.ts`:
  - `evaluateAlerts` internal action - run on price/stock updates
  - `checkSKUAlert` helper - check if specific product matches
  - `checkCategoryAlert` helper - check if any category product matches
  - `checkThresholdAlert` helper - check if threshold conditions met
  - `queueAlertBatch` mutation - add to batch queue

- [ ] Integrate with existing cron jobs:
  - After `fetchNewData` (Costco) → evaluate alerts
  - After price history updates → evaluate threshold alerts

#### 4.3 Batch Processing & Email
- [ ] Create `convex/alertNotifications.ts`:
  - `processPendingBatches` action - run every 15 minutes
  - `sendAlertEmail` action - send via Resend
  - `formatAlertDigest` helper - create email HTML

- [ ] Set up Resend:
  - [ ] Create Resend account
  - [ ] Add domain verification
  - [ ] Get API key
  - [ ] Add `RESEND_API_KEY` to Railway

- [ ] Design email template:
  - Clean, mobile-friendly design
  - List of triggered alerts with products
  - Direct links to products on dashboard
  - Unsubscribe / manage alerts link

#### 4.4 Alert Management UI
- [ ] Create `/alerts` route:
  - List all user alerts
  - Create new alert form
  - Edit existing alert
  - Enable/disable toggle
  - Delete alert

- [ ] Alert creation wizard:
  - Step 1: Choose type (SKU, Category, Threshold)
  - Step 2: Configure conditions
  - Step 3: Set notification preferences
  - Preview matching products

- [ ] Add "Create Alert" button to product cards:
  - Quick action to create SKU alert for that product

#### 4.5 Subscription Gating
- [ ] Check subscription status before:
  - Creating new alerts
  - Enabling disabled alerts
  - Sending notification emails

- [ ] Show subscription prompt when:
  - Free user tries to create alert
  - Alert limit reached (if implementing limits)

### Automated Tests
- [ ] Unit test: `convex/alerts.ts` - CRUD operations (createAlert, updateAlert, deleteAlert, getAlerts)
- [ ] Unit test: `convex/alertEngine.ts` - checkSKUAlert matches specific product
- [ ] Unit test: `convex/alertEngine.ts` - checkCategoryAlert filters correctly
- [ ] Unit test: `convex/alertEngine.ts` - checkThresholdAlert calculates above-spot correctly
- [ ] Unit test: `convex/alertEngine.ts` - cooldown period enforced
- [ ] Unit test: `convex/alertNotifications.ts` - formatAlertDigest generates valid HTML
- [ ] Unit test: `convex/alertNotifications.ts` - processPendingBatches sends batched emails
- [ ] Integration test: End-to-end alert flow (create → trigger → email)

### Manual Testing Checklist (Dev Environment)
**Important:** Use Resend test mode or verified test email addresses

| Test | Steps | Expected Result |
|------|-------|-----------------|
| Create SKU alert | Pick product → "Create Alert" → Save | Alert created, shows in /alerts |
| Create category alert | /alerts → New → Gold, 1oz → Save | Alert created with category filter |
| Create threshold alert | /alerts → New → Below 0.5% above spot → Save | Alert created with threshold |
| Alert list | Navigate to /alerts | All user's alerts shown with enable/disable toggles |
| Edit alert | Click alert → Modify → Save | Changes persisted |
| Delete alert | Click alert → Delete → Confirm | Alert removed |
| SKU alert trigger | Create alert for OOS product → Mark in stock (in dev) | Alert triggered, added to batch |
| Category alert trigger | Create "all gold" alert → Change gold product price (in dev) | Alert triggered for matching products |
| Threshold alert trigger | Create "below 1% above spot" → Adjust product (in dev) | Alert triggered when threshold met |
| Batch collection | Trigger multiple alerts | All collected in single batch |
| Email digest | Wait for batch processing (or trigger manually) | Email received with all alerts |
| Cooldown | Trigger same alert twice quickly | Second trigger ignored until cooldown expires |
| Subscription gating | Unsubscribe → Try to create alert | Upgrade prompt shown |
| Unsubscribe email | Click unsubscribe link in email | Alert disabled or settings updated |

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
1. [ ] Set up Resend account and verify domain
2. [ ] Add `RESEND_API_KEY` to Railway
3. [ ] Push schema changes to Convex prod
4. [ ] Deploy to Railway
5. [ ] Create test alert for yourself
6. [ ] Trigger alert manually (via Convex dashboard) to verify email
7. [ ] Wait for real data update to verify automatic triggering
8. [ ] Monitor:
   - Resend dashboard for delivery rates
   - Convex logs for evaluation errors
   - `alertHistory` table for trigger records

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
```

---

## Session Log

Track progress across sessions here:

| Session | Date | Phase | Completed |
|---------|------|-------|-----------|
| 1 | 2024-12-27 | Planning | Created roadmap, added Phase 0 (dev env), testing & deployment for all phases |
| 2 | 2025-12-27 | Phase 0 | Dev env setup complete: crons disabled, prod snapshot imported, scripts created |
| 3 | 2025-12-27 | Phase 1 | 1.1-1.2 complete: Clerk prod configured, auth enabled, Google login + admin verified |
| 4 | - | - | - |

---

## Notes

- Keep localStorage as fallback for anonymous users (never fully remove)
- Use Convex actions for external API calls (Stripe, Resend)
- Test webhooks locally with Stripe CLI before deploying
- Consider rate limiting on alert creation
- Monitor email deliverability in Resend dashboard
