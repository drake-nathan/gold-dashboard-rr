import netlify from "@netlify/vite-plugin";
import netlifyReactRouter from "@netlify/vite-plugin-react-router";
import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import babel from "vite-plugin-babel";
import devtoolsJson from "vite-plugin-devtools-json";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    tailwindcss(),
    reactRouter(),
    tsconfigPaths(),
    netlifyReactRouter(),
    netlify(),
    babel({
      babelConfig: {
        plugins: [["babel-plugin-react-compiler", {}]],
        presets: ["@babel/preset-typescript"],
      },
      filter: /\.[jt]sx?$/,
    }),
    devtoolsJson(),
  ],
});
