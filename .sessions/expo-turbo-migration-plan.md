# Expo + Turbo Monorepo Migration Plan

**Project**: Gold Dashboard - Add React Native mobile app with Turbo monorepo

**Date**: 2025-11-22

**Goal**: Convert existing React Router 7 web app to Turbo monorepo and add Expo mobile app with MVP feature set

**Last Updated**: 2025-11-22 (added Phase 7: Push Notifications + PostHog analytics)

---

## What's New (Update #2)

Based on user requirements, the following features have been added to the plan:

✅ **Push Notifications (New Phase 7)** - 12-16 hours estimated

- Price drop alerts with configurable thresholds
- Profit/spread alerts when minimum profit is reached
- Stock alerts for favorited products (back in stock notifications)
- Full backend integration with Convex (schema, cron jobs, notification queue)
- Native notification handling on iOS and Android
- User preference management UI

✅ **PostHog Analytics** - Added to Phase 3.6

- Integrated into mobile app for user behavior tracking
- Graceful degradation when not configured
- Matches web app analytics setup

📝 **Scope Decisions**:

- NO offline mode (not needed for MVP)
- NO tablet-specific layouts (mobile-only for now)
- Keep RR7 web version separate (no reverse code sharing)
- Timeline extended by ~1 week to account for notifications

⚙️ **Turbo Setup**:

- Matches structure from [js-style-kit](https://github.com/drake-nathan/js-style-kit)
- Bun workspaces (no pnpm-workspace.yaml needed)
- Root-level tasks using `//#` prefix (e.g., `//#lint`, `//#format`)
- ES modules (`"type": "module"`)
- Engine enforcement for Bun and Node versions

---

## Project Decisions

Based on requirements gathering:

- **Mobile Scope**: MVP - Product list & basic filtering only
- **Styling**: NativeWind (Tailwind for React Native)
- **Shared Code**: Product calculations, credit card management, Convex queries/mutations
- **Auth**: Phase 2 (after MVP works)
- **Current Stack**: React Router 7, Convex, Tailwind v4, Bun

---

## Phase 0: Planning & Repository Preparation

**Objective**: Understand current structure and plan migration without breaking changes

### Tasks

- [x] Review Turborepo migration docs
- [x] Review example Convex + Turbo + Expo repo
- [x] Review Expo monorepo best practices
- [x] Identify shareable code in current codebase
- [ ] Create feature branch: `turbo-migration`
- [ ] Backup current working state: `git tag pre-turbo-migration`

### Verification

- [ ] Can still run `bun run dev` successfully
- [ ] All tests pass (`bun run ci`)
- [ ] Git working tree is clean

### Notes

Current shareable code identified:

- `app/utils/product-calculations.ts` (14 tests)
- `app/utils/format.ts` (16 tests)
- `app/lib/credit-cards.ts` (30 tests)
- `app/env.client.ts` + `app/env.server.ts`
- `convex/` directory (entire backend)

---

## Phase 1: Turborepo Conversion

**Objective**: Convert to monorepo structure without changing functionality

**Estimated Time**: 4-6 hours

### 1.1 Install Turborepo

```bash
bun add -D turbo
```

**Verification**: `bunx turbo --version` shows version

### 1.2 Create Workspace Configuration

Update root `package.json`:

```json
{
  "devDependencies": {
    "turbo": "^2.6.1",
    "typescript": "^5.9.3"
  },
  "engines": {
    "bun": ">=1.1.44",
    "node": ">=22"
  },
  "name": "gold-dashboard-monorepo",
  "packageManager": "bun@1.1.44",
  "private": true,
  "scripts": {
    "build": "turbo build",
    "build:native": "turbo build --filter=@gold-dashboard/native",
    "build:web": "turbo build --filter=@gold-dashboard/web",
    "ci": "turbo ci",
    "dev": "turbo dev",
    "format": "turbo format",
    "format:check": "turbo format:check",
    "lint": "turbo lint",
    "lint:fix": "turbo lint:fix",
    "test": "turbo test",
    "test:coverage": "turbo test:coverage",
    "typecheck": "turbo typecheck"
  },
  "type": "module",
  "version": "0.1.0",
  "workspaces": ["apps/*", "packages/*"]
}
```

**Notes**:

- No `pnpm-workspace.yaml` needed - Bun uses package.json workspaces
- `type: "module"` for ES modules support
- Enforces Bun and Node versions via `engines`
- Filtered build scripts for individual apps

**Verification**: Workspace structure recognized

### 1.3 Create Turbo Configuration

Create `turbo.json`:

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "//#format": {
      "cache": false,
      "inputs": ["*.js", "*.ts", "*.json", "*.md", "prettier.config.js"],
      "outputs": []
    },
    "//#format:check": {
      "inputs": ["*.js", "*.ts", "*.json", "*.md", "prettier.config.js"],
      "outputs": []
    },
    "//#lint": {
      "inputs": ["*.js", "*.ts", "*.json", "eslint.config.js"],
      "outputs": []
    },
    "//#lint:fix": {
      "cache": false,
      "inputs": ["*.js", "*.ts", "*.json", "eslint.config.js"],
      "outputs": []
    },
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["build/**", "dist/**", ".next/**", "convex/_generated/**"]
    },
    "ci": {
      "dependsOn": ["format:check", "lint", "typecheck", "test", "test:browser"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "format": {
      "cache": false,
      "inputs": [
        "src/**",
        "app/**",
        "convex/**",
        "prettier.config.js",
        "package.json"
      ],
      "outputs": []
    },
    "format:check": {
      "inputs": [
        "src/**",
        "app/**",
        "convex/**",
        "prettier.config.js",
        "package.json"
      ],
      "outputs": []
    },
    "lint": {
      "inputs": [
        "src/**",
        "app/**",
        "convex/**",
        "eslint.config.js",
        "package.json"
      ],
      "outputs": []
    },
    "lint:fix": {
      "cache": false,
      "inputs": [
        "src/**",
        "app/**",
        "convex/**",
        "eslint.config.js",
        "package.json"
      ],
      "outputs": []
    },
    "start": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "dependsOn": ["^build"],
      "inputs": [
        "src/**",
        "app/**",
        "convex/**",
        "vitest.config.ts",
        "package.json"
      ],
      "outputs": ["coverage/**"]
    },
    "test:browser": {
      "dependsOn": ["^build"],
      "inputs": [
        "src/**",
        "app/**",
        "vitest.browser.config.ts",
        "package.json"
      ],
      "outputs": ["coverage/**"]
    },
    "test:coverage": {
      "dependsOn": ["^build"],
      "inputs": [
        "src/**",
        "app/**",
        "convex/**",
        "vitest.config.ts",
        "package.json"
      ],
      "outputs": ["coverage/**"]
    },
    "typecheck": {
      "dependsOn": ["^build"],
      "inputs": [
        "src/**",
        "app/**",
        "convex/**",
        "tsconfig.json",
        "package.json"
      ],
      "outputs": []
    }
  },
  "ui": "tui"
}
```

**Notes**:

- Root-level tasks use `//#` prefix (e.g., `//#lint`, `//#format`)
- Root tasks target root-level files only (not workspace packages)
- Workspace tasks (without `//#`) run in all packages
- `ci` task orchestrates all quality checks
- Inputs specified to optimize caching
- `convex/_generated/**` included in build outputs

**Verification**: `bunx turbo build --dry-run` shows task graph

### 1.4 Move Web App to `apps/web`

```bash
mkdir -p apps/web
# Move everything except:
# - node_modules
# - .git
# - .sessions
# - README.md (keep at root)
# - CLAUDE.md (keep at root)
# - TODO.md (keep at root)
# - .env files (duplicate to apps/web)
```

Update `apps/web/package.json`:

```json
{
  "name": "@gold-dashboard/web",
  "private": true,
  "scripts": {
    "build": "react-router build",
    "dev": "react-router dev",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "test": "vitest run",
    "test:browser": "vitest --config vitest.browser.config.ts",
    "test:coverage": "vitest run --coverage",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  },
  "version": "0.1.0"
}
```

**Verification**:

- [ ] `cd apps/web && bun run dev` works
- [ ] `cd apps/web && bun run build` works
- [ ] All tests pass from `apps/web`

### 1.5 Update .gitignore

Add to root `.gitignore`:

```
.turbo
apps/*/node_modules
packages/*/node_modules
apps/*/.env.local
apps/*/build
apps/*/dist
```

**Verification**: Git status looks clean

### 1.6 Test Turbo Commands

From root:

