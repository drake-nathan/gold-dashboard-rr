import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import babel from "vite-plugin-babel";
import tsconfigPaths from "vite-tsconfig-paths";

// Import server env to validate at build time
// import "./app/env.server";

export default defineConfig({
  plugins: [
    tailwindcss(),
    reactRouter(),
    tsconfigPaths(),
    babel({
      babelConfig: {
        plugins: [["babel-plugin-react-compiler", {}]],
        presets: ["@babel/preset-typescript"],
      },
      filter: /\.[jt]sx?$/,
    }),
  ],
});
