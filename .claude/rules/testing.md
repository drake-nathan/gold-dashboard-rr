---
alwaysApply: true
---

## Testing Conventions

- Framework: Vitest (configured via Vite)
- Use simple `test()` calls, NOT `describe/it` blocks
- Co-locate tests: `foo.test.ts` (unit), `foo.browser.test.tsx` (browser)
- Focus on critical paths and edge cases, not coverage metrics
- See `docs/browser-testing.md` for browser test API details
- Unit config: `vitest.config.ts` — Browser config: `vitest.browser.config.ts`
