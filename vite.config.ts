import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import babel from "vite-plugin-babel";
import devtoolsJson from "vite-plugin-devtools-json";

export default defineConfig(() => ({
  plugins: [
    tailwindcss(),
    reactRouter(),
    babel({
      babelConfig: {
        plugins: [["babel-plugin-react-compiler", {}]],
        presets: ["@babel/preset-typescript"],
      },
      filter: /\.[jt]sx?$/u,
    }),
    devtoolsJson(),
  ],

  resolve: {
    tsconfigPaths: true,
  },

  ssr: {
    noExternal: ["posthog-js/react"],
  },
}));
