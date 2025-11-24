import { ConvexProvider as BaseConvexProvider } from "convex/react";
import { ConvexReactClient } from "convex/react";
import type { ReactNode } from "react";

const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!, {
  unsavedChangesWarning: false, // Mobile doesn't need this
});

export function ConvexProvider({ children }: { children: ReactNode }) {
  return <BaseConvexProvider client={convex}>{children}</BaseConvexProvider>;
}
