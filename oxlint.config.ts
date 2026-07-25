import { defineConfig } from "oxlint";

export default defineConfig({
  categories: {
    correctness: "warn",
    nursery: "warn",
    pedantic: "warn",
    perf: "warn",
    style: "warn",
    suspicious: "warn",
  },
  ignorePatterns: ["convex/_generated", "env.d.ts"],
  jsPlugins: ["eslint-plugin-perfectionist"],
  options: {
    denyWarnings: true,
    reportUnusedDisableDirectives: "warn",
    typeAware: true,
  },
  overrides: [
    {
      files: ["**/*.test.{ts,tsx}", "**/*.browser.test.{ts,tsx}", "**/*.convex.test.{ts,tsx}"],
      rules: {
        "eslint/no-loop-func": "off",
        // We use vitest, not jest. oxlint bundles both rulesets and many rules
        // fire from both plugins simultaneously — including some with autofixes
        // that don't see each other's edits (see prefer-expect-assertions).
        // Disable every jest/* rule that has a vitest counterpart, plus
        // jest-only rules that don't apply to vitest.
        "jest/max-expects": "off",
        "jest/no-conditional-in-test": "off",
        "jest/no-done-callback": "off", // vitest has no done callback
        "jest/no-hooks": "off",
        "jest/no-untyped-mock-factory": "off",
        "jest/prefer-called-with": "off",
        "jest/prefer-ending-with-an-expect": "off",
        "jest/prefer-expect-assertions": "off",
        "jest/prefer-hooks-in-order": "off",
        "jest/prefer-spy-on": "off",
        "jest/prefer-strict-equal": "off",
        "jest/require-hook": "off",
        "jest/require-top-level-describe": "off",
        "jsdoc/check-tag-names": "off",
        "typescript/consistent-return": "off",
        "typescript/no-unsafe-return": "off",
        "typescript/strict-void-return": "off",
        "typescript/unbound-method": "off",
        "unicorn/consistent-function-scoping": "off",
        // Inline fixture construction (e.g. Object.assign(new Error(...), {...}))
        // reads better nested than split across named temporaries.
        "unicorn/max-nested-calls": "off",
        "vitest/max-expects": "off",
        "vitest/no-conditional-expect": "off",
        "vitest/no-conditional-in-test": "off",
        // Project convention (see .claude/rules/testing.md): simple test() calls,
        // not describe/it. So disable describe/hooks-shaped rules.
        "vitest/no-hooks": "off",
        // Aggressive autofix rewrites `toHaveBeenCalled()` → `toHaveBeenCalledWith()`
        // (no args), which silently flips the assertion to "called with zero args".
        "vitest/prefer-called-with": "off",
        // Conflicts with vitest's `({ expect }) => ...` fixture pattern — the
        // rule misreads it as shadowing.
        "vitest/prefer-expect-assertions": "off",
        "vitest/require-mock-type-parameters": "off",
        "vitest/require-top-level-describe": "off",
      },
    },
    {
      // Pre-existing react-compiler violations, baselined so the rule stays
      // deny-level for all other files (new violations still fail CI).
      // Tracked in TASKS.md — remove each entry as its file is fixed.
      //
      // - root.tsx: false positive. `useAuth={useAuth}` is the required public
      //   API of ConvexProviderWithClerk; the hook must be passed, not called.
      // - use-dashboard-filters.ts: real "state mirrors a prop" antipattern,
      //   folded into the dashboard-filter-url-state task.
      // - use-subscription.ts: refs-during-render in payment logic; needs its
      //   own task, not a drive-by refactor.
      files: [
        "app/root.tsx",
        "app/routes/dashboard/hooks/use-dashboard-filters.ts",
        "app/features/subscription/hooks/use-subscription.ts",
        "app/features/observability/observability-sync.tsx",
        "app/components/feature-announcement-modal.tsx",
      ],
      rules: {
        "react/react-compiler": "off",
      },
    },
    {
      files: ["convex/**"],
      rules: {
        // Convex validators compose by design — v.optional(v.union(v.literal(...)))
        // is the idiomatic spelling and can't be flattened without hurting
        // readability. Accounted for ~198 of the 199 hits repo-wide.
        "unicorn/max-nested-calls": "off",
      },
    },
    {
      files: ["scripts/**"],
      rules: {
        "eslint/no-console": "off",
        // One-shot CLI scripts, not request-path code — sync fs is the clearer
        // choice and there is no event loop to block.
        "node/no-sync": "off",
      },
    },
    {
      files: ["app/components/ui/input-group.tsx"],
      rules: {
        "jsx-a11y/no-noninteractive-element-interactions": "off",
      },
    },
    {
      files: [
        "app/routes/**",
        "app/root.tsx",
        "app/entry.*.tsx",
        "app/providers/**",
        "app/components/ui/**",
      ],
      rules: {
        "react/only-export-components": "off",
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
    "eslint/arrow-body-style": "off",
    "eslint/capitalized-comments": "off",
    "eslint/curly": "off",
    "eslint/id-length": "off",
    "eslint/init-declarations": "off",
    "eslint/max-depth": "off",
    "eslint/max-lines": "off",
    "eslint/max-lines-per-function": "off",
    "eslint/max-params": "off",
    "eslint/max-statements": "off",
    "eslint/no-await-in-loop": "off",
    "eslint/no-console": ["warn", { allow: ["error", "info", "warn"] }],
    "eslint/no-continue": "off",
    "eslint/no-inline-comments": "off",
    "eslint/no-magic-numbers": "off",
    "eslint/no-negated-condition": "off",
    "eslint/no-nested-ternary": "off",
    "eslint/no-ternary": "off",
    "eslint/no-undef": "off",
    "eslint/no-underscore-dangle": [
      "warn",
      { allow: ["_id", "_creationTime", "_storageId", "__serialized__"] },
    ],
    "eslint/no-warning-comments": "off",
    "eslint/prefer-destructuring": "off",
    "eslint/require-await": "off",
    "eslint/sort-imports": "off",
    "eslint/sort-keys": "off",
    "import/consistent-type-specifier-style": "off",
    "import/exports-last": "off",
    "import/group-exports": "off",
    "import/max-dependencies": "off",
    "import/no-named-export": "off",
    "import/no-namespace": "off",
    "import/no-nodejs-modules": "off",
    "import/no-unassigned-import": "off",
    "import/prefer-default-export": "off",
    "jest/no-conditional-expect": "off",
    "jest/require-hook": "off",
    "jest/require-to-throw-message": "off",
    "jsdoc/require-param": "off",
    "jsdoc/require-param-type": "off",
    "jsdoc/require-returns": "off",
    "jsdoc/require-returns-type": "off",
    "jsx-a11y/anchor-ambiguous-text": "warn",
    "jsx-a11y/prefer-tag-over-role": "off",
    "perfectionist/sort-array-includes": ["warn", { order: "asc", type: "natural" }],
    "perfectionist/sort-decorators": ["warn", { order: "asc", type: "natural" }],
    "perfectionist/sort-enums": ["warn", { order: "asc", type: "natural" }],
    "perfectionist/sort-export-attributes": ["warn", { order: "asc", type: "natural" }],
    "perfectionist/sort-exports": ["warn", { order: "asc", type: "natural" }],
    "perfectionist/sort-heritage-clauses": ["warn", { order: "asc", type: "natural" }],
    "perfectionist/sort-import-attributes": ["warn", { order: "asc", type: "natural" }],
    "perfectionist/sort-interfaces": ["warn", { order: "asc", type: "natural" }],
    "perfectionist/sort-intersection-types": ["warn", { order: "asc", type: "natural" }],
    "perfectionist/sort-jsx-props": ["warn", { order: "asc", type: "natural" }],
    "perfectionist/sort-maps": ["warn", { order: "asc", type: "natural" }],
    "perfectionist/sort-named-exports": ["warn", { order: "asc", type: "natural" }],
    "perfectionist/sort-object-types": ["warn", { order: "asc", type: "natural" }],
    "perfectionist/sort-objects": ["warn", { order: "asc", type: "natural" }],
    "perfectionist/sort-sets": ["warn", { order: "asc", type: "natural" }],
    "perfectionist/sort-switch-case": ["warn", { order: "asc", type: "natural" }],
    "perfectionist/sort-union-types": ["warn", { order: "asc", type: "natural" }],
    "perfectionist/sort-variable-declarations": ["warn", { order: "asc", type: "natural" }],
    "promise/avoid-new": "off",
    "promise/prefer-await-to-callbacks": "off",
    "promise/prefer-await-to-then": "off",
    "react/jsx-handler-names": "off",
    "react/jsx-max-depth": "off",
    "react/jsx-no-constructed-context-values": "off",
    "react/jsx-props-no-spreading": "off",
    "react/no-set-state": "off",
    "react/only-export-components": "warn",
    "react/react-in-jsx-scope": "off",
    "typescript/no-explicit-any": "warn",
    "typescript/no-unsafe-assignment": "off",
    "typescript/no-unsafe-member-access": "off",
    "typescript/no-unsafe-type-assertion": "off",
    "typescript/prefer-readonly-parameter-types": "off",
    "typescript/strict-boolean-expressions": "off",
    "typescript/switch-exhaustiveness-check": "off",
    "unicorn/filename-case": "off",
    "unicorn/no-array-callback-reference": "off",
    "unicorn/no-array-for-each": "warn",
    "unicorn/no-await-expression-member": "off",
    "unicorn/no-negated-condition": "off",
    "unicorn/no-nested-ternary": "off",
    "unicorn/no-null": "off",
    "unicorn/no-useless-undefined": "off",
    "unicorn/prefer-global-this": "off",
    "unicorn/prefer-number-properties": "warn",
    "unicorn/prefer-ternary": "off",
    "unicorn/prefer-top-level-await": "off",
    "vitest/no-importing-vitest-globals": "off",
    "vitest/prefer-called-once": "off",
    "vitest/prefer-called-times": "off",
    "vitest/prefer-import-in-mock": "off",
    "vitest/prefer-strict-boolean-matchers": "off",
    "vitest/require-hook": "off",
    "vitest/require-to-throw-message": "off",
  },
  settings: {
    react: {
      version: "19",
    },
  },
});
