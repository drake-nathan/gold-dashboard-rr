# Known Issues & Gotchas

## Babel Preset

The vite config references `@babel/preset-typescript` but it's not in package.json. Monitor during development — may need to add if babel complains.

## Environment Variable Flow (SSR)

In React Router 7 with SSR:

1. **Server-side** (loader in `app/root.tsx`): Reads from `process.env.VITE_CONVEX_URL`
2. **Client-side** (Layout component): Receives env var from loader via `useRouteLoaderData("root")`

This pattern exists because:

- Layout runs during SSR (where `import.meta.env` isn't available)
- Layout is also used in error boundaries (where loader data may be undefined)
- Safe fallback used for error scenarios

## Vite Config

- Server-side env import is commented out in `vite.config.ts:8`:
  ```ts
  // import "./app/env.server";
  ```
  This would validate server env vars at build time but is currently disabled.
- RSC plugins were removed (`unstable_reactRouterRSC`, `@vitejs/plugin-rsc`) — too experimental
