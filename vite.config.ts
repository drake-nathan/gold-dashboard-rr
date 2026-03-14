import { reactRouter } from "@react-router/dev/vite";
import { sentryReactRouter } from "@sentry/react-router";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import babel from "vite-plugin-babel";
import devtoolsJson from "vite-plugin-devtools-json";
export default defineConfig((config) => ({
  optimizeDeps: {
    exclude: ["@sentry/react-router"],
  },

  plugins: [
    tailwindcss(),
    reactRouter(),
    babel({
      babelConfig: {
        plugins: [["babel-plugin-react-compiler", {}]],
        presets: ["@babel/preset-typescript"],
      },
      filter: /\.[jt]sx?$/,
    }),
    devtoolsJson(),
    sentryReactRouter(
      {
        authToken: process.env.SENTRY_AUTH_TOKEN,
        org: process.env.SENTRY_ORG,
        project: process.env.SENTRY_PROJECT,
      },
      config,
    ),
  ],

  resolve: {
    tsconfigPaths: true,
  },

  ssr: {
    noExternal: ["posthog-js/react"],
  },
}));