```bash
bunx turbo dev --filter=@gold-dashboard/web
bunx turbo build --filter=@gold-dashboard/web
bunx turbo test --filter=@gold-dashboard/web
```

**Verification**: All commands work from root

---

## Phase 2: Extract Shared Packages

**Objective**: Create reusable packages for shared code

**Estimated Time**: 6-8 hours

### 2.1 Create `packages/convex-backend`

**Purpose**: Share Convex schema, queries, mutations, and actions across web and mobile

```bash
mkdir -p packages/convex-backend
cd packages/convex-backend
```

Create `packages/convex-backend/package.json`:

```json
{
  "dependencies": {
    "convex": "^1.x"
  },
  "devDependencies": {
    "@clerk/backend": "^1.x"
  },
  "exports": {
    ".": "./convex/_generated/api.js",
    "./api": "./convex/_generated/api.js",
    "./types": "./convex/_generated/dataModel.d.ts"
  },
  "main": "./convex/_generated/api.js",
  "name": "@gold-dashboard/convex-backend",
  "private": true,
  "scripts": {
    "build": "convex deploy --cmd-url-env-var-name VITE_CONVEX_URL",
    "dev": "convex dev",
    "dev:once": "convex dev --once"
  },
  "types": "./convex/_generated/api.d.ts",
  "version": "0.1.0"
}
```

**Move files**:

- Copy `apps/web/convex/` → `packages/convex-backend/convex/`
- Copy `apps/web/.env.local` → `packages/convex-backend/.env.local` (Convex vars only)

**Update apps/web**:

- Update imports: `import { api } from "convex/_generated/api"` → `import { api } from "@gold-dashboard/convex-backend/api"`
- Add dependency: `"@gold-dashboard/convex-backend": "workspace:*"`
- Remove `convex/` directory from `apps/web`

**Verification**:

- [ ] `cd packages/convex-backend && bun run dev:once` works
- [ ] Web app still compiles with new imports
- [ ] Convex functions callable from web app
- [ ] Type generation works (`convex/_generated/api.d.ts` exists)

### 2.2 Create `packages/shared`

**Purpose**: Share business logic, utilities, and types

```bash
mkdir -p packages/shared/src
```

Create `packages/shared/package.json`:

```json
{
  "dependencies": {
    "zod": "^3.x"
  },
  "devDependencies": {
    "@types/node": "^22.x",
    "typescript": "^5.x",
    "vitest": "^2.x"
  },
  "exports": {
    ".": "./src/index.ts",
    "./lib": "./src/lib/index.ts",
    "./types": "./src/types/index.ts",
    "./utils": "./src/utils/index.ts"
  },
  "main": "./src/index.ts",
  "name": "@gold-dashboard/shared",
  "private": true,
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  },
  "types": "./src/index.ts",
  "version": "0.1.0"
}
```

Create `packages/shared/tsconfig.json`:

```json
{
  "compilerOptions": {
    "declaration": true,
    "declarationMap": true,
    "esModuleInterop": true,
    "isolatedModules": true,
    "lib": ["ES2022"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "noEmit": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "strict": true,
    "target": "ES2022"
  },
  "exclude": ["node_modules", "**/*.test.ts"],
  "include": ["src/**/*"]
}
```

**Move shareable code**:

```
apps/web/app/utils/product-calculations.ts → packages/shared/src/utils/product-calculations.ts
apps/web/app/utils/format.ts → packages/shared/src/utils/format.ts
apps/web/app/lib/credit-cards.ts → packages/shared/src/lib/credit-cards.ts
```

**Copy test files**:

```
apps/web/app/utils/product-calculations.test.ts → packages/shared/src/utils/product-calculations.test.ts
apps/web/app/utils/format.test.ts → packages/shared/src/utils/format.test.ts
apps/web/app/lib/credit-cards.test.ts → packages/shared/src/lib/credit-cards.test.ts
```

Create `packages/shared/src/index.ts`:

```typescript
// Utils
export * from "./utils/product-calculations";
export * from "./utils/format";

// Lib
export * from "./lib/credit-cards";

// Types (if any shared types)
export type * from "./types";
```

Create `packages/shared/src/utils/index.ts`:

```typescript
export * from "./product-calculations";
export * from "./format";
```

Create `packages/shared/src/lib/index.ts`:

```typescript
export * from "./credit-cards";
```

**Update apps/web imports**:

Replace:

```typescript
import { calculateProfit } from "~/utils/product-calculations";
import { formatCurrency } from "~/utils/format";
import { loadCreditCards } from "~/lib/credit-cards";
```

With:

```typescript
import { calculateProfit } from "@gold-dashboard/shared/utils";
import { formatCurrency } from "@gold-dashboard/shared/utils";
import { loadCreditCards } from "@gold-dashboard/shared/lib";
```

Add to `apps/web/package.json`:

```json
{
  "dependencies": {
    "@gold-dashboard/shared": "workspace:*"
  }
}
```

**Setup vitest config** in `packages/shared/vitest.config.ts`:

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
  },
});
```

**Verification**:

- [ ] `cd packages/shared && bun run test` - All 60 tests pass
- [ ] `cd packages/shared && bun run typecheck` - No errors
- [ ] `cd apps/web && bun run dev` - Web app still works
- [ ] `cd apps/web && bun run test` - Web-specific tests still pass
- [ ] No circular dependencies

### 2.3 Create `packages/env`

**Purpose**: Share environment variable validation

```bash
mkdir -p packages/env/src
```

Create `packages/env/package.json`:

```json
{
  "dependencies": {
    "@t3-oss/env-core": "^0.x",
    "zod": "^3.x"
  },
  "devDependencies": {
    "typescript": "^5.x"
  },
  "exports": {
    "./client": "./src/client.ts",
    "./server": "./src/server.ts"
  },
  "main": "./src/index.ts",
  "name": "@gold-dashboard/env",
  "private": true,
  "types": "./src/index.ts",
  "version": "0.1.0"
}
```

**Move files**:

```
apps/web/app/env.client.ts → packages/env/src/client.ts
apps/web/app/env.server.ts → packages/env/src/server.ts
```

**Update for cross-platform**:

`packages/env/src/client.ts`:

```typescript
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  clientPrefix: "VITE_PUBLIC_", // Changed from VITE_
  client: {
    VITE_PUBLIC_CONVEX_URL: z.string().url(),
    VITE_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().optional(),
    VITE_PUBLIC_POSTHOG_KEY: z.string().optional(),
    VITE_PUBLIC_POSTHOG_HOST: z.string().url().optional(),
  },
  runtimeEnv: typeof window === "undefined" ? process.env : import.meta.env,
});
```

`packages/env/src/server.ts` - Keep as-is, ensure it works server-side only.

**Verification**:

- [ ] `cd packages/env && bun run typecheck` - No errors
- [ ] Web app imports work: `import { env } from "@gold-dashboard/env/client"`

### 2.4 Verify Turbo Works with New Packages

**Verification**:

- [ ] `bunx turbo build` - Builds packages in correct order (convex-backend → shared → web)
- [ ] `bunx turbo test` - Runs all tests (web app tests + shared package tests)
- [ ] `bunx turbo typecheck` - Type checks all packages
- [ ] `bunx turbo lint` - Lints all packages
- [ ] `bunx turbo ci` - Runs full CI pipeline (format:check, lint, typecheck, test, test:browser)

**Note**: The turbo.json from Phase 1.3 already includes all necessary task configurations for the shared packages.

---

## Phase 3: Expo App Scaffolding

**Objective**: Create basic Expo app with NativeWind and Convex integration

**Estimated Time**: 6-8 hours

### 3.1 Create Expo App

```bash
cd apps
bunx create-expo-app native --template blank-typescript
cd native
```

**Update `apps/native/package.json`**:

```json
{
  "main": "expo-router/entry",
  "name": "@gold-dashboard/native",
  "private": true,
  "scripts": {
    "android": "expo start --android",
    "ios": "expo start --ios",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "start": "expo start",
    "test": "jest",
    "typecheck": "tsc --noEmit",
    "web": "expo start --web"
  },
  "version": "0.1.0"
}
```

**Install dependencies**:

```bash
cd apps/native
bunx expo install expo-router react-native-safe-area-context react-native-screens
bunx expo install nativewind tailwindcss
bunx expo install convex convex-expo
```

**Verification**:

- [ ] `cd apps/native && bun run start` - Expo dev server starts
- [ ] Scan QR code - App loads on physical device or simulator

### 3.2 Setup NativeWind

Create `apps/native/tailwind.config.js`:

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Import from Tailwind v4 web config if possible
        // Or define mobile-specific colors
      },
    },
  },
  plugins: [],
};
```

