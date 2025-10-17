import { unstable_reactRouterRSC as reactRouterRSC } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import rsc from "@vitejs/plugin-rsc";
import { defineConfig } from "vite";
import babel from "vite-plugin-babel";
import tsconfigPaths from "vite-tsconfig-paths";

const ReactCompilerConfig = {};

export default defineConfig({
  plugins: [
    tailwindcss(),
    reactRouterRSC(),
    rsc(),
    tsconfigPaths(),
    babel({
      babelConfig: {
        plugins: [["babel-plugin-react-compiler", ReactCompilerConfig]],
        presets: ["@babel/preset-typescript"],
      },
      filter: /\.[jt]sx?$/,
    }),
  ],
});
