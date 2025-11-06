# Testing Plan & Coverage Strategy

> **Coverage Baseline**: 1.94% (January 2025)
> **Current Tests**: 69 total (60 unit + 9 browser)
> **Goal**: Achieve 70%+ coverage on business logic, utilities, and critical UI components

---

## Current Coverage Report

```
File               | % Stmts | % Branch | % Funcs | % Lines | Status
-------------------|---------|----------|---------|---------|--------
All files          |    1.94 |     1.68 |    7.63 |    1.67 | 🔴
app/utils          |   51.92 |    48.93 |   66.66 |      52 | 🟡
app/lib            |      47 |    34.37 |   55.17 |   45.36 | 🟡
app/components     |       0 |        0 |       0 |       0 | 🔴
app/hooks          |       0 |        0 |       0 |       0 | 🔴
```

### Fully Covered Files ✅

- `app/utils/format.ts` - 100% coverage (16 tests)
- `app/utils/product-calculations.ts` - 100% coverage (14 tests)
- `app/lib/credit-cards.ts` - 55.84% coverage (30 tests) - Good foundation

### Partially Covered Files 🟡

- `app/lib/pure-fee-tiers.ts` - 31.57% coverage - Needs more tests
- `app/lib/cn.ts` - 0% (trivial utility, low priority)

### Uncovered Files 🔴

See priority sections below for detailed breakdown.

---

## Testing Priority: HIGH (Next 1-2 Weeks)

### 1. Pure Utility Functions (Quick Wins - 1-2 hours)

**Estimated Impact**: +3% coverage
**Files**: 2 files, ~50 lines total

#### `app/utils/format-time.ts` ⭐️ **Highest Priority**

- **Current Coverage**: 0%
- **Functions**: `formatRelativeTime(timestamp: number)`
- **Why Test**: User-facing time formatting with many edge cases
- **Test Cases** (~10 tests):
  - Seconds: "just now" (0-44s), "a minute ago" (45-89s)
  - Minutes: "N minutes ago" (90s-44m), "an hour ago" (45-89m)
  - Hours: "N hours ago" (90m-21h), "a day ago" (22-35h)
  - Days: "N days ago" (36h-25d), "a month ago" (26-45d)
  - Months: "N months ago" (46d-319d), "a year ago" (320-547d)
  - Years: "N years ago" (548d+)
  - Edge cases: negative timestamps, future timestamps
- **Effort**: 30 minutes

#### `app/utils/pure-url.ts` ⭐️

- **Current Coverage**: 0%
- **Functions**: `generatePureProductUrl(sku: string)`
- **Why Test**: Critical for external navigation, simple but important
- **Test Cases** (~3 tests):
  - Valid SKU generates correct URL
  - Empty SKU returns base URL
  - Special characters in SKU are handled
- **Effort**: 15 minutes

---

### 2. Pure Fee Tiers Library (Medium Win - 1 hour)

**Estimated Impact**: +2% coverage
**File**: `app/lib/pure-fee-tiers.ts` (currently 31.57%)

#### Missing Test Coverage

- **Uncovered Lines**: 39-41, 47-49, 61-63, 78-87, 103-105
- **Why Test**: Business logic for fee calculations, localStorage integration
- **Test Cases** (~8 tests):
  - `getFeeRateForMetal()` with valid/invalid tier and metal type
  - `formatTierDisplay()` with all tier variations
  - `loadPureFeeTier()` with valid/invalid localStorage data
  - `savePureFeeTier()` persistence and validation
  - Edge cases: malformed tier names, missing localStorage
- **Effort**: 1 hour

---

### 3. Convex Business Logic (High Value - 3-4 hours)

**Estimated Impact**: High confidence in core calculations
**Approach**: Extract pure functions, test in isolation

#### `convex/costco.ts` - Parsing & Matching ⭐️⭐️

**Priority Functions to Extract & Test**:

