import { PostHogProvider as BasePostHogProvider } from "posthog-react-native";
import type { ReactNode } from "react";

export function PostHogProvider({ children }: { children: ReactNode }) {
  const apiKey = process.env.EXPO_PUBLIC_POSTHOG_KEY;
  const host = process.env.EXPO_PUBLIC_POSTHOG_HOST;

  if (!apiKey || !host) {
    console.warn("PostHog not configured - analytics disabled");
    return <>{children}</>;
  }

  return (
    <BasePostHogProvider apiKey={apiKey} options={{ host }}>
      {children}
    </BasePostHogProvider>
  );
}