Create `apps/native/global.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

Update `apps/native/babel.config.js`:

```javascript
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [["babel-preset-expo", { jsxImportSource: "nativewind" }]],
    plugins: ["nativewind/babel"],
  };
};
```

Create `apps/native/metro.config.js`:

```javascript
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, { input: "./global.css" });
```

**Verification**:

- [ ] Restart dev server
- [ ] Basic Tailwind classes work: `<Text className="text-red-500">Test</Text>`

### 3.3 Setup Expo Router

Create `apps/native/app/_layout.tsx`:

```tsx
import "../global.css";
import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "Gold Dashboard" }} />
    </Stack>
  );
}
```

Create `apps/native/app/index.tsx`:

```tsx
import { Text, View } from "react-native";

export default function HomeScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-white">
      <Text className="text-2xl font-bold">Gold Dashboard Mobile</Text>
      <Text className="text-gray-600">Coming soon...</Text>
    </View>
  );
}
```

**Verification**:

- [ ] App shows "Gold Dashboard Mobile" with Tailwind styling
- [ ] Navigation works (if multiple screens)

### 3.4 Setup Convex

Create `apps/native/ConvexProvider.tsx`:

```tsx
import { ConvexProvider as BaseConvexProvider } from "convex/react";
import { ConvexReactClient } from "convex/react";
import { ReactNode } from "react";

const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!, {
  unsavedChangesWarning: false, // Mobile doesn't need this
});

export function ConvexProvider({ children }: { children: ReactNode }) {
  return <BaseConvexProvider client={convex}>{children}</BaseConvexProvider>;
}
```

Update `apps/native/app/_layout.tsx`:

```tsx
import "../global.css";
import { Stack } from "expo-router";
import { ConvexProvider } from "../ConvexProvider";

export default function RootLayout() {
  return (
    <ConvexProvider>
      <Stack>
        <Stack.Screen name="index" options={{ title: "Gold Dashboard" }} />
      </Stack>
    </ConvexProvider>
  );
}
```

Create `apps/native/.env.local`:

```bash
EXPO_PUBLIC_CONVEX_URL=https://effervescent-dog-80.convex.cloud
```

Add to `apps/native/package.json`:

```json
{
  "dependencies": {
    "@gold-dashboard/convex-backend": "workspace:*",
    "@gold-dashboard/shared": "workspace:*"
  }
}
```

**Verification**:

- [ ] `bun install` from root
- [ ] No errors about missing Convex URL
- [ ] App still loads

### 3.5 Test Convex Query

Update `apps/native/app/index.tsx`:

```tsx
import { useQuery } from "convex/react";
import { api } from "@gold-dashboard/convex-backend/api";
import { Text, View, ActivityIndicator } from "react-native";

export default function HomeScreen() {
  const stats = useQuery(api.dashboard.getStats);

  if (!stats) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View className="flex-1 items-center justify-center bg-white p-4">
      <Text className="mb-4 text-2xl font-bold">Gold Dashboard Mobile</Text>
      <Text className="mb-2 text-gray-600">
        Products: {stats.products.length}
      </Text>
      <Text className="text-gray-600">
        Last Update: {new Date(stats.lastUpdate).toLocaleTimeString()}
      </Text>
    </View>
  );
}
```

**Verification**:

- [ ] App shows loading spinner initially
- [ ] App fetches and displays product count
- [ ] No console errors
- [ ] Real-time updates work (modify product in Convex dashboard)

### 3.6 Setup PostHog Analytics

**Install dependencies**:

```bash
cd apps/native
bunx expo install posthog-react-native expo-file-system expo-application expo-device expo-localization
```

Create `apps/native/PostHogProvider.tsx`:

```tsx
import { PostHogProvider as BasePostHogProvider } from "posthog-react-native";
import { ReactNode } from "react";

export function PostHogProvider({ children }: { children: ReactNode }) {
  const apiKey = process.env.EXPO_PUBLIC_POSTHOG_KEY;
  const host = process.env.EXPO_PUBLIC_POSTHOG_HOST;

  if (!apiKey || !host) {
    console.warn("PostHog not configured - analytics disabled");
    return <>{children}</>;
  }

  return (
    <BasePostHogProvider
      apiKey={apiKey}
      options={{
        host,
        // Enable debug in development
        debug: __DEV__,
      }}
    >
      {children}
    </BasePostHogProvider>
  );
}
```

Update `apps/native/app/_layout.tsx`:

```tsx
import { PostHogProvider } from "../PostHogProvider";
import { ConvexProvider } from "../ConvexProvider";

export default function RootLayout() {
  return (
    <PostHogProvider>
      <ConvexProvider>
        <Stack>
          <Stack.Screen name="index" options={{ title: "Gold Dashboard" }} />
        </Stack>
      </ConvexProvider>
    </PostHogProvider>
  );
}
```

Update `apps/native/.env.local`:

```bash
EXPO_PUBLIC_CONVEX_URL=https://effervescent-dog-80.convex.cloud
EXPO_PUBLIC_POSTHOG_KEY=phc_xxxxx
EXPO_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

**Verification**:

- [ ] PostHog initializes without errors
- [ ] Events are visible in PostHog dashboard (if configured)
- [ ] App works without PostHog env vars (graceful degradation)

### 3.7 Verify Turbo Integration

**Verification**:

- [ ] `bunx turbo start --filter=@gold-dashboard/native` - Starts Expo dev server
- [ ] `bunx turbo dev` - Runs both web and native dev servers concurrently
- [ ] `bunx turbo build --filter=@gold-dashboard/native` - Builds native app (if applicable)
- [ ] `bunx turbo typecheck` - Type checks native app along with web and packages

**Note**: The `start` task is already configured in turbo.json from Phase 1.3 with `cache: false` and `persistent: true` for Expo dev server.

---

## Phase 4: Mobile MVP - Product List

**Objective**: Display product list with basic filtering

**Estimated Time**: 8-10 hours

### 4.1 Create Product List Component

Create `apps/native/components/ProductList.tsx`:

```tsx
import { FlatList, View, Text, Image } from "react-native";
import { calculateProfit } from "@gold-dashboard/shared/utils";
import { formatCurrency } from "@gold-dashboard/shared/utils";

interface Product {
  // Type from Convex
}

interface ProductListProps {
  products: Product[];
  cashbackPercentage: number;
}

export function ProductList({
  products,
  cashbackPercentage,
}: ProductListProps) {
  return (
    <FlatList
      data={products}
      keyExtractor={(item) => item._id}
      renderItem={({ item }) => (
        <ProductCard product={item} cashback={cashbackPercentage} />
      )}
      className="flex-1"
      contentContainerClassName="p-4"
    />
  );
}

function ProductCard({
  product,
  cashback,
}: {
  product: Product;
  cashback: number;
}) {
  const profit = calculateProfit({
    costcoPrice: product.price,
    pureBid: product.pureBid,
    cashbackPercentage: cashback,
  });

  return (
    <View className="mb-4 rounded-lg border border-gray-200 bg-white p-4">
      <View className="mb-2 flex-row items-start">
        {product.imageUrl && (
          <Image
            source={{ uri: product.imageUrl }}
            className="mr-3 h-16 w-16 rounded"
          />
        )}
        <View className="flex-1">
          <Text className="mb-1 text-base font-semibold" numberOfLines={2}>
            {product.name}
          </Text>
          <View className="flex-row gap-2">
            <Text
              className={`rounded px-2 py-1 text-xs ${product.inStock ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}
            >
              {product.inStock ? "In Stock" : "Out of Stock"}
            </Text>
            <Text className="rounded bg-blue-100 px-2 py-1 text-xs text-blue-800">
              {product.metalType}
            </Text>
          </View>
        </View>
      </View>

      <View className="border-t border-gray-100 pt-3">
        <View className="mb-1 flex-row justify-between">
          <Text className="text-sm text-gray-600">Costco Price:</Text>
          <Text className="text-sm font-medium">
            {formatCurrency(product.price)}
          </Text>
        </View>
        <View className="mb-1 flex-row justify-between">
          <Text className="text-sm text-gray-600">After Cashback:</Text>
          <Text className="text-sm font-medium">
            {formatCurrency(product.price * (1 - cashback / 100))}
          </Text>
        </View>
        <View className="mb-2 flex-row justify-between">
          <Text className="text-sm text-gray-600">Pure Bid:</Text>
          <Text className="text-sm font-medium">
            {product.pureBid ? formatCurrency(product.pureBid) : "N/A"}
          </Text>
        </View>
        <View className="flex-row justify-between border-t border-gray-200 pt-2">
          <Text className="text-base font-semibold">Spread:</Text>
          <Text
            className={`text-base font-bold ${profit >= 0 ? "text-green-600" : "text-red-600"}`}
          >
            {formatCurrency(Math.abs(profit))} {profit >= 0 ? "profit" : "loss"}
          </Text>
        </View>
      </View>
    </View>
  );
}
```

**Verification**:

- [ ] Product list renders
- [ ] Images load correctly
- [ ] Spreads calculate correctly using shared utils
- [ ] Scrolling is smooth

### 4.2 Add Basic Filters

Create `apps/native/components/FilterBar.tsx`:

```tsx
import { View, Text, Pressable } from "react-native";

