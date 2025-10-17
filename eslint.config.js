//@ts-check
import { eslintConfig } from "js-style-kit";

export default eslintConfig({
  convex: true,
  ignores: [".react-router"],
  react: {
    framework: "react-router",
  },
  typescript: "tsconfig.eslint.json",
});
