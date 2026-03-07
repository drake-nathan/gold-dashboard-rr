import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [tailwindcss(), tsconfigPaths()],
  test: {
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
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/.{idea,git,cache,output,temp}/**",
      "**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build,eslint,prettier}.config.*",
      "**/vitest-example/**", // Exclude browser mode tests from regular test runs
      "**/*.browser.test.{ts,tsx}", // Exclude browser mode tests
    ],
  },
});
