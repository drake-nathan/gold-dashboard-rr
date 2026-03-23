import react from "@vitejs/plugin-react";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

export default defineConfig({
  optimizeDeps: {
    include: [
      "@radix-ui/react-dialog",
      "@radix-ui/react-popover",
      "@radix-ui/react-select",
      "@radix-ui/react-switch",
      "cmdk",
    ],
  },
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    browser: {
      enabled: true,
      headless: true, // Run in headless mode for CI/CD
      // https://vitest.dev/guide/browser/playwright
      instances: [{ browser: "chromium" }],
      provider: playwright(),
    },
    coverage: {
      exclude: [
        "**/*.test.{ts,tsx}",
        "**/*.browser.test.{ts,tsx}",
        "**/types.ts",
        "**/*.d.ts",
        "**/env.*.ts",
        "**/providers/**",
        "**/routes/**",
        "**/root.tsx",
      ],
      include: ["app/**/*.{ts,tsx}"],
      provider: "v8",
      reporter: ["text", "json", "html"],
    },
    include: ["app/**/*.browser.test.{ts,tsx}"],
  },
});
