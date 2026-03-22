---
alwaysApply: true
---

## useEffect Policy

Only use useEffect for synchronizing with external systems:

- Browser APIs (DOM, localStorage, matchMedia, history)
- Third-party integrations (Convex subscriptions, PostHog analytics)
- Non-React widgets or libraries

NEVER useEffect for: data transforms (calculate during render), user events (handlers),
expensive calculations (useMemo), state resets on prop changes (key prop),
adjusting state when props change (derive during render), chaining Effects.

## Patterns

- **Derived state**: Store minimal IDs, derive full objects with `useMemo`
- **localStorage writes**: Always in event handlers, never in Effects
- **SSR data loading**: Routes use `preloadQuery` (server) + `usePreloadedQuery` (client) from Convex for instant page loads with real-time WebSocket subscriptions
