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

### Authentication & User Settings

- [ ] Enable and test Clerk authentication (already integrated in root.tsx) (4-6 hours)
- [ ] Add user settings table in Convex (3-4 hours)
- [ ] Persist calculator settings (Costco membership, credit card preferences) per user
- [ ] Use localStorage for anonymous users as fallback
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