interface FilterBarProps {
  showOutOfStock: boolean;
  onToggleOutOfStock: () => void;
  metalType: "all" | "gold" | "silver";
  onMetalTypeChange: (type: "all" | "gold" | "silver") => void;
}

export function FilterBar({
  showOutOfStock,
  onToggleOutOfStock,
  metalType,
  onMetalTypeChange,
}: FilterBarProps) {
  return (
    <View className="border-b border-gray-200 bg-white p-3">
      {/* Metal Type Filter */}
      <View className="mb-3 flex-row gap-2">
        <FilterChip
          label="All"
          active={metalType === "all"}
          onPress={() => onMetalTypeChange("all")}
        />
        <FilterChip
          label="Gold"
          active={metalType === "gold"}
          onPress={() => onMetalTypeChange("gold")}
        />
        <FilterChip
          label="Silver"
          active={metalType === "silver"}
          onPress={() => onMetalTypeChange("silver")}
        />
      </View>

      {/* Show Out of Stock Toggle */}
      <Pressable onPress={onToggleOutOfStock} className="flex-row items-center">
        <View
          className={`mr-2 h-5 w-5 items-center justify-center rounded border-2 ${showOutOfStock ? "border-blue-600 bg-blue-600" : "border-gray-400"}`}
        >
          {showOutOfStock && <Text className="text-xs text-white">✓</Text>}
        </View>
        <Text className="text-sm">Show Out of Stock</Text>
      </Pressable>
    </View>
  );
}

function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`rounded-full px-4 py-2 ${active ? "bg-blue-600" : "bg-gray-200"}`}
    >
      <Text
        className={`text-sm font-medium ${active ? "text-white" : "text-gray-700"}`}
      >
        {label}
      </Text>
    </Pressable>
  );
}
```

Update `apps/native/app/index.tsx`:

```tsx
import { useQuery } from "convex/react";
import { api } from "@gold-dashboard/convex-backend/api";
import { View, ActivityIndicator } from "react-native";
import { useState, useMemo } from "react";
import { ProductList } from "../components/ProductList";
import { FilterBar } from "../components/FilterBar";

export default function HomeScreen() {
  const stats = useQuery(api.dashboard.getStats);
  const [showOutOfStock, setShowOutOfStock] = useState(false);
  const [metalType, setMetalType] = useState<"all" | "gold" | "silver">("all");

  // Fixed 2% cashback for MVP (no calculator yet)
  const cashbackPercentage = 2;

  const filteredProducts = useMemo(() => {
    if (!stats) return [];

    return stats.products.filter((product) => {
      if (!showOutOfStock && !product.inStock) return false;
      if (metalType !== "all" && product.metalType.toLowerCase() !== metalType)
        return false;
      return true;
    });
  }, [stats, showOutOfStock, metalType]);

  if (!stats) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      <FilterBar
        showOutOfStock={showOutOfStock}
        onToggleOutOfStock={() => setShowOutOfStock(!showOutOfStock)}
        metalType={metalType}
        onMetalTypeChange={setMetalType}
      />
      <ProductList
        products={filteredProducts}
        cashbackPercentage={cashbackPercentage}
      />
    </View>
  );
}
```

**Verification**:

- [ ] Filter bar renders above product list
- [ ] Metal type filter works (gold/silver/all)
- [ ] Out of stock toggle works
- [ ] Filters combine correctly
- [ ] Performance is good (no lag when filtering)

### 4.3 Add Pull-to-Refresh

Update `apps/native/components/ProductList.tsx`:

```tsx
import { FlatList, RefreshControl } from "react-native";

export function ProductList({
  products,
  cashbackPercentage,
}: ProductListProps) {
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    // Convex will automatically refetch
    setTimeout(() => setRefreshing(false), 1000);
  };

  return (
    <FlatList
      data={products}
      keyExtractor={(item) => item._id}
      renderItem={({ item }) => (
        <ProductCard product={item} cashback={cashbackPercentage} />
      )}
      className="flex-1"
      contentContainerClassName="p-4"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    />
  );
}
```

**Verification**:

- [ ] Pull down to refresh works
- [ ] Loading indicator shows
- [ ] Data refreshes (test by modifying in Convex dashboard)

### 4.4 Add Empty States

Create `apps/native/components/EmptyState.tsx`:

```tsx
import { View, Text } from "react-native";

interface EmptyStateProps {
  title: string;
  message: string;
}

export function EmptyState({ title, message }: EmptyStateProps) {
  return (
    <View className="flex-1 items-center justify-center p-8">
      <Text className="mb-2 text-xl font-semibold text-gray-700">{title}</Text>
      <Text className="text-center text-sm text-gray-500">{message}</Text>
    </View>
  );
}
```

Update `ProductList` to show empty state:

```tsx
if (products.length === 0) {
  return (
    <EmptyState
      title="No Products Found"
      message="Try adjusting your filters or check back later."
    />
  );
}
```

**Verification**:

- [ ] Empty state shows when no products match filters
- [ ] Message is helpful

### 4.5 MVP Testing

**Verification Checklist**:

- [ ] App loads on iOS simulator
- [ ] App loads on Android emulator
- [ ] App loads on physical device
- [ ] Product list displays correctly
- [ ] Filters work (metal type, out of stock)
- [ ] Pull to refresh works
- [ ] Real-time updates work (modify product in Convex)
- [ ] Spread calculations are correct (compare with web)
- [ ] Images load properly
- [ ] Performance is acceptable (smooth scrolling)
- [ ] No console errors or warnings

---

## Phase 5: Authentication (Clerk)

**Objective**: Add Clerk authentication to mobile app

**Estimated Time**: 6-8 hours

**Note**: Only start this phase after MVP is stable and validated

### 5.1 Install Clerk

```bash
cd apps/native
bunx expo install @clerk/clerk-expo react-native-url-polyfill @react-native-async-storage/async-storage
```

### 5.2 Setup Clerk Provider

Create `apps/native/ClerkProvider.tsx`:

```tsx
import { ClerkProvider as BaseClerkProvider } from "@clerk/clerk-expo";
import { tokenCache } from "./tokenCache";

export function ClerkProvider({ children }: { children: React.ReactNode }) {
  const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

  if (!publishableKey) {
    throw new Error("Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY");
  }

  return (
    <BaseClerkProvider tokenCache={tokenCache} publishableKey={publishableKey}>
      {children}
    </BaseClerkProvider>
  );
}
```

Create `apps/native/tokenCache.ts`:

```typescript
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

export const tokenCache = {
  async getToken(key: string) {
    try {
      return SecureStore.getItemAsync(key);
    } catch (err) {
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      return SecureStore.setItemAsync(key, value);
    } catch (err) {
      return;
    }
  },
};
```

Update `apps/native/app/_layout.tsx`:

```tsx
import { ClerkProvider } from "../ClerkProvider";
import { ConvexProvider } from "../ConvexProvider";

export default function RootLayout() {
  return (
    <ClerkProvider>
      <ConvexProvider>
        <Stack>
          <Stack.Screen name="index" options={{ title: "Gold Dashboard" }} />
        </Stack>
      </ConvexProvider>
    </ClerkProvider>
  );
}
```

### 5.3 Add Sign In/Sign Up

Create `apps/native/app/sign-in.tsx`:

```tsx
import { useSignIn } from "@clerk/clerk-expo";
import { useState } from "react";
import { View, TextInput, Pressable, Text } from "react-native";

