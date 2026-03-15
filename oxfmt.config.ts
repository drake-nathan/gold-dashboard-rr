import { defineConfig } from "oxfmt";

export default defineConfig({
  ignorePatterns: [".react-router", "convex/_generated"],
  sortImports: {},
  sortPackageJson: {
    sortScripts: true,
  },
  sortTailwindcss: {
    functions: ["clsx", "cn", "cva"],
    stylesheet: "app/app.css",
  },
});
