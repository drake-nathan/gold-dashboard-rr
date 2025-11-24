import "../global.css";
import { Stack } from "expo-router";
import { PostHogProvider } from "../src/providers/PostHogProvider";
import { ConvexProvider } from "../src/providers/ConvexProvider";

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
