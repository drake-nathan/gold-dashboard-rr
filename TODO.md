# TODO: Future Features & Improvements

> **Last Audit:** October 30, 2025 - See FRONTEND_AUDIT_2025-10-30.md for full details

## 🎯 Priority: IMMEDIATE (Next Sprint)

### Accessibility Fixes (HIGH IMPACT - 2-3 hours) ✅ COMPLETED

- [x] Add `alt` text to product images (app/components/product-card.tsx:73) - Already existed
- [x] Add ARIA labels to filter controls - Already existed with proper Label components
- [x] Add ARIA labels to calculator controls - Already existed with proper Label components
- [x] Improve keyboard navigation for product cards - Added tabIndex and focus rings
- [x] Add text alternatives for color-only profit/loss indicators - Added sr-only text
- [x] Add `aria-label` to trend badges (green/red indicators) - Added with aria-hidden on icons
- [x] Make tooltips keyboard accessible - Wrapped in focusable buttons

### Code Cleanup (5 minutes) ✅ COMPLETED

- [x] Remove duplicate `ProductFilters` component (app/components/product-filters.tsx) - Deleted and refactored to DRY components

## 🚀 Priority: SHORT TERM (1-2 Weeks)

### UI/UX Improvements

- [ ] Add loading skeletons instead of empty states (1-2 hours)
- [x] Add URL state for filters (shareable links) (2-3 hours) - ✅ COMPLETED using useSearchParams
- [ ] Add error boundaries around product grid (1 hour)
- [ ] Add placeholder images for missing product thumbnails
- [ ] Add retry mechanism for failed data loads

### Mobile Optimization (4-6 hours) ✅ COMPLETED

- [ ] Test on real mobile devices - Ready for testing
- [x] Fix filter bar wrapping on mobile - Implemented mobile drawer/sheet with DRY components
- [x] Adjust stat cards for small screens - Responsive grid layout (2-col on mobile, flex on desktop)
- [x] Adjust product grid min-width for mobile - Single column on mobile, auto-fill on tablet+
- [x] Mobile drawer for filters/calculator - Sheet component with bottom slide-up

## 📅 Priority: MEDIUM TERM (2-4 Weeks)

### Credit Card Management (✅ COMPLETED - January 2025)

- [x] Custom credit card management with local storage (6-8 hours) - ✅ COMPLETED
  - [x] Add/edit/delete custom cards with validation
  - [x] Customize preset card values (points per dollar, value per point)
  - [x] Searchable combobox selector with "Manage Cards" option
  - [x] Responsive drawer UI (Sheet component)
  - [x] Zod schema validation for all card data
  - [x] Local storage persistence with last selected card
  - [x] Reset preset cards to default values
  - [x] Alphabetical sorting (presets first, then custom)
  - [x] React Hook Form integration with real-time validation
  - [x] Sonner toast notifications for user feedback
  - [x] Confirmation dialogs for destructive actions (delete/reset)

**Next Steps for Credit Card System**:

- [ ] Migrate to database when auth is enabled (see implementation notes below)
- [ ] Add more preset cards based on user feedback
- [ ] Add card color/icon customization for visual distinction
- [ ] Add bulk import/export of custom cards (JSON format)

### Authentication & User Settings

- [ ] Enable and test Clerk authentication (already integrated in root.tsx) (4-6 hours)
- [ ] Add user settings table in Convex (3-4 hours)
- [ ] **Migrate credit cards to database** (2-3 hours):
  - [ ] Create `userCreditCards` Convex table with userId foreign key
  - [ ] Replace `loadCreditCards()` with Convex query (authenticated users)
  - [ ] Replace `saveCreditCards()` with Convex mutations
  - [ ] Keep local storage as fallback for anonymous users
  - [ ] Implement one-time migration from localStorage to database on first auth
- [ ] Persist calculator settings (Costco membership) per user
- [ ] Add user profile page

### Filters & Sorting Enhancements

- [ ] Add weight range filter
- [ ] Add brand filter
- [ ] Add price range filter
- [ ] Add "only show deals" toggle (negative spreads only)
- [ ] Save filter preferences (URL params + user settings)

### Data Quality & Error Handling

- [ ] Set a single current price by type
- [ ] Run a new job to check the stock by product
- [ ] Handle edge cases where pricing data is missing
- [ ] Show data freshness indicators
- [ ] Add fallback UI when market prices fail to load
- [ ] Improve empty states with actionable messages

## 📊 Priority: LONG TERM (1+ Month)

### Collect Pure Integration

- [x] ~~Get actual Collect Pure product URLs~~ - Using Pure product IDs directly
- [x] ~~Improve product matching logic~~ - Conservative algorithm with phrase matching implemented
- [x] ~~Add product mapping UI for manual matching~~ - Using `manuallyMatchProduct` mutation via Convex dashboard
- [ ] **Implement logging service for product match notifications** - Currently match results (auto-matched, needs_review, fallback, manual_matched) are logged to console. Need a proper logging service to track match attempts, notify on failures, and provide visibility into matching quality over time.
- [ ] Add UI for viewing match status and manually matching products (currently done via Convex dashboard)
- [ ] Add Pure product search/browse UI to make manual matching easier

