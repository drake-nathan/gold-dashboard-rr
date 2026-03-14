import { defineConfig } from "oxlint";

export default defineConfig({
  categories: {
    correctness: "warn",
    // nursery: "warn",
    // pedantic: "warn",
    perf: "warn",
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
        "unicorn/consistent-function-scoping": "off",
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
    "typescript",
    "unicorn",
    "vitest",
  ],
  rules: {
    "eslint/no-await-in-loop": "off",
    "jest/no-conditional-expect": "off",
    "jest/require-to-throw-message": "off",
    "react/jsx-no-constructed-context-values": "off",
    "react/react-in-jsx-scope": "off",
    "import/no-unassigned-import": "off",
    "typescript/no-unsafe-type-assertion": "off",
  },
  settings: {
    react: {
      version: "19",
    },
  },
});
