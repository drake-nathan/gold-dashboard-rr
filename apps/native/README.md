# Gold Dashboard - Mobile App (Expo)

A React Native mobile app for tracking gold and silver prices from Costco, built with Expo.

## For React Developers New to React Native

If you're coming from React web development, here are the key differences:

### What is Expo?

Expo is a framework that makes React Native development easier. Think of it like Create React App, but for mobile apps. It handles:
- Building iOS and Android apps
- Hot reloading during development
- Managing native dependencies
- Testing on physical devices via Expo Go app

### Key Differences from React Web

| React Web | React Native |
|-----------|--------------|
| `<div>` | `<View>` |
| `<span>`, `<p>` | `<Text>` |
| `<button>` | `<Pressable>` or `<TouchableOpacity>` |
| `<input>` | `<TextInput>` |
| CSS classes | StyleSheet or NativeWind (Tailwind) |
| `onClick` | `onPress` |
| `window.localStorage` | `AsyncStorage` |

### What You Can Reuse

- ✅ All JavaScript/TypeScript logic
- ✅ React hooks (useState, useEffect, etc.)
- ✅ State management patterns
- ✅ API calls and data fetching
- ✅ Business logic from `@gold-dashboard/shared`
- ✅ Convex queries/mutations from `@gold-dashboard/convex-backend`

### What's Different

- ❌ DOM APIs (no `document`, `window.location`, etc.)
- ❌ CSS files (use StyleSheet or NativeWind)
- ❌ HTML elements (use React Native components)
- ❌ Browser-specific features (use React Native equivalents)

## Prerequisites

