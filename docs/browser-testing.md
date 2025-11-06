# Browser Testing with Vitest

This project uses Vitest Browser Mode with Playwright for testing React components in a real browser environment.

## Overview

- **Framework**: Vitest 4.0.7
- **Browser Provider**: Playwright (Chromium)
- **React Integration**: vitest-browser-react
- **Mode**: Headless (for CI/CD compatibility)

## Test File Naming Convention

Browser tests use the `.browser.test.tsx` or `.browser.test.ts` extension:

```
app/
├── components/
│   ├── ui/
│   │   ├── button.tsx
│   │   └── button.browser.test.tsx  ✅ Browser test
│   └── header/
│       ├── theme-toggle.tsx
│       └── theme-toggle.browser.test.tsx  ✅ Browser test
├── utils/
│   ├── product-calculations.ts
│   └── product-calculations.test.ts  ✅ Unit test
```

## Running Tests

```bash
# Run unit tests only (excludes browser tests)
bun run test

# Run browser tests only (headless Chromium)
bun run test:browser

# Run browser tests in watch mode
bun run test:browser:watch

# Run all tests
bun run test && bun run test:browser
```

## Writing Browser Tests

### Basic Example

```tsx
import { expect, test } from "vitest";
import { render } from "vitest-browser-react";

import { Button } from "./button";

test("button click interaction", async () => {
  let clicked = false;
  const handleClick = () => {
    clicked = true;
  };

  // render() returns a Promise, so await it
  const screen = await render(<Button onClick={handleClick}>Click me</Button>);

  // Use screen to query elements
  const button = screen.getByRole("button", { name: "Click me" });

  // Await interactions
  await button.click();

  expect(clicked).toBe(true);
});
```

### Key Differences from Unit Tests

1. **Async render**: `render()` returns a Promise

   ```tsx
   const screen = await render(<Component />);
   ```

2. **Query methods on screen**: Testing Library-style queries

   ```tsx
   screen.getByRole("button", { name: "Click me" });
   screen.getByText("Hello");
   screen.getByLabelText("Email");
   ```

3. **Await interactions**: All interactions return Promises

   ```tsx
   await button.click();
   await input.fill("text");
   ```

4. **Async assertions for elements**:

   ```tsx
   await expect.element(button).toBeInTheDocument();
   await expect.element(button).toBeDisabled();
   await expect.element(heading).toHaveTextContent("Hello");
   ```

5. **Polling for async state changes**:
   ```tsx
   await expect
     .poll(() => document.documentElement.classList.contains("dark"))
     .toBe(true);
   ```

### Testing with Providers

Wrap your component with necessary providers:

```tsx
test("theme toggle works", async () => {
  const screen = await render(
    <ThemeProvider>
      <ThemeToggle />
    </ThemeProvider>,
  );

  const button = screen.getByRole("button", { name: "Toggle theme" });
  await button.click();

  const darkOption = screen.getByText("Dark");
  await darkOption.click();

  await expect
    .poll(() => document.documentElement.classList.contains("dark"))
    .toBe(true);
});
```

## Configuration

### Browser Test Config (`vitest.browser.config.ts`)

```ts
import react from "@vitejs/plugin-react";
import { playwright } from "@vitest/browser-playwright";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // @ts-expect-error - Vite plugin types conflict between vitest's bundled Vite and project Vite version
  plugins: [react(), tsconfigPaths()],
  test: {
    browser: {
      enabled: true,
      headless: true, // Run in headless mode for CI/CD
      instances: [{ browser: "chromium" }],
      provider: playwright(),
    },
    include: ["app/**/*.browser.test.{ts,tsx}"],
  },
});
```

**Note**: The `headless` option is set at the `browser` level, not inside `instances.launch`. Vitest ignores `launch.headless` per the official documentation.

### Unit Test Config (`vitest.config.ts`)

```ts
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      exclude: [
        // ... standard exclusions
        "**/*.browser.test.{ts,tsx}", // Exclude browser tests
      ],
    },
  }),
);
```

## Current Test Coverage

### Browser Tests (9 tests)

- **Button Component** (`app/components/ui/button.browser.test.tsx`) - 5 tests
  - Default variant rendering
  - Click interactions
  - Disabled state
  - Different variants (default, destructive, outline)
  - Different sizes (default, sm, lg, icon)

- **Theme Toggle** (`app/components/header/theme-toggle.browser.test.tsx`) - 4 tests
  - Button visibility
  - Dropdown menu interactions
  - Light theme selection with DOM verification
  - Dark theme selection with DOM verification

### Unit Tests (60 tests)

- `app/utils/product-calculations.test.ts` - 14 tests
- `app/lib/credit-cards.test.ts` - 30 tests
- `app/utils/format.test.ts` - 16 tests

## When to Use Browser Tests vs Unit Tests

### Use Browser Tests For:

- ✅ User interactions (clicks, typing, form submissions)
- ✅ DOM manipulations and visual changes
- ✅ Components that depend on browser APIs (localStorage, matchMedia)
- ✅ Dropdown menus, modals, tooltips
- ✅ Theme switching and CSS class changes
- ✅ Integration of multiple components

### Use Unit Tests For:

- ✅ Pure functions and utilities
- ✅ Data transformations
- ✅ Business logic calculations
- ✅ Validation schemas (Zod)
- ✅ Fast, focused tests on isolated logic

## Troubleshooting

### Error: "vitest/browser can be imported only inside the Browser Mode"

This means a browser test file is being picked up by the unit test runner. Ensure:

1. Browser test files use `.browser.test.{ts,tsx}` extension
2. `vitest.config.ts` excludes browser test files
3. `vitest.browser.config.ts` includes only browser test files

### Tests Hanging or Not Finding Elements

Make sure you:

1. `await` the `render()` call: `const screen = await render(<Component />)`
2. `await` all interactions: `await button.click()`
3. Use `await expect.element()` for element assertions

### TypeScript Errors with `screen` Methods

The `screen` object returned by `render()` has Testing Library-style query methods. Make sure you're using:

- `screen.getByRole()`
- `screen.getByText()`
- `screen.getByLabelText()`
- etc.

## Resources

- [Vitest Browser Mode Docs](https://vitest.dev/guide/browser/)
- [Playwright Provider](https://vitest.dev/guide/browser/playwright)
- [vitest-browser-react](https://www.npmjs.com/package/vitest-browser-react)