### Data & Analytics

- [ ] Add price history charts for individual products
- [ ] Add stock availability notifications/alerts
- [ ] Show trending products (best spreads over time)

### UI/UX Enhancements

- [ ] Add product image zoom/lightbox
- [ ] Add favorites/watchlist functionality
- [ ] Add product comparison tool (side-by-side)
- [ ] Add animations/transitions for better UX

### Performance

- [ ] Implement pagination or virtual scrolling for large product lists
- [ ] Add caching strategy for Convex queries
- [ ] Optimize images (lazy loading, srcset)

### Testing

- [ ] Add unit tests for calculator logic
- [ ] Add component tests
- [ ] Add E2E tests for critical flows

## 💡 Nice to Have (Backlog)

- [ ] Export product data to CSV/Excel
- [ ] Add email notifications for price drops
- [ ] Add RSS feed for deals
- [ ] Multi-currency support
- [ ] Add product notes/comments per user

---

## 📝 Notes

- **React Compiler:** Manual memoization (useMemo/useCallback) is NOT needed - React Compiler handles optimizations automatically
- **SSR:** Using optimal Convex `preloadQuery` pattern - no loading states needed
- **Type Safety:** TypeScript compiles without errors, strong typing throughout

---

## 🛠️ Implementation Notes

### Credit Card Database Migration (When Auth is Enabled)

**Current State (January 2025):**

- Credit cards stored in browser localStorage
- Zod-validated schema ensures data integrity
- Works perfectly for anonymous users
- Auto-saves on every change
- Remembers last selected card

**Migration Steps:**

1. **Create Convex Schema** (`convex/schema.ts`):

```typescript
userCreditCards: defineTable({
  userId: v.string(),           // Clerk user ID
  cardId: v.string(),            // Unique card ID (custom-timestamp-random)
  name: v.string(),              // Card name
  issuer: v.optional(v.string()),// Card issuer
  pointsPerDollar: v.number(),   // Earn rate
  valuePerPoint: v.number(),     // Point value
  isPreset: v.boolean(),         // Whether it's a preset
  isCustomizable: v.boolean(),   // Whether preset can be customized
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_user_and_card", ["userId", "cardId"]),

userSettings: defineTable({
  userId: v.string(),
  lastSelectedCardId: v.optional(v.string()),
  costcoMembershipEnabled: v.boolean(),
  // ... other settings
})
  .index("by_user", ["userId"]),
```

2. **Create Convex Functions** (`convex/creditCards.ts`):

```typescript
// Query: Get user's credit cards
export const getUserCards = query({
  args: {},
  handler: async (ctx) => {
    const userId = await ctx.auth.getUserIdentity();
    if (!userId) return null;

    const cards = await ctx.db
      .query("userCreditCards")
      .withIndex("by_user", (q) => q.eq("userId", userId.subject))
      .collect();

    return cards;
  },
});

// Mutation: Add custom card
export const addCard = mutation({
  args: {
    name: v.string(),
    issuer: v.optional(v.string()),
    pointsPerDollar: v.number(),
    valuePerPoint: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await ctx.auth.getUserIdentity();
    if (!userId) throw new Error("Unauthorized");

    // Validate with Zod (reuse existing schema)
    // Insert card
    // Return new card
  },
});

// Mutation: Update card
// Mutation: Delete card
// Mutation: Reset preset card
```

3. **Update `app/lib/credit-cards.ts`**:

```typescript
// Add new functions that use Convex instead of localStorage
export function useUserCreditCards() {
  const { isAuthenticated } = useAuth();
  const convexCards = useQuery(api.creditCards.getUserCards);
  const localCards = loadCreditCards(); // Fallback

  return isAuthenticated ? convexCards : localCards.cards;
}

// Migration helper
export async function migrateLocalStorageToDatabase(
  localCards: CreditCard[],
  addCardMutation: UseMutation<typeof api.creditCards.addCard>,
) {
  // One-time migration on first auth
  for (const card of localCards) {
    if (!card.isPreset) {
      // Only migrate custom cards
      await addCardMutation(card);
    }
  }
  // Clear localStorage after successful migration
}
```

4. **Update Dashboard** (`app/components/dashboard/index.tsx`):

```typescript
const { isAuthenticated } = useAuth();
const convexCards = useQuery(api.creditCards.getUserCards);
const [localCards, setLocalCards] = useState<CreditCard[]>([]);

const availableCards = isAuthenticated ? (convexCards ?? []) : localCards;

// Handle migration on first auth
useEffect(() => {
  if (isAuthenticated && convexCards !== undefined && !hasMigrated) {
    const local = loadCreditCards();
    if (local.cards.some((c) => !c.isPreset)) {
      migrateLocalStorageToDatabase(local.cards, addCardMutation);
      setHasMigrated(true);
    }
  }
}, [isAuthenticated, convexCards]);
```

5. **Testing Checklist**:

- [ ] Anonymous users can still use localStorage
- [ ] Auth users see their cards from database
- [ ] Migration runs only once per user
- [ ] Custom cards preserved during migration
- [ ] Preset cards not duplicated
- [ ] Last selected card persists
- [ ] Works offline (localStorage fallback)

**Estimated Time**: 2-3 hours total
