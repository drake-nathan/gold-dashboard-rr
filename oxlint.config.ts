import { defineConfig } from "oxlint";

export default defineConfig({
  categories: {
    correctness: "warn",
    // nursery: "warn",
    // pedantic: "warn",
    // perf: "warn",
    // restriction: "warn",
    // style: "warn",
    suspicious: "warn",
  },
  ignorePatterns: ["convex/_generated"],
  options: {
    denyWarnings: true,
    reportUnusedDisableDirectives: "warn",
    typeAware: true,
  },
  overrides: [
    {
      files: ["**/*.test.{ts,tsx}", "**/*.convex.test.{ts,tsx}"],
      rules: {
        "jsdoc/check-tag-names": "off",
        "typescript/unbound-method": "off",
      },
    },
  ],
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
  rules: {
    "jest/no-conditional-expect": "off",
    "jest/require-to-throw-message": "off",
    "react/react-in-jsx-scope": "off",
  },
  settings: {
    react: {
      version: "19",
    },
  },
});