export default function SignInScreen() {
  const { signIn, setActive } = useSignIn();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const onSignIn = async () => {
    if (!signIn) return;

    try {
      const result = await signIn.create({
        identifier: email,
        password,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <View className="flex-1 justify-center p-4">
      <Text className="mb-6 text-2xl font-bold">Sign In</Text>
      <TextInput
        className="mb-3 rounded border border-gray-300 p-3"
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        className="mb-4 rounded border border-gray-300 p-3"
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <Pressable
        onPress={onSignIn}
        className="items-center rounded bg-blue-600 p-4"
      >
        <Text className="font-semibold text-white">Sign In</Text>
      </Pressable>
    </View>
  );
}
```

### 5.4 Add Protected Routes

Update `apps/native/app/index.tsx`:

```tsx
import { useAuth } from "@clerk/clerk-expo";
import { Redirect } from "expo-router";

export default function HomeScreen() {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!isSignedIn) {
    return <Redirect href="/sign-in" />;
  }

  // ... rest of existing code
}
```

### 5.5 Update Convex with Auth

Update `apps/native/ConvexProvider.tsx`:

```tsx
import { useAuth } from "@clerk/clerk-expo";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";

const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!);

export function ConvexProvider({ children }: { children: ReactNode }) {
  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      {children}
    </ConvexProviderWithClerk>
  );
}
```

**Verification**:

- [ ] Sign in flow works
- [ ] Protected routes redirect to sign in
- [ ] Convex queries work with auth
- [ ] Token caching works (no re-auth on app restart)
- [ ] Sign out works

---

## Phase 6: Feature Expansion

**Objective**: Add calculator, themes, and other features from web

**Estimated Time**: 10-12 hours

### 6.1 Add Calculator (Credit Card Selection)

Create `apps/native/components/CalculatorSheet.tsx`:

```tsx
import { BottomSheet } from "@gorhom/bottom-sheet"; // Need to install
import { View, Text, Switch, Pressable } from "react-native";
import { loadCreditCards, type CreditCard } from "@gold-dashboard/shared/lib";
import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export function CalculatorSheet({
  onCashbackChange,
}: {
  onCashbackChange: (percentage: number) => void;
}) {
  const [executiveMember, setExecutiveMember] = useState(false);
  const [selectedCard, setSelectedCard] = useState<CreditCard | null>(null);

  useEffect(() => {
    loadCards();
  }, []);

  useEffect(() => {
    const total =
      (executiveMember ? 2 : 0) + (selectedCard?.cashbackPercentage ?? 0);
    onCashbackChange(total);
  }, [executiveMember, selectedCard]);

  const loadCards = async () => {
    const stored = await AsyncStorage.getItem("credit-cards");
    if (stored) {
      const cards = loadCreditCards(JSON.parse(stored));
      setSelectedCard(cards[0] ?? null);
    }
  };

  // ... rest of component
}
```

**Note**: Credit card management on mobile will use AsyncStorage instead of localStorage. Shared lib functions work with both.

### 6.2 Add Dark Mode

Install:

```bash
bunx expo install expo-system-ui
```

Create `apps/native/ThemeProvider.tsx`:

```tsx
import { createContext, useContext, useState, useEffect } from "react";
import { useColorScheme } from "react-native";
import * as SystemUI from "expo-system-ui";

type Theme = "light" | "dark" | "system";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemTheme = useColorScheme();
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    const activeTheme = theme === "system" ? systemTheme : theme;
    SystemUI.setBackgroundColorAsync(activeTheme === "dark" ? "#000" : "#fff");
  }, [theme, systemTheme]);

  // ... rest of provider
}
```

### 6.3 Add Market Prices Widget

Create `apps/native/components/MarketPrices.tsx`:

```tsx
import { View, Text } from "react-native";
import { formatCurrency } from "@gold-dashboard/shared/utils";

export function MarketPrices({ prices }: { prices: MarketPrice[] }) {
  return (
    <View className="border-b border-gray-200 bg-white p-4">
      <Text className="mb-2 text-sm font-semibold text-gray-700">
        Market Prices
      </Text>
      <View className="flex-row justify-between">
        {prices.map((price) => (
          <View key={price.symbol} className="items-center">
            <Text className="text-xs text-gray-500">{price.symbol}</Text>
            <Text className="text-sm font-semibold">
              {formatCurrency(price.currentPrice)}
            </Text>
            <Text
              className={`text-xs ${price.change24h >= 0 ? "text-green-600" : "text-red-600"}`}
            >
              {price.change24h >= 0 ? "↗" : "↘"}{" "}
              {Math.abs(price.change24h).toFixed(2)}%
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
```

**Verification**:

- [ ] Calculator works with shared credit card logic
- [ ] Dark mode toggles correctly
- [ ] Market prices display correctly
- [ ] All features work together without conflicts

---

## Phase 7: Push Notifications

**Objective**: Implement push notifications for price alerts, profit/spread thresholds, and stock alerts

**Estimated Time**: 12-16 hours

**Note**: This is a key feature for mobile - users want to be notified when:

1. A product's price drops below a threshold
2. Profit/spread reaches a certain amount
3. Out-of-stock products come back in stock

### 7.1 Install Expo Notifications

```bash
cd apps/native
bunx expo install expo-notifications expo-device expo-constants
```

**Setup permissions** in `apps/native/app.json`:

```json
{
  "expo": {
    "notification": {
      "color": "#ffffff",
      "icon": "./assets/notification-icon.png"
    },
    "plugins": [
      [
        "expo-notifications",
        {
          "color": "#ffffff",
          "icon": "./assets/notification-icon.png",
          "sounds": ["./assets/notification-sound.wav"]
        }
      ]
    ]
  }
}
```

**Verification**:

- [ ] App builds with notification plugin
- [ ] No permission errors

### 7.2 Setup Notification Handler

Create `apps/native/lib/notifications.ts`:

```typescript
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotificationsAsync() {
  if (!Device.isDevice) {
    console.warn("Push notifications only work on physical devices");
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.warn("Failed to get push notification permissions");
    return null;
  }

  // Get Expo push token
  const token = await Notifications.getExpoPushTokenAsync({
    projectId: process.env.EXPO_PUBLIC_PROJECT_ID!, // From eas.json
  });

  // Android-specific channel setup
  if (Platform.OS === "android") {
    Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    });
  }

  return token.data;
}

export async function schedulePushNotification(
  title: string,
  body: string,
  data?: any,
) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: true,
    },
    trigger: null, // Immediate
  });
}
```

**Verification**:

- [ ] Permission request shows on first app launch
- [ ] Push token is generated
- [ ] Test notification can be scheduled locally

### 7.3 Setup Notification Preferences UI

Create `apps/native/components/NotificationSettings.tsx`:

```tsx
import { View, Text, Switch, TextInput, Pressable } from "react-native";
import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface NotificationPreferences {
  enabled: boolean;
  priceAlerts: {
    enabled: boolean;
    threshold: number; // Price drop percentage
  };
  profitAlerts: {
    enabled: boolean;
    minProfit: number; // Minimum profit in dollars
  };
  stockAlerts: {
    enabled: boolean;
    favoriteProducts: string[]; // Product IDs
  };
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  enabled: true,
  priceAlerts: { enabled: true, threshold: 5 }, // 5% price drop
  profitAlerts: { enabled: true, minProfit: 100 }, // $100 profit
  stockAlerts: { enabled: true, favoriteProducts: [] },
};

