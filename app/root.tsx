import { ClerkProvider, useAuth } from "@clerk/react-router";
import { clerkMiddleware, rootAuthLoader } from "@clerk/react-router/server";
import { shadcn } from "@clerk/themes";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { PostHogProvider } from "posthog-js/react";

import "./app.css";

import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";

import type { Route } from "./+types/root";

import { AdSense } from "./components/adsense";
import { THEME_STORAGE_KEY, ThemeProvider } from "./providers/theme-provider";

export const links: Route.LinksFunction = () => [
  // Favicon
  { href: "/favicon.ico", rel: "icon", sizes: "any" },
  { href: "/favicon.svg", rel: "icon", type: "image/svg+xml" },
  { href: "/apple-touch-icon.png", rel: "apple-touch-icon" },
  { href: "/manifest.json", rel: "manifest" },

  // Fonts
  { href: "https://fonts.googleapis.com", rel: "preconnect" },
  {
    crossOrigin: "anonymous",
    href: "https://fonts.gstatic.com",
    rel: "preconnect",
  },
  {
    href: "https://fonts.googleapis.com/css2?family=Fira+Code:wght@300..700&family=Outfit:wght@100..900&display=swap",
    rel: "stylesheet",
  },
];

export const middleware = [clerkMiddleware()];

export const loader = rootAuthLoader;

export const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta content="width=device-width, initial-scale=1" name="viewport" />
        <Meta />
        <Links />
        <AdSense />
        {/* Prevent flash of wrong theme by applying theme before page renders */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const storageKey = '${THEME_STORAGE_KEY}';
                const theme = localStorage.getItem(storageKey);
                const root = document.documentElement;

                if (theme === 'dark' || theme === 'light') {
                  root.classList.add(theme);
                } else {
                  // theme is 'system' or not set
                  const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                  root.classList.add(systemTheme);
                }
              })();
            `,
          }}
        />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
};

const App = ({ loaderData }: Route.ComponentProps) => {
  const convexUrl = import.meta.env.VITE_CONVEX_URL;
  const clerkApiKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
  const posthogKey = import.meta.env.VITE_PUBLIC_POSTHOG_KEY;
  const posthogHost = import.meta.env.VITE_PUBLIC_POSTHOG_HOST;

  if (!convexUrl) {
    throw new Error("VITE_CONVEX_URL environment variable is not set");
  }

  if (!clerkApiKey) {
    throw new Error(
      "VITE_CLERK_PUBLISHABLE_KEY environment variable is not set",
    );
  }

  if (!posthogKey || !posthogHost) {
    throw new Error(
      "VITE_PUBLIC_POSTHOG_KEY or VITE_PUBLIC_POSTHOG_HOST environment variable is not set",
    );
  }

  const convex = new ConvexReactClient(convexUrl);

  return (
    <PostHogProvider
      apiKey={posthogKey}
      options={{
        api_host: posthogHost,
        capture_exceptions: true,
        debug: import.meta.env.MODE === "development",
        defaults: "2025-05-24",
      }}
    >
      <ClerkProvider
        appearance={{ baseTheme: shadcn }}
        loaderData={loaderData}
        publishableKey={clerkApiKey}
      >
        <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
          <Outlet />
        </ConvexProviderWithClerk>
      </ClerkProvider>
    </PostHogProvider>
  );
};

export default App;

export const ErrorBoundary = ({ error }: Route.ErrorBoundaryProps) => {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404 ?
        "The requested page could not be found."
      : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="container mx-auto p-4 pt-16">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack ?
        <pre className="w-full overflow-x-auto p-4">
          <code>{stack}</code>
        </pre>
      : null}
    </main>
  );
};
