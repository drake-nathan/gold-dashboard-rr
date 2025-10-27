# TODO: Future Features & Improvements

## Authentication & User Settings

- [ ] Integrate Clerk for authentication (Sign In / Sign Up)
- [ ] Add user settings table in Convex
- [ ] Persist calculator settings (Costco membership, credit card preferences) per user
- [ ] Add user profile page

## Collect Pure Integration

- [x] ~~Get actual Collect Pure product URLs~~ - Using Pure product IDs directly
- [x] ~~Improve product matching logic~~ - Conservative algorithm with phrase matching implemented
- [x] ~~Add product mapping UI for manual matching~~ - Using `manuallyMatchProduct` mutation via Convex dashboard
- [ ] **Implement logging service for product match notifications** - Currently match results (auto-matched, needs_review, fallback, manual_matched) are logged to console. Need a proper logging service to track match attempts, notify on failures, and provide visibility into matching quality over time.
- [ ] Add UI for viewing match status and manually matching products (currently done via Convex dashboard)
- [ ] Add Pure product search/browse UI to make manual matching easier

## Data & Analytics

- [ ] Add price history charts for individual products
- [ ] Add stock availability notifications/alerts
- [ ] Show trending products (best spreads over time)
- [ ] Add last updated timestamp display for prices

## UI/UX Enhancements

- [ ] Add product image zoom/lightbox
- [ ] Add favorites/watchlist functionality
- [ ] Add product comparison tool (side-by-side)
- [ ] Add loading skeletons instead of simple loading text
- [ ] Add animations/transitions for better UX
- [ ] Mobile menu for header on small screens

## Filters & Sorting

- [ ] Add weight range filter
- [ ] Add brand filter
- [ ] Add price range filter
- [ ] Add "only show deals" toggle (negative spreads only)
- [ ] Save filter preferences

## Performance

- [ ] Implement pagination or virtual scrolling for large product lists
- [ ] Add caching strategy for Convex queries
- [ ] Optimize images (lazy loading, srcset)

## Data Quality

- [ ] Handle edge cases where pricing data is missing
- [ ] Add data validation and error boundaries
- [ ] Show data freshness indicators

## Testing

- [ ] Add unit tests for calculator logic
- [ ] Add component tests
- [ ] Add E2E tests for critical flows

## Nice to Have

- [ ] Export product data to CSV/Excel
- [ ] Add email notifications for price drops
- [ ] Add RSS feed for deals
- [ ] Multi-currency support
- [ ] Add product notes/comments per user