export function NotificationSettings() {
  const [preferences, setPreferences] =
    useState<NotificationPreferences>(DEFAULT_PREFERENCES);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    const stored = await AsyncStorage.getItem("notification-preferences");
    if (stored) {
      setPreferences(JSON.parse(stored));
    }
  };

  const savePreferences = async (newPreferences: NotificationPreferences) => {
    setPreferences(newPreferences);
    await AsyncStorage.setItem(
      "notification-preferences",
      JSON.stringify(newPreferences),
    );
  };

  return (
    <View className="p-4">
      <Text className="mb-4 text-xl font-bold">Notification Settings</Text>

      {/* Master Toggle */}
      <View className="mb-6 flex-row items-center justify-between border-b border-gray-200 pb-4">
        <Text className="text-base font-semibold">Enable Notifications</Text>
        <Switch
          value={preferences.enabled}
          onValueChange={(enabled) =>
            savePreferences({ ...preferences, enabled })
          }
        />
      </View>

      {/* Price Alerts */}
      <View className="mb-6">
        <View className="mb-2 flex-row items-center justify-between">
          <Text className="text-base font-semibold">Price Drop Alerts</Text>
          <Switch
            value={preferences.priceAlerts.enabled}
            onValueChange={(enabled) =>
              savePreferences({
                ...preferences,
                priceAlerts: { ...preferences.priceAlerts, enabled },
              })
            }
            disabled={!preferences.enabled}
          />
        </View>
        <Text className="mb-2 text-sm text-gray-600">
          Get notified when prices drop by:
        </Text>
        <View className="flex-row items-center">
          <TextInput
            className="mr-2 w-20 rounded border border-gray-300 px-3 py-2"
            value={preferences.priceAlerts.threshold.toString()}
            onChangeText={(text) => {
              const threshold = parseInt(text) || 0;
              savePreferences({
                ...preferences,
                priceAlerts: { ...preferences.priceAlerts, threshold },
              });
            }}
            keyboardType="number-pad"
            editable={preferences.enabled && preferences.priceAlerts.enabled}
          />
          <Text className="text-gray-600">% or more</Text>
        </View>
      </View>

      {/* Profit Alerts */}
      <View className="mb-6">
        <View className="mb-2 flex-row items-center justify-between">
          <Text className="text-base font-semibold">Profit Alerts</Text>
          <Switch
            value={preferences.profitAlerts.enabled}
            onValueChange={(enabled) =>
              savePreferences({
                ...preferences,
                profitAlerts: { ...preferences.profitAlerts, enabled },
              })
            }
            disabled={!preferences.enabled}
          />
        </View>
        <Text className="mb-2 text-sm text-gray-600">
          Get notified when profit reaches:
        </Text>
        <View className="flex-row items-center">
          <Text className="mr-2 text-gray-600">$</Text>
          <TextInput
            className="flex-1 rounded border border-gray-300 px-3 py-2"
            value={preferences.profitAlerts.minProfit.toString()}
            onChangeText={(text) => {
              const minProfit = parseInt(text) || 0;
              savePreferences({
                ...preferences,
                profitAlerts: { ...preferences.profitAlerts, minProfit },
              });
            }}
            keyboardType="number-pad"
            editable={preferences.enabled && preferences.profitAlerts.enabled}
          />
        </View>
      </View>

      {/* Stock Alerts */}
      <View className="mb-6">
        <View className="mb-2 flex-row items-center justify-between">
          <Text className="text-base font-semibold">Stock Alerts</Text>
          <Switch
            value={preferences.stockAlerts.enabled}
            onValueChange={(enabled) =>
              savePreferences({
                ...preferences,
                stockAlerts: { ...preferences.stockAlerts, enabled },
              })
            }
            disabled={!preferences.enabled}
          />
        </View>
        <Text className="text-sm text-gray-600">
          Get notified when out-of-stock products you're watching come back in
          stock.
        </Text>
      </View>
    </View>
  );
}
```

Add notification settings screen to `apps/native/app/settings.tsx`:

```tsx
import { NotificationSettings } from "../components/NotificationSettings";
import { View } from "react-native";

export default function SettingsScreen() {
  return (
    <View className="flex-1 bg-white">
      <NotificationSettings />
    </View>
  );
}
```

**Verification**:

- [ ] Settings screen renders
- [ ] Toggles work correctly
- [ ] Preferences persist across app restarts
- [ ] Disabled state works when master toggle is off

### 7.4 Add Backend Notification Logic (Convex)

Create `packages/convex-backend/convex/notifications.ts`:

```typescript
import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

