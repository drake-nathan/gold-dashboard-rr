//@ts-check
import { eslintConfig } from "js-style-kit";

export default eslintConfig({
  convex: true,
  react: {
    framework: "react-router",
  },
  rules: {
    "vitest/require-top-level-describe": "off",
  },
  testing: {
    framework: "vitest",
    itOrTest: "test",
  },
  typescript: "tsconfig.eslint.json",
});
