//@ts-check
import { eslintConfig } from "js-style-kit";

export default eslintConfig({
  ignores: [".react-router"],
  react: {
    framework: "vite",
    reactRefresh: false,
  },
  typescript: "tsconfig.eslint.json",
});