// Store user push tokens
export const savePushToken = mutation({
  args: {
    token: v.string(),
    platform: v.union(v.literal("ios"), v.literal("android")),
  },
  handler: async (ctx, args) => {
    const userId = await ctx.auth.getUserIdentity();
    if (!userId) throw new Error("Not authenticated");

    // Upsert push token
    const existing = await ctx.db
      .query("pushTokens")
      .withIndex("by_user", (q) => q.eq("userId", userId.subject))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        token: args.token,
        platform: args.platform,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("pushTokens", {
        userId: userId.subject,
        token: args.token,
        platform: args.platform,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
  },
});

// Save user notification preferences
export const savePreferences = mutation({
  args: {
    preferences: v.object({
      enabled: v.boolean(),
      priceAlerts: v.object({
        enabled: v.boolean(),
        threshold: v.number(),
      }),
      profitAlerts: v.object({
        enabled: v.boolean(),
        minProfit: v.number(),
      }),
      stockAlerts: v.object({
        enabled: v.boolean(),
        favoriteProducts: v.array(v.id("costcoProducts")),
      }),
    }),
  },
  handler: async (ctx, args) => {
    const userId = await ctx.auth.getUserIdentity();
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("notificationPreferences")
      .withIndex("by_user", (q) => q.eq("userId", userId.subject))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        preferences: args.preferences,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("notificationPreferences", {
        userId: userId.subject,
        preferences: args.preferences,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
  },
});

// Get user preferences
export const getPreferences = query({
  args: {},
  handler: async (ctx) => {
    const userId = await ctx.auth.getUserIdentity();
    if (!userId) return null;

    const prefs = await ctx.db
      .query("notificationPreferences")
      .withIndex("by_user", (q) => q.eq("userId", userId.subject))
      .first();

    return prefs?.preferences ?? null;
  },
});

// Internal mutation to send notifications (called by scheduled function)
export const sendNotifications = internalMutation({
  args: {
    userIds: v.array(v.string()),
    title: v.string(),
    body: v.string(),
    data: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    // Get push tokens for users
    const tokens = await Promise.all(
      args.userIds.map((userId) =>
        ctx.db
          .query("pushTokens")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .first(),
      ),
    );

    const validTokens = tokens.filter((t) => t !== null);

    // Queue notifications (implement actual Expo push notification sending)
    for (const token of validTokens) {
      await ctx.db.insert("notificationQueue", {
        token: token!.token,
        platform: token!.platform,
        title: args.title,
        body: args.body,
        data: args.data,
        status: "pending",
        createdAt: Date.now(),
      });
    }
  },
});
```

Add schema for notifications in `packages/convex-backend/convex/schema.ts`:

```typescript
export default defineSchema({
  // ... existing tables

  pushTokens: defineTable({
    userId: v.string(),
    token: v.string(),
    platform: v.union(v.literal("ios"), v.literal("android")),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  notificationPreferences: defineTable({
    userId: v.string(),
    preferences: v.object({
      enabled: v.boolean(),
      priceAlerts: v.object({
        enabled: v.boolean(),
        threshold: v.number(),
      }),
      profitAlerts: v.object({
        enabled: v.boolean(),
        minProfit: v.number(),
      }),
      stockAlerts: v.object({
        enabled: v.boolean(),
        favoriteProducts: v.array(v.id("costcoProducts")),
      }),
    }),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  notificationQueue: defineTable({
    token: v.string(),
    platform: v.union(v.literal("ios"), v.literal("android")),
    title: v.string(),
    body: v.string(),
    data: v.optional(v.any()),
    status: v.union(
      v.literal("pending"),
      v.literal("sent"),
      v.literal("failed"),
    ),
    createdAt: v.number(),
    sentAt: v.optional(v.number()),
    error: v.optional(v.string()),
  }).index("by_status", ["status"]),
});
```

**Verification**:

- [ ] Schema compiles without errors
- [ ] Can save push token from mobile app
- [ ] Can save/load preferences from mobile app

### 7.5 Implement Notification Triggers (Scheduled Function)

Create `packages/convex-backend/convex/notificationTriggers.ts`:

```typescript
import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

export const checkPriceAlerts = internalAction({
  handler: async (ctx) => {
    // Get all users with price alerts enabled
    const allPreferences = await ctx.runQuery(
      internal.notifications.getAllPreferencesInternal,
    );

    const usersWithPriceAlerts = allPreferences.filter(
      (pref) =>
        pref.preferences.enabled && pref.preferences.priceAlerts.enabled,
    );

    if (usersWithPriceAlerts.length === 0) return;

    // Get current products and price history
    const products = await ctx.runQuery(internal.dashboard.getAllProducts);
    const priceHistory = await ctx.runQuery(internal.priceHistory.getRecent, {
      hours: 24,
    });

    // Check for price drops
    for (const user of usersWithPriceAlerts) {
      const threshold = user.preferences.priceAlerts.threshold;

      for (const product of products) {
        const history = priceHistory.filter((h) => h.productId === product._id);
        if (history.length === 0) continue;

        const oldPrice = history[0].price;
        const newPrice = product.price;
        const dropPercentage = ((oldPrice - newPrice) / oldPrice) * 100;

        if (dropPercentage >= threshold) {
          // Send notification
          await ctx.runMutation(internal.notifications.sendNotifications, {
            userIds: [user.userId],
            title: `Price Drop Alert: ${product.name}`,
            body: `Price dropped ${dropPercentage.toFixed(1)}% to $${newPrice.toFixed(2)}`,
            data: { productId: product._id, type: "price_drop" },
          });
        }
      }
    }
  },
});

export const checkProfitAlerts = internalAction({
  handler: async (ctx) => {
    // Similar logic for profit alerts
    const allPreferences = await ctx.runQuery(
      internal.notifications.getAllPreferencesInternal,
    );

    const usersWithProfitAlerts = allPreferences.filter(
      (pref) =>
        pref.preferences.enabled && pref.preferences.profitAlerts.enabled,
    );

    if (usersWithProfitAlerts.length === 0) return;

    const products = await ctx.runQuery(internal.dashboard.getAllProducts);

    for (const user of usersWithProfitAlerts) {
      const minProfit = user.preferences.profitAlerts.minProfit;

      for (const product of products) {
        // Calculate profit with user's default cashback
        const profit = product.pureBid - product.price * 0.98; // Assuming 2% cashback

        if (profit >= minProfit) {
          await ctx.runMutation(internal.notifications.sendNotifications, {
            userIds: [user.userId],
            title: `Profit Alert: ${product.name}`,
            body: `Potential profit of $${profit.toFixed(2)} available!`,
            data: { productId: product._id, type: "profit_alert" },
          });
        }
      }
    }
  },
});

export const checkStockAlerts = internalAction({
  handler: async (ctx) => {
    // Get all users with stock alerts enabled
    const allPreferences = await ctx.runQuery(
      internal.notifications.getAllPreferencesInternal,
    );

    const usersWithStockAlerts = allPreferences.filter(
      (pref) =>
        pref.preferences.enabled && pref.preferences.stockAlerts.enabled,
    );

    if (usersWithStockAlerts.length === 0) return;

    // Get recent stock changes (products that just came back in stock)
    const recentStockChanges = await ctx.runQuery(
      internal.stockHistory.getRecentRestocks,
      { hours: 1 },
    );

    for (const stockChange of recentStockChanges) {
      // Find users watching this product
      const interestedUsers = usersWithStockAlerts.filter((user) =>
        user.preferences.stockAlerts.favoriteProducts.includes(
          stockChange.productId,
        ),
      );

      if (interestedUsers.length > 0) {
        await ctx.runMutation(internal.notifications.sendNotifications, {
          userIds: interestedUsers.map((u) => u.userId),
          title: `Back in Stock: ${stockChange.productName}`,
          body: `${stockChange.productName} is now available!`,
          data: { productId: stockChange.productId, type: "stock_alert" },
        });
      }
    }
  },
});
```

Add to `packages/convex-backend/convex/crons.ts`:

```typescript
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// ... existing crons

// Check for notification triggers every 15 minutes
crons.interval(
  "check-price-alerts",
  { minutes: 15 },
  internal.notificationTriggers.checkPriceAlerts,
);

crons.interval(
  "check-profit-alerts",
  { minutes: 15 },
  internal.notificationTriggers.checkProfitAlerts,
);

crons.interval(
  "check-stock-alerts",
  { minutes: 5 }, // More frequent for stock alerts
  internal.notificationTriggers.checkStockAlerts,
);

export default crons;
```

**Verification**:

- [ ] Cron jobs are scheduled correctly
- [ ] Test notifications are queued when conditions are met
- [ ] No duplicate notifications sent

### 7.6 Implement Expo Push Notification Sender

Create `packages/convex-backend/convex/pushSender.ts`:

```typescript
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: any;
  sound?: "default" | null;
  badge?: number;
  priority?: "default" | "normal" | "high";
}

export const processPushQueue = internalAction({
  handler: async (ctx) => {
    // Get pending notifications
    const pending = await ctx.runQuery(
      internal.notifications.getPendingNotifications,
    );

    if (pending.length === 0) return;

    // Batch notifications for Expo Push API
    const messages: ExpoPushMessage[] = pending.map((notif) => ({
      to: notif.token,
      title: notif.title,
      body: notif.body,
      data: notif.data,
      sound: "default",
      priority: "high",
    }));

    // Send to Expo Push API
    try {
      const response = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(messages),
      });

      const result = await response.json();

      // Mark notifications as sent
      for (let i = 0; i < pending.length; i++) {
        const notif = pending[i];
        const status = result.data[i];

        if (status.status === "ok") {
          await ctx.runMutation(internal.notifications.markAsSent, {
            id: notif._id,
          });
        } else {
          await ctx.runMutation(internal.notifications.markAsFailed, {
            id: notif._id,
            error: status.message,
          });
        }
      }
    } catch (error) {
      console.error("Failed to send push notifications:", error);
    }
  },
});
```

Add cron to process push queue:

```typescript
// In crons.ts
crons.interval(
  "process-push-queue",
  { minutes: 1 }, // Process every minute
  internal.pushSender.processPushQueue,
);
```

**Verification**:

- [ ] Push notifications are sent successfully
- [ ] Failed notifications are marked with error
- [ ] Queue is processed regularly

### 7.7 Handle Notifications in Mobile App

Update `apps/native/app/_layout.tsx`:

```tsx
import { useEffect, useRef } from "react";
import * as Notifications from "expo-notifications";
import { registerForPushNotificationsAsync } from "../lib/notifications";
import { useMutation } from "convex/react";
import { api } from "@gold-dashboard/convex-backend/api";
import { useRouter } from "expo-router";
import { Platform } from "react-native";

export default function RootLayout() {
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();
  const router = useRouter();
  const savePushToken = useMutation(api.notifications.savePushToken);

  useEffect(() => {
    // Register for push notifications
    registerForPushNotificationsAsync().then((token) => {
      if (token) {
        savePushToken({
          token,
          platform: Platform.OS === "ios" ? "ios" : "android",
        });
      }
    });

    // Handle notifications received while app is open
    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      console.log("Notification received:", notification);
    });

    // Handle notification taps
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;

      // Navigate to product details
      if (data?.productId) {
        router.push(`/product/${data.productId}`);
      }
    });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);

  return (
    // ... rest of layout
  );
}
```

**Verification**:

- [ ] Push token is saved to Convex on app launch
- [ ] Notifications appear when app is in foreground
- [ ] Tapping notification navigates to correct screen
- [ ] Background notifications work

### 7.8 Add "Favorite" Feature for Stock Alerts

Update product card to add favorite toggle:

```tsx
// In ProductCard component
import { useMutation } from "convex/react";
import { api } from "@gold-dashboard/convex-backend/api";
import { Ionicons } from "@expo/vector-icons";

function ProductCard({ product }: { product: Product }) {
  const [isFavorite, setIsFavorite] = useState(false);
  const toggleFavorite = useMutation(api.notifications.toggleFavorite);

  const handleFavoritePress = async () => {
    await toggleFavorite({ productId: product._id });
    setIsFavorite(!isFavorite);
  };

  return (
    <View className="mb-4 rounded-lg border border-gray-200 bg-white p-4">
      {/* Add favorite button in header */}
      <View className="mb-2 flex-row items-start">
        {/* ... existing product image and name */}
        <Pressable onPress={handleFavoritePress} className="ml-auto">
          <Ionicons
            name={isFavorite ? "heart" : "heart-outline"}
            size={24}
            color={isFavorite ? "#ef4444" : "#9ca3af"}
          />
        </Pressable>
      </View>
      {/* ... rest of product card */}
    </View>
  );
}
```

**Verification**:

- [ ] Can favorite/unfavorite products
- [ ] Favorite state persists
- [ ] Stock alerts work for favorited products

### 7.9 Testing & Verification

**End-to-End Test**:

1. Enable notifications in app
2. Set price alert threshold to 1%
3. Manually update a product price in Convex (reduce by 2%)
4. Wait for cron to run (or trigger manually)
5. Verify notification received on device
6. Tap notification
7. Verify app navigates to product

**Test Checklist**:

- [ ] Push permissions requested correctly
- [ ] Push token saved to backend
- [ ] Notification preferences save correctly
- [ ] Price alerts trigger when threshold met
- [ ] Profit alerts trigger when profit >= minimum
- [ ] Stock alerts trigger when favorited product restocks
- [ ] Notifications appear on device
- [ ] Tapping notification navigates correctly
- [ ] Background notifications work
- [ ] Works on both iOS and Android
- [ ] No duplicate notifications sent
- [ ] Unsubscribe works (disable notifications)

---

## Phase 8: Production Readiness

**Objective**: Prepare mobile app for TestFlight/Play Store

**Estimated Time**: 4-6 hours

### 8.1 App Icons & Splash Screen

```bash
cd apps/native
# Generate icons
bunx expo install expo-splash-screen expo-updates
```

Create `apps/native/assets/icon.png` (1024x1024)
Create `apps/native/assets/splash.png`

Update `apps/native/app.json`:

```json
{
  "expo": {
    "android": {
      "adaptiveIcon": {
        "backgroundColor": "#ffffff",
        "foregroundImage": "./assets/adaptive-icon.png"
      },
      "package": "com.golddashboard.app",
      "versionCode": 1
    },
    "icon": "./assets/icon.png",
    "ios": {
      "buildNumber": "1",
      "bundleIdentifier": "com.golddashboard.app"
    },
    "name": "Gold Dashboard",
    "orientation": "portrait",
    "slug": "gold-dashboard",
    "splash": {
      "backgroundColor": "#ffffff",
      "image": "./assets/splash.png",
      "resizeMode": "contain"
    },
    "userInterfaceStyle": "automatic",
    "version": "1.0.0"
  }
}
```

### 8.2 Error Boundaries

Create `apps/native/components/ErrorBoundary.tsx`:

```tsx
import { Component, ReactNode } from "react";
import { View, Text, Pressable } from "react-native";

export class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <View className="flex-1 items-center justify-center p-8">
          <Text className="mb-2 text-xl font-bold text-red-600">
            Oops! Something went wrong
          </Text>
          <Text className="mb-4 text-center text-sm text-gray-600">
            {this.state.error?.message}
          </Text>
          <Pressable
            onPress={() => this.setState({ hasError: false, error: null })}
            className="rounded bg-blue-600 px-6 py-3"
          >
            <Text className="font-semibold text-white">Try Again</Text>
          </Pressable>
        </View>
      );
    }

    return this.props.children;
  }
}
```

### 8.3 Build & Test

**iOS (TestFlight)**:

```bash
cd apps/native
bunx eas build --platform ios
bunx eas submit --platform ios
```

**Android (Play Store)**:

```bash
cd apps/native
bunx eas build --platform android
bunx eas submit --platform android
```

### 8.4 Performance Optimization

- [ ] Enable Hermes engine (default in Expo)
- [ ] Add image optimization (expo-image)
- [ ] Implement list virtualization (already using FlatList)
- [ ] Test on low-end devices
- [ ] Measure bundle size: `bunx expo export --dump-sourcemap`

### 8.5 Final Verification

**Functionality**:

- [ ] All MVP features work
- [ ] Auth works (if implemented)
- [ ] Real-time updates work
- [ ] Filters work correctly
- [ ] Calculator works correctly
- [ ] No crashes or errors

**Performance**:

- [ ] App launches in < 3 seconds
- [ ] Smooth scrolling (60 FPS)
- [ ] No memory leaks
- [ ] Battery usage is reasonable

**Platform-Specific**:

- [ ] iOS: Safe area handling, notch support
- [ ] Android: Back button handling, status bar
- [ ] Both: Dark mode, accessibility

**Build**:

- [ ] iOS build succeeds
- [ ] Android build succeeds
- [ ] TestFlight build works
- [ ] Play Console build works

---

## Post-Migration Tasks

### Documentation Updates

- [ ] Update README.md with monorepo instructions
- [ ] Update CLAUDE.md with new structure
- [ ] Add mobile-specific docs (setup, building, deploying)
- [ ] Document shared package usage
- [ ] Update architecture diagrams

### CI/CD Updates

- [ ] Add mobile builds to CI
- [ ] Setup EAS builds for iOS/Android
- [ ] Add mobile tests to CI pipeline
- [ ] Configure automatic deployments

### Developer Experience

- [ ] Add workspace scripts to root package.json
- [ ] Document local development workflow
- [ ] Add mobile debugging tips
- [ ] Create troubleshooting guide

---

## Rollback Plan

If migration causes critical issues:

### Immediate Rollback

```bash
git checkout main
git reset --hard pre-turbo-migration
```

### Partial Rollback

Keep monorepo structure but continue using web:

```bash
# Keep apps/web working
cd apps/web
bun run dev  # Should work independently
```

### Recovery Steps

1. Verify `pre-turbo-migration` tag exists
2. Check that all changes are committed
3. Keep mobile app in separate branch: `git checkout -b mobile-app origin/turbo-migration`
4. Return to main: `git checkout main`
5. Can merge mobile app later when stable

---

## Risk Assessment

### High Risk

- **Convex schema conflicts**: If web and mobile need different schemas
  - **Mitigation**: Share exact same backend package
  - **Alternative**: Use separate Convex deployments during migration

- **Build complexity**: Monorepo adds complexity to builds and CI
  - **Mitigation**: Turbo caching and parallel builds
  - **Alternative**: Keep separate repos (not recommended)

### Medium Risk

- **NativeWind limitations**: Not all Tailwind features work on mobile
  - **Mitigation**: Use Tailwind subset, StyleSheet for complex layouts
  - **Alternative**: Pure StyleSheet (more work, less consistency)

- **Package version conflicts**: Different packages need different versions
  - **Mitigation**: Use `resolutions` in root package.json
  - **Alternative**: Separate package.json for each app

### Low Risk

- **Local storage vs AsyncStorage**: Different storage APIs
  - **Mitigation**: Already handled in shared/lib/credit-cards.ts
  - **Alternative**: Build abstraction layer

---

## Success Metrics

### Phase 1-2 (Monorepo Setup)

- [ ] Web app still works identically
- [ ] All existing tests pass
- [ ] Build time < 2x slower
- [ ] Dev server starts in < 5 seconds

### Phase 3-4 (Mobile MVP)

- [ ] App loads in < 3 seconds
- [ ] Product list displays correctly
- [ ] Shared calculations match web exactly
- [ ] No TypeScript errors
- [ ] Works on iOS and Android

### Phase 5-6 (Auth & Features)

- [ ] Sign in flow works smoothly
- [ ] Feature parity with web (where applicable)
- [ ] Offline mode works (if implemented)
- [ ] No regressions in web app

### Phase 7 (Production)

- [ ] TestFlight build works
- [ ] Play Store build works
- [ ] Performance metrics met (60 FPS, < 3s load)
- [ ] < 5 crash-free users

---

## Timeline Estimate

**Conservative Estimate** (one developer, part-time):

- Phase 0-2: 1 week (setup, monorepo conversion, shared packages)
- Phase 3-4: 1 week (Expo setup, mobile MVP with PostHog)
- Phase 5: 3-4 days (authentication)
- Phase 6: 1 week (feature expansion - calculator, dark mode, market prices)
- Phase 7: 1 week (push notifications - key mobile feature)
- Phase 8: 3-4 days (production readiness)

**Total**: 4-5 weeks part-time, or 2-2.5 weeks full-time

**Aggressive Estimate** (experienced with Expo + Turbo):

- Phases 0-2: 2-3 days
- Phases 3-4: 2-3 days
- Phase 5: 1-2 days
- Phase 6: 3-4 days
- Phase 7: 2-3 days (push notifications)
- Phase 8: 1-2 days

**Total**: 11-17 days full-time

**Note**: Push notifications (Phase 7) are a significant feature addition that adds complexity to both frontend and backend. The estimate accounts for:

- Expo notification setup and permissions
- Backend schema changes and cron jobs
- Notification triggers for price/profit/stock alerts
- Testing across iOS and Android

---

## Questions & Decisions Log

### Answered

- ✅ Mobile scope: MVP with basic filtering
- ✅ Styling: NativeWind
- ✅ Code sharing: Utils, lib, Convex backend
- ✅ Auth timing: Phase 2 (after MVP)

### Answered (Round 2)

- ✅ Push notifications: YES - for price alerts, profit/spread thresholds, and stock alerts
- ✅ Offline mode: NO - not needed
- ✅ Tablet support: NO - mobile only for now
- ✅ Reverse code sharing (web from mobile): NO - keep RR7 web version separate
- ✅ PostHog analytics: YES - needed on mobile

---

## References

- [Turborepo Docs](https://turborepo.com/docs)
- [Expo Monorepo Guide](https://docs.expo.dev/guides/monorepos/)
- [Convex Turbo Example](https://github.com/get-convex/turbo-expo-nextjs-clerk-convex-monorepo)
- [NativeWind Docs](https://www.nativewind.dev/)
- [Shadcn Monorepo](https://ui.shadcn.com/docs/monorepo)
- [Expo Router](https://docs.expo.dev/router/introduction/)

---

**Last Updated**: 2025-01-22
**Status**: Ready for Phase 0 execution
**Next Action**: Create feature branch and start Phase 1
