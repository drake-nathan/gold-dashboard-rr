# Project Audit Report: Dashboard.Gold

**Date:** November 2, 2025
**Auditor:** Claude Code
**Version:** 1.0

## Executive Summary

The Dashboard.Gold project demonstrates **solid architectural foundations** with clear separation of concerns, but has significant gaps in testability and some opportunities for improved organization. The project is production-ready from a functionality standpoint but lacks the testing infrastructure needed for confident refactoring and maintenance.

**Overall Grade: B-**

- File Organization: **A-**
- Component Architecture: **B+**
- Function Organization: **A-**
- Testability: **D**

---

## 1. File Organization Analysis

### ✅ Strengths

**Well-structured directory hierarchy:**

```
app/
├── components/
│   ├── dashboard/          # Domain-specific components
│   ├── header/            # Header-specific components
│   ├── product-card/      # Product card components
│   └── ui/                # Reusable UI primitives (Shadcn)
├── lib/                   # Business logic libraries
├── providers/             # React context providers
├── routes/               # React Router routes
└── utils/                # Pure utility functions

convex/
├── costco.ts            # Costco data fetching
├── dashboard.ts         # Dashboard queries
├── pure.ts              # Collect Pure API
├── fmp.ts              # Financial APIs
├── twelve.ts           # Market prices
├── crons.ts            # Scheduled jobs
└── schema.ts           # Database schema
```

**Appropriate separation:**

- UI primitives isolated in `components/ui/`
- Business logic in `lib/` (credit cards, fee tiers)
- Pure utilities in `utils/` (formatting, calculations)
- Backend concerns cleanly separated in `convex/`

### ⚠️ Issues

1. **Duplicate component files** (app/components/product-card/index.tsx:1):
   - Both `product-card.tsx` and `product-card/index.tsx` exist
   - The index.tsx only exports `PriceRow`, creating confusion
   - **Recommendation**: Consolidate into `product-card/` directory properly

2. **Legacy naming** (convex/twelve.ts:1):
   - File named "twelve.ts" for Gold API (legacy from Twelve Data migration)
   - **Recommendation**: Rename to `gold-api.ts` or `market-prices.ts`

3. **Missing test organization**:
   - Only one test file exists: `vitest-example/HelloWorld.test.tsx`
   - No tests for critical business logic
   - **Recommendation**: Create `__tests__/` directories alongside source files

---

## 2. Component Organization & Architecture

### ✅ Strengths

**1. Smart separation of concerns** (app/components/dashboard/index.tsx:1-283):

- Main Dashboard component orchestrates state and layout
- Filters, Stats, ProductCard are properly extracted
- Mobile/desktop variations handled cleanly
- URL-based state management for filters (excellent for shareability)

**2. Composable UI structure**:

```
Dashboard
├── Header
├── Stats (market prices, dashboard metrics)
├── Filters
│   ├── FilterControls (metal, sort, stock)
│   └── CalculatorControls (cards, settings)
├── ProductCard[] (grid)
│   ├── Badge, CardHeader, CardContent
│   └── PriceRow (reusable pricing display)
└── Footer
```

**3. Good component sizing**:

- Most components 100-300 lines (readable)
- Single Responsibility Principle followed
- Props interfaces well-defined with TypeScript

### ⚠️ Issues & Recommendations

**1. State management complexity** (app/components/dashboard/index.tsx:44-97):

```typescript
// Multiple useState calls with interdependencies
const [availableCards, setAvailableCards] = useState(...)
const [cardManagerOpen, setCardManagerOpen] = useState(...)
const [calculatorSettings, setCalculatorSettings] = useState(...)
```

- **Issue**: 7 different state variables, complex initialization
- **Recommendation**: Consider `useReducer` or extract to custom hook
- **Suggested refactor**:
  ```typescript
  // app/hooks/useCalculatorSettings.ts
  export const useCalculatorSettings = () => {
    const [settings, dispatch] = useReducer(calculatorReducer, initialState)
    // Encapsulate localStorage logic, card management
    return { settings, actions: { updateCard, toggleMembership, ... } }
  }
  ```

**2. Prop drilling** (app/components/dashboard/filters.tsx:22-48):

- Filters component receives 10+ props
- CalculatorControls passes through many props
- **Recommendation**: Consider React Context or composition patterns

**3. Missing error boundaries**:

- No error boundaries around ProductCard grid
- Failed card renders could crash entire dashboard
- **Recommendation**: Wrap ProductCard map in ErrorBoundary

**4. Product card complexity** (app/components/product-card.tsx:32-219):

- 219-line component with complex pricing logic
- Mix of presentation and calculation concerns
- **Recommendation**: Already extracted calculations to utils (good!), but consider breaking card into smaller sub-components:
  ```
  ProductCard/
  ├── index.tsx (orchestration)
  ├── ProductHeader.tsx (thumbnail, badges, title)
  ├── PricingBreakdown.tsx (all pricing sections)
  └── ProductActions.tsx (buttons)
  ```

---

## 3. Function Organization & Separation of Concerns

### ✅ Strengths

**1. Excellent utility separation** (app/utils/product-calculations.ts:43-122):