- **Node.js** 22+ (check with `node --version`)
- **Bun** 1.1.44+ (our package manager - check with `bun --version`)
- **Expo Go app** on your phone (optional, for testing)
  - iOS: [Download from App Store](https://apps.apple.com/app/expo-go/id982107779)
  - Android: [Download from Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)

## Getting Started

### 1. Install Dependencies

From the monorepo root:

```bash
bun install
```

### 2. Set Up Environment Variables

Create `apps/native/.env.local`:

```bash
EXPO_PUBLIC_CONVEX_URL=https://effervescent-dog-80.convex.cloud
EXPO_PUBLIC_POSTHOG_KEY=    # Optional: PostHog API key
EXPO_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

### 3. Start the Dev Server

From the monorepo root:

```bash
# Start just the mobile app
bunx turbo start --filter=@gold-dashboard/native

# Or cd into the native app
cd apps/native
bun run start
```

This will:
1. Start the Metro bundler (React Native's build tool)
2. Show a QR code in your terminal
3. Give you options to:
   - Press `i` to open iOS simulator
   - Press `a` to open Android emulator
   - Scan QR code with Expo Go app on your phone

### 4. Testing Methods

#### Option A: Physical Device (Easiest)

1. Install Expo Go on your phone
2. Scan the QR code shown in terminal
3. App will load on your device
4. Changes auto-reload as you save files

#### Option B: iOS Simulator (Mac only)

1. Install Xcode from App Store
2. Press `i` in the Metro bundler terminal
3. Simulator will open automatically

#### Option C: Android Emulator

1. Install Android Studio
2. Set up an emulator in AVD Manager
3. Press `a` in the Metro bundler terminal

## Project Structure

```
apps/native/
├── app/                    # Expo Router (file-based routing)
│   ├── _layout.tsx        # Root layout with providers
│   └── index.tsx          # Home screen
├── src/                    # Application code
│   ├── components/        # Reusable UI components
│   ├── lib/               # Utilities and helpers
│   └── providers/         # Context providers
├── .env.local             # Environment variables (gitignored)
├── app.json               # Expo configuration
├── babel.config.js        # Babel config (for NativeWind)
├── metro.config.js        # Metro bundler config
├── tailwind.config.js     # Tailwind/NativeWind config
└── tsconfig.json          # TypeScript configuration
```

### Routing with Expo Router

Expo Router uses **file-based routing** (like Next.js):

- `app/index.tsx` → `/` (home screen)
- `app/settings.tsx` → `/settings`
- `app/product/[id].tsx` → `/product/:id` (dynamic route)
- `app/(tabs)/` → Tab navigator

## Development

### Available Commands

```bash
# Start dev server
bun run start

# Start with cache cleared
bun run start --clear

# Open on iOS simulator
bun run ios

# Open on Android emulator
bun run android

# Type checking
bun run typecheck

# Linting
bun run lint
bun run lint:fix
```

### Hot Reloading

Changes to your code will automatically reload the app. If something breaks:

1. Press `r` in the terminal to reload
2. Press `m` to toggle the developer menu on device
3. Shake device to open developer menu

### Debugging

#### Console Logs

```tsx
console.log('Debug:', someVariable);
```

Logs appear in the Metro bundler terminal.

#### React DevTools

1. Press `m` in terminal to open developer menu
2. Select "Debug Remote JS"
3. Opens Chrome DevTools

#### Common Issues

**"Unable to resolve module"**
- Clear cache: `bun run start --clear`
- Restart Metro bundler
- Check import paths

**"Network response timed out"**
- Make sure your phone and computer are on the same WiFi
- Check firewall settings

**Styles not applying**
- NativeWind might need Metro restart
- Check that `className` is being used correctly
- Some Tailwind classes don't work on mobile (check NativeWind docs)

## Using Shared Code

This app uses shared packages from the monorepo:

### Shared Business Logic

```tsx
import { calculateProfit, formatCurrency } from "@gold-dashboard/shared/utils";
import { loadCreditCards } from "@gold-dashboard/shared/lib";

// Use exactly like in the web app!
const profit = calculateProfit({
  costcoPrice: 2500,
  pureBid: 2600,
  cashbackPercentage: 5,
});
```

### Convex Backend

```tsx
import { useQuery, useMutation } from "convex/react";
import { api } from "@gold-dashboard/convex-backend/api";

function MyComponent() {
  // Fetch data (real-time updates!)
  const stats = useQuery(api.dashboard.getStats);

  // Mutations work the same
  const saveSettings = useMutation(api.users.saveSettings);
}
```

## Styling with NativeWind

We use NativeWind, which brings Tailwind CSS to React Native:

### Basic Example

```tsx
import { View, Text } from "react-native";

function Card() {
  return (
    <View className="rounded-lg bg-white p-4 shadow">
      <Text className="text-lg font-bold">Hello Mobile!</Text>
      <Text className="text-gray-600">This uses Tailwind classes</Text>
    </View>
  );
}
```

### Limitations

Some Tailwind features don't work on mobile:

- ❌ Pseudo-classes (`:hover`, `:focus`)
- ❌ Complex layouts (use Flexbox instead)
- ❌ Some color utilities

But you can use:

- ✅ Spacing (p-4, m-2, gap-3)
- ✅ Colors (bg-blue-500, text-red-600)
- ✅ Typography (text-lg, font-bold)
- ✅ Flexbox (flex-1, items-center, justify-between)
- ✅ Borders (rounded-lg, border-2)

### Responsive Design

Use breakpoints (though most mobile apps don't need them):

```tsx
<View className="p-4 sm:p-6 md:p-8">
```

## Building for Production

### Development Builds

```bash
# iOS
bunx eas build --platform ios --profile development

# Android
bunx eas build --platform android --profile development
```

### Production Builds

```bash
# iOS (for App Store)
bunx eas build --platform ios --profile production

# Android (for Play Store)
bunx eas build --platform android --profile production
```

### Submit to Stores

```bash
# iOS
bunx eas submit --platform ios

# Android
bunx eas submit --platform android
```

## Useful Resources

### Official Docs

- [Expo Documentation](https://docs.expo.dev/)
- [React Native Docs](https://reactnative.dev/docs/getting-started)
- [Expo Router Docs](https://docs.expo.dev/router/introduction/)
- [NativeWind Docs](https://www.nativewind.dev/)

### Learning React Native

- [React Native Express](https://www.reactnative.express/) - Great tutorial
- [React Native Directory](https://reactnative.directory/) - Package directory

### Troubleshooting

- [Expo Forums](https://forums.expo.dev/)
- [React Native Discussions](https://github.com/facebook/react-native/discussions)

## Tips for React Developers

1. **Think in Components**: Same as React web - build small, reusable components

2. **Flexbox is Your Friend**: React Native uses Flexbox by default (no need to specify `display: flex`)

3. **No CSS Files**: Styles are either inline (StyleSheet) or via NativeWind classes

4. **Test on Real Devices**: Simulators are great, but test on actual phones when possible

5. **Performance Matters**: Mobile devices are slower - optimize early
   - Use `FlatList` for long lists (not `map`)
   - Avoid heavy computations in render
   - Use `useMemo` and `useCallback` liberally

6. **Platform Differences**: iOS and Android behave differently sometimes
   - Use `Platform.OS` to check: `Platform.OS === 'ios'`
   - Some components have platform-specific props

7. **Navigation**: Expo Router handles this - much simpler than React Router
   - Use `<Link href="/settings">` for navigation
   - Use `router.push('/settings')` programmatically

## Next Steps

1. Read through `app/index.tsx` to see a basic screen
2. Try modifying the UI and see hot reload in action
3. Explore the `@gold-dashboard/shared` package to see what's reusable
4. Check the migration plan for upcoming features: `.sessions/expo-turbo-migration-plan.md`

## Need Help?

- Check the main project README: `../../README.md`
- Review CLAUDE.md for project-specific guidelines: `../../CLAUDE.md`
- Ask in the team chat or open a GitHub issue

Happy mobile development! 🚀📱
