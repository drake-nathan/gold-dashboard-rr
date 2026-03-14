import { defineConfig } from "oxfmt";

export default defineConfig({
  ignorePatterns: [".react-router", "convex/_generated"],
  sortImports: {},
  sortTailwindcss: {
    functions: ["clsx", "cn", "cva"],
    stylesheet: "app/app.css",
  },
  sortPackageJson: {
    sortScripts: true,
  },
});
