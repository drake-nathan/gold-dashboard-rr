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
      // https://vitest.dev/guide/browser/playwright
      instances: [{ browser: "chromium" }],
      provider: playwright(),
    },
    include: ["app/**/*.browser.test.{ts,tsx}"],
  },
});
