import react from "@vitejs/plugin-react";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // @ts-expect-error - Vite plugin types conflict between vitest's bundled Vite and project Vite version
  plugins: [react()],
  test: {
    browser: {
      enabled: true,
      // https://vitest.dev/guide/browser/playwright
      instances: [{ browser: "chromium" }],
      provider: playwright(),
    },
  },
});
