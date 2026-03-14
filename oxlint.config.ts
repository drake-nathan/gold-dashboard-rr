import { defineConfig } from "oxlint";

export default defineConfig({
  categories: {
    correctness: "warn",
    // nursery: "warn",
    // pedantic: "warn",
    // perf: "warn",
    // restriction: "warn",
    // style: "warn",
    // suspicious: "warn",
  },
  options: {
    denyWarnings: true,
    // reportUnusedDisableDirectives: "warn",
    typeAware: true,
  },
  plugins: [
    "eslint",
    "import",
    "jsdoc",
    "jsx-a11y",
    "node",
    "oxc",
    "promise",
    "react",
    "react-perf",
    "typescript",
    "unicorn",
    "vitest",
  ],
});