1. **`extractWeightInOz(text: string)`**
   - Parses "1 oz", "1/2 oz", "10oz", "50 gram" formats
   - **Test Cases** (~12 tests):
     - Standard formats: "1 oz", "10 oz", "100 oz"
     - Fractional: "1/2 oz", "1/4 oz", "1/10 oz"
     - No space: "1oz", "10oz"
     - Grams: "50 gram", "100 grams", "31.1g"
     - Edge cases: "oz" without number, invalid formats
     - Multiple matches (first one wins)
   - **Effort**: 1 hour

2. **`extractMetalAttributes(product)`**
   - Extracts weight, metal type, price from product data
   - **Test Cases** (~8 tests):
     - Complete product data
     - Missing optional fields
     - Various metal types (gold, silver, platinum)
     - Price parsing with different formats
     - Invalid/malformed data
   - **Effort**: 1 hour

3. **`getFallbackPureId(metalType, weightInOz)`**
   - Weight-based fallback matching logic
   - **Test Cases** (~6 tests):
     - Exact weight matches
     - Approximate weight matches (within threshold)
     - No matching weight
     - Edge cases: 0 oz, negative oz
   - **Effort**: 45 minutes

4. **`matchCostcoProductToPure()` scoring algorithm** (Optional - Complex)
   - Conservative matching with phrase scoring
   - Could be tested, but may require refactoring for testability
   - **Defer**: Consider adding integration tests via Convex test suite

**Total Effort**: 2.75 hours (without matching algorithm)

#### `convex/dashboard.ts` - Spread Calculations ⭐️

1. **`calculateSpread(costcoProduct, pureBid, cashbackPercent)`**
   - Core arbitrage calculation
   - **Test Cases** (~8 tests):
     - Profitable scenario (negative spread)
     - Loss scenario (positive spread)
     - Zero spread (break-even)
     - With/without cashback
     - Missing prices (edge cases)
     - High cashback rates (stress test)
   - **Effort**: 1 hour

#### `convex/pure.ts` - Pure API Parsing ⭐️

1. **`parseWeightToOz(weight: string, unit: string)`**
   - Converts Pure API weight formats to ounces
   - **Test Cases** (~6 tests):
     - "oz" unit: "1", "10", "0.5"
     - "g" unit: "31.1", "311", "1000"
     - Edge cases: empty string, invalid numbers
   - **Effort**: 30 minutes

2. **`extractProductType(name: string)`**
   - Extracts product type from name (coin, bar, round)
   - **Test Cases** (~5 tests):
     - Matches "coin", "bar", "round", "bullion"
     - Case insensitivity
     - Fallback to empty string
   - **Effort**: 30 minutes

---

## Testing Priority: MEDIUM (2-4 Weeks)

### 4. Complex UI Components (High Impact - 4-6 hours)

**Estimated Impact**: +5-8% coverage + critical user flows validated
**Approach**: Browser tests with `vitest-browser-react`

#### `app/components/card-manager-drawer.tsx` ⭐️⭐️⭐️

- **Current Coverage**: 0%
- **Why Test**: Critical user flow, complex form validation, state management
- **Test Categories**:

  **Form Validation** (~8 tests):
  - Required fields (name)
  - Numeric validation (points per dollar, value per point)
  - Range validation (0-100 for points, 0-1 for value)
  - Real-time error messages
  - Submit disabled when invalid

  **CRUD Operations** (~10 tests):
  - Add custom card with valid data
  - Edit existing custom card
  - Delete custom card (with confirmation)
  - Reset preset card values (with confirmation)
  - Cancel operations

  **Combobox Integration** (~4 tests):
  - Search/filter cards by name
  - Select card updates calculator
  - "Manage Cards" opens drawer
  - Newly added card appears in list

  **Cashback Calculation Display** (~3 tests):
  - Shows correct percentage in real-time
  - Updates on input change
  - Formats correctly

- **Total Tests**: ~25 browser tests
- **Effort**: 3 hours

#### `app/components/ui/swipeable-card.tsx` ⭐️⭐️

