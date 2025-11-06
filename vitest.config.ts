import { defineConfig, mergeConfig } from "vitest/config";

import viteConfig from "./vite.config";

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
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
  }),
);