```typescript
export const calculateProductMetrics = (
  product: ProductCardData,
  marketPrices: MarketPrices,
  calculatorSettings: CalculatorSettings,
): ProductCalculations => { ... }
```

- **Pure function**: No side effects, fully testable
- Clear input/output types
- Single responsibility (all product calculations in one place)

**2. Well-organized business logic** (app/lib/credit-cards.ts:1-233):

- Zod schemas for validation
- CRUD operations properly exported
- LocalStorage abstraction
- Pure functions (`calculateCashbackPercentage`, `sortCards`)

**3. Clean backend organization** (convex/dashboard.ts:3-162):

- Single query (`getStats`) for dashboard data
- Proper JOIN pattern with Pure products
- Helper functions for calculations
- No business logic leakage to frontend

**4. Type safety throughout**:

- Convex types properly generated and used
- `FunctionReturnType` for inferring query shapes
- Props interfaces for all components

### ⚠️ Issues & Recommendations

**1. Large Convex action files** (convex/costco.ts:1-1029):

- 1,029 lines in single file
- Multiple concerns: API fetching, parsing, matching, updating
- **Recommendation**: Split into modules:
  ```
  convex/costco/
  ├── api.ts          # Unwrangle API integration
  ├── parsers.ts      # Product parsing logic
  ├── matchers.ts     # Pure product matching
  ├── mutations.ts    # Database updates
  └── index.ts        # Main action
  ```

**2. Mixed concerns in components** (app/components/card-manager-drawer.tsx:74-100):

- Form logic mixed with UI
- LocalStorage operations in component
- **Recommendation**: Extract form logic to custom hook
  ```typescript
  // hooks/useCardForm.ts
  export const useCardForm = (card?: CreditCard) => {
    const form = useForm({ ... })
    const handleSubmit = (data) => { ... }
    return { form, handleSubmit }
  }
  ```

**3. Missing validation layers**:

- Convex actions trust API responses after minimal validation (convex/costco.ts:48-65)
- Could benefit from Zod schemas for external APIs
- **Recommendation**: Add comprehensive validation for third-party APIs

---

## 4. Testability Assessment

### 🚨 Critical Issues

**Current state:**

- ❌ No tests for business logic (utils, lib)
- ❌ No tests for React components
- ❌ No tests for Convex functions
- ❌ No tests for API integrations
- ✅ Vitest configured with browser mode
- ✅ One example test exists

### Test Coverage Gaps

**Priority 1 - Business Logic (HIGH):**

1. **`app/utils/product-calculations.ts`** (app/utils/product-calculations.ts:43-122)

   ```typescript
   // Missing tests for:
   - calculateProductMetrics()
   - Edge cases: null prices, zero values
   - Different calculator settings combinations
   - Above spot percentage calculations
   ```

2. **`app/lib/credit-cards.ts`** (app/lib/credit-cards.ts:1-233)

   ```typescript
   // Missing tests for:
   - Zod validation (invalid cards rejected)
   - CRUD operations (add, update, delete, reset)
   - LocalStorage persistence
   - calculateCashbackPercentage()
   - Preset merging logic
   ```

3. **`app/utils/format.ts`** (app/utils/format.ts:4-18)
   - Simple but untested formatters

**Priority 2 - Components (MEDIUM):**

1. **ProductCard** (app/components/product-card.tsx:32-219)
   - Renders correctly with various product states
   - Shows/hides sections based on data availability
   - Color coding for profit/loss

2. **Dashboard filters** (app/components/dashboard/filters.tsx:1-126)
   - URL params sync correctly
   - Filter combinations work

3. **Card manager** (app/components/card-manager-drawer.tsx:1-100)
   - Form validation
   - CRUD operations
   - Confirmation dialogs

**Priority 3 - Integration (MEDIUM):**

1. **Convex queries** (convex/dashboard.ts:3-162)
   - Mock Convex context for testing
   - JOIN logic works correctly
   - Spread calculations accurate

2. **API parsing** (convex/costco.ts:68-126)
   - extractMetalAttributes() handles edge cases
   - Weight parsing works for all formats
   - Price per oz calculations correct

### Testing Infrastructure Recommendations

**1. Create test structure:**

```
app/
├── __tests__/
│   ├── utils/
│   │   ├── product-calculations.test.ts
│   │   └── format.test.ts
│   ├── lib/
│   │   ├── credit-cards.test.ts
│   │   └── pure-fee-tiers.test.ts
│   └── components/
│       ├── ProductCard.test.tsx
│       └── Dashboard.test.tsx
convex/
├── __tests__/
│   ├── costco.test.ts
│   ├── dashboard.test.ts
│   └── pure.test.ts
```

**2. Update package.json:**

```json
{
  "scripts": {
    "test": "vitest",
    "test:coverage": "vitest --coverage",
    "test:ui": "vitest --ui",
    "test:watch": "vitest watch"
  }
}
```

**3. Configure Vitest for app tests:**

```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./app/__tests__/setup.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./app"),
    },
  },
});
```

**4. Example test for priority function:**