- **Current Coverage**: 0%
- **Why Test**: Complex touch interaction logic with state management
- **Test Categories**:

  **Touch Gesture Handling** (~6 tests):
  - Swipe right triggers delete animation
  - Swipe threshold detection (50% width)
  - Partial swipe resets to original position
  - Touch start/move/end event flow
  - Multiple rapid swipes

  **State Management** (~4 tests):
  - Transform state updates correctly
  - Transition classes applied/removed
  - Delete callback fired on full swipe
  - Reset state after delete

- **Total Tests**: ~10 browser tests
- **Effort**: 1.5 hours

#### `app/components/dashboard/index.tsx` ⭐️

- **Current Coverage**: 0%
- **Why Test**: Core app orchestration, URL state, filter/sort logic
- **Refactoring Opportunity**: Extract pure functions for filter/sort logic

  **Option A: Test as Component** (~8 browser tests)
  - URL parameter synchronization
  - Filter controls update product list
  - Sort controls reorder products
  - Auto-flip when no products in stock

  **Option B: Extract & Unit Test** (~12 unit tests) - **Recommended**
  - Create `app/utils/product-filters.ts` with:
    - `filterProducts(products, filters)`
    - `sortProducts(products, sortBy, sortOrder)`
    - `shouldAutoFlipToOutOfStock(products, filters)`
  - Test filter logic in isolation (faster, easier)
  - Keep component tests simple (integration only)

- **Effort**: 2 hours (Option B)

---

### 5. Responsive Components (Lower Impact - 2 hours)

**Estimated Impact**: +2% coverage
**Files**: Media query components

#### `app/components/dashboard/filters.tsx`

- **Current Coverage**: 0%
- **Test Categories** (~4 tests):
  - Desktop: Inline filters render
  - Mobile: Sheet/drawer renders
  - Breakpoint detection (useMediaQuery)
  - Filter state persists across layouts

#### `app/components/dashboard/calculator-controls.tsx`

- **Current Coverage**: 0%
- **Test Categories** (~4 tests):
  - Desktop: Combobox renders
  - Mobile: Native Select renders
  - "Manage Cards" button visibility
  - Card selection updates parent state

**Total Effort**: 2 hours

---

## Testing Priority: LOW (Backlog)

### 6. Hooks Testing (Complex - Consider Refactoring)

**Estimated Impact**: +2% coverage
**Approach**: Extract logic to pure functions OR use `@testing-library/react-hooks`

#### `app/hooks/use-calculator-settings.ts`

- **Current Coverage**: 0%
- **Complexity**: High (state management, localStorage, derived state)
- **Recommendation**:
  - Already follows best practices (useMemo for derived state)
  - Could extract selector functions for unit testing:
    - `selectDefaultCard(cards, lastSelectedId, costcoMembership)`
    - `buildSettings(selectedCard, costcoMembership, feeTier)`
  - Test pure functions, skip hook testing

#### Other Hooks

- `use-credit-cards-storage.ts` - Wraps library (low value)
- `use-pure-fee-tier-storage.ts` - Simple localStorage (low value)

**Effort**: 2-3 hours (if pursued)

---

### 7. Presentational Components (Low Value)

**Estimated Impact**: +3% coverage (not worth effort)
**Reason**: Shadcn components are well-tested upstream

- `app/components/ui/*` - Badge, Button, Card, etc.
- `app/components/dashboard/stats.tsx` - Simple stat cards
- `app/components/product-card/index.tsx` - Mostly display logic
- `app/components/product-card/price-row.tsx` - Trivial row component

**Skip Unless**: Specific bugs occur in these components

---

## Testing Roadmap: Execution Order

### Week 1: Quick Wins (4-5 hours)

1. ✅ **Setup coverage tracking** (30 min)
   - Add coverage config to vitest configs
   - Add npm scripts
   - Generate baseline report

2. 🎯 **Pure utility functions** (1.5 hours)
   - `format-time.ts` - 10 tests
   - `pure-url.ts` - 3 tests
   - `pure-fee-tiers.ts` - 8 tests

3. 🎯 **Convex parsing helpers** (2.75 hours)
   - Extract and test `extractWeightInOz()`
   - Extract and test `extractMetalAttributes()`
   - Extract and test `getFallbackPureId()`

