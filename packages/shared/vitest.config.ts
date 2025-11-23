import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
  },
  resolve: {
    alias: {
      "convex/_generated/api": "../convex-backend/convex/_generated/api",
      "convex/_generated/dataModel":
        "../convex-backend/convex/_generated/dataModel",
    },
  },
});