```typescript
// app/__tests__/utils/product-calculations.test.ts
import { describe, it, expect } from 'vitest'
import { calculateProductMetrics } from '@/utils/product-calculations'

describe('calculateProductMetrics', () => {
  it('calculates net profit correctly with all cashback', () => {
    const result = calculateProductMetrics(
      mockProduct,
      mockMarketPrices,
      { costcoMembershipEnabled: true, creditCard: mockCard }
    )
    expect(result.netProfit).toBe(50) // Expected value
  })

  it('handles missing Pure bid price', () => {
    const productNoBid = { ...mockProduct, pureBidPrice: null }
    const result = calculateProductMetrics(productNoBid, ...)
    expect(result.netProfit).toBeNull()
  })
})
```

---

## 5. Additional Recommendations

### Code Quality Improvements

**1. Add JSDoc comments for complex functions:**

```typescript
/**
 * Calculates all product metrics including profit, cashback, and spread.
 *
 * @param product - Product data from Costco with current pricing
 * @param marketPrices - Current spot prices for gold/silver
 * @param calculatorSettings - User's calculator configuration
 * @returns Complete calculation breakdown including profit and percentages
 */
export const calculateProductMetrics = (...)
```

**2. Extract magic numbers to constants:**

```typescript
// app/utils/product-calculations.ts:41
const COSTCO_EXECUTIVE_PERCENTAGE = 0.02; // ✅ Good

// convex/costco.ts:113 - Should extract
const GRAMS_PER_TROY_OUNCE = 31.1035;
```

**3. Add runtime validation for critical paths:**

```typescript
// convex/dashboard.ts - Add Zod schema validation
import { z } from "zod";

const MarketPriceSchema = z.object({
  assetType: z.enum(["gold", "silver", "bitcoin"]),
  currentPrice: z.number().positive(),
  changePercentage24h: z.number().nullable(),
});
```

### Performance Considerations

**1. Memoize expensive calculations:**

```typescript
// app/components/dashboard/index.tsx
const sortedProducts = useMemo(() => {
  return [...filteredProducts].sort(...)
}, [filteredProducts, sortOption])
```

**2. Consider virtualization for product grid:**

- If product count grows beyond 50-100 items
- Use `react-window` or `@tanstack/react-virtual`

### Security

**1. Input sanitization:**

- Product names rendered from external API (Costco/Pure)
- Consider DOMPurify if HTML content ever added

**2. API key exposure:**

- ✅ Good: All API keys in server-side env vars
- ✅ Good: Convex actions handle external APIs

---

## Summary of Action Items

### Immediate (Week 1-2)

1. **Add tests for critical business logic:**
   - `product-calculations.ts`
   - `credit-cards.ts` CRUD and validation
   - `format.ts` utilities

2. **Fix file organization issues:**
   - Consolidate `product-card` component structure
   - Rename `twelve.ts` to `gold-api.ts` or `market-prices.ts`

3. **Extract complex state to custom hooks:**
   - Create `useCalculatorSettings` hook
   - Simplify Dashboard component

### Short-term (Month 1)

4. **Add component tests:**
   - ProductCard rendering
   - Filter state management
   - Card manager CRUD operations

5. **Split large Convex files:**
   - Break `costco.ts` (1029 lines) into modules
   - Separate concerns: API, parsing, matching, mutations

6. **Add error boundaries:**
   - Wrap ProductCard grid
   - Add fallback UI for fetch failures

### Long-term (Quarter 1)

7. **Add integration tests:**
   - Test Convex queries with mock context
   - API parsing edge cases
   - End-to-end user flows

8. **Consider state management improvements:**
   - Evaluate if Context API or Zustand needed as app grows
   - Reduce prop drilling

9. **Performance optimizations:**
   - Add memoization to expensive calculations
   - Consider virtualization if product count grows

---

## Conclusion

The Dashboard.Gold project demonstrates **strong architectural patterns** with clean separation between frontend, backend, and business logic. The code is readable, well-typed, and follows React best practices.

However, the **lack of tests** is a critical gap that impacts maintainability and confidence for future changes. The calculation logic in particular (`product-calculations.ts`, `credit-cards.ts`) involves complex math with many edge cases that should be covered by comprehensive tests.

**Priority recommendation:** Invest 1-2 weeks in building test coverage for business logic before adding new features. This will pay dividends in reduced bugs and faster development velocity.

---

## Appendix: File Statistics

### Key File Sizes

- `convex/costco.ts`: 1,029 lines (needs refactoring)
- `app/components/dashboard/index.tsx`: 283 lines
- `app/lib/credit-cards.ts`: 232 lines
- `app/components/product-card.tsx`: 219 lines
- `convex/dashboard.ts`: 162 lines
- `app/utils/product-calculations.ts`: 122 lines

### Test Coverage

- **Current tests**: 1 example test file
- **Needed tests**: ~15-20 test files covering utils, lib, components, Convex

### TypeScript Configuration

- Strict mode: ✅ Enabled
- Path aliases: ✅ Configured (`@/*`)
- React JSX: ✅ Modern transform
- Module resolution: Bundler (appropriate for Vite)