4. 📊 **Expected Coverage**: ~8-10%

---

### Week 2: Business Logic (4-5 hours)

5. 🎯 **Convex calculation helpers** (2 hours)
   - Extract and test `calculateSpread()`
   - Extract and test `parseWeightToOz()`
   - Extract and test `extractProductType()`

6. 🎯 **Dashboard filter/sort logic** (2 hours)
   - Extract `app/utils/product-filters.ts`
   - Test `filterProducts()` - 8 tests
   - Test `sortProducts()` - 4 tests

7. 📊 **Expected Coverage**: ~15-18%

---

### Week 3-4: Critical UI Components (6-8 hours)

8. 🎯 **Card Manager Drawer** (3 hours)
   - Form validation tests - 8 tests
   - CRUD operations - 10 tests
   - Combobox integration - 4 tests
   - Cashback calculation - 3 tests

9. 🎯 **Swipeable Card** (1.5 hours)
   - Touch gesture handling - 6 tests
   - State management - 4 tests

10. 🎯 **Responsive Components** (2 hours)
    - Filter drawer - 4 tests
    - Calculator controls - 4 tests

11. 📊 **Expected Coverage**: ~25-30%

---

### Week 5+: Optional Enhancements

12. 🔍 **Integration Tests** (Optional)
    - Dashboard full flow (filter → sort → calculator)
    - Card manager → calculator integration
    - URL state persistence

13. 🔍 **Convex Function Tests** (Optional)
    - Use Convex test suite for mutation/query testing
    - Test database interactions

14. 📊 **Target Coverage**: 30-40%

---

## Running Tests with Coverage

### Commands

```bash
# Unit tests with coverage
bun run test:coverage

# Browser tests with coverage
bun run test:coverage:browser

# Watch mode (no coverage)
bun run test:watch
bun run test:browser:watch
```

### Coverage Reports

- **Text Output**: Terminal summary
- **HTML Report**: `coverage/index.html` (detailed, browsable)
- **JSON Report**: `coverage/coverage-final.json` (for CI/CD)

### Viewing HTML Report

```bash
open coverage/index.html
```

---

## Coverage Goals

### Short-Term (1 month)

- **Overall**: 15-20%
- **Business Logic** (`utils/`, `lib/`): 70%+
- **Critical Components** (`card-manager-drawer`, `swipeable-card`): 60%+

### Medium-Term (3 months)

- **Overall**: 30-40%
- **Convex Helpers**: 80%+
- **Dashboard Logic**: 70%+

### Long-Term (6 months)

- **Overall**: 40-50%
- **E2E Critical Flows**: 3-5 scenarios

---

## Testing Philosophy

### What to Test

✅ **Pure functions** - Easy to test, high value
✅ **Business logic** - Calculations, parsing, matching
✅ **Complex interactions** - Forms, gestures, state changes
✅ **Critical user flows** - Card management, product filtering

### What NOT to Test

❌ **Shadcn components** - Tested upstream
❌ **Simple presentational components** - Low ROI
❌ **Implementation details** - Test behavior, not internals
❌ **Third-party libraries** - Trust but verify at boundaries

### Test Quality > Coverage %

- Focus on edge cases and error conditions
- Test user-facing behavior, not internal state
- Keep tests maintainable and readable
- Avoid brittle tests that break on refactors

---

## Notes

- **Convex Testing**: Extract pure helpers first, test those. Use Convex test suite for database interactions.
- **Hook Testing**: Prefer extracting logic to pure functions over testing hooks directly.
- **Browser Tests**: Use for user interactions (clicks, forms, gestures). Use unit tests for logic.
- **Coverage Tool**: Using `@vitest/coverage-v8` for speed and accuracy.
- **CI Integration**: All tests run in `bun run ci` script (format, lint, typecheck, test, test:browser).

---

## Success Metrics

- ✅ No regressions in production
- ✅ Faster debugging (tests reveal root cause)
- ✅ Confident refactoring (tests catch breaks)
- ✅ Faster PR reviews (tests document behavior)
- ✅ Reduced manual testing time
