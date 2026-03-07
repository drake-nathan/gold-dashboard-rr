import { ClerkProvider, useAuth } from "@clerk/react-router";
import { clerkMiddleware, rootAuthLoader } from "@clerk/react-router/server";
import { shadcn } from "@clerk/ui/themes";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { AlertTriangle, Home as HomeIcon, RefreshCw } from "lucide-react";
import { PostHogProvider } from "posthog-js/react";

import "./app.css";

import {
  isRouteErrorResponse,
  Link,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";

import type { Route } from "./+types/root";

import { Button } from "./components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card";
import { Toaster } from "./components/ui/sonner";
import { THEME_STORAGE_KEY, ThemeProvider } from "./providers/theme-provider";

export const links: Route.LinksFunction = () => [
  // Favicon
  { href: "/favicon.ico", rel: "icon", sizes: "48x48" },
  { href: "/favicon.svg", rel: "icon", type: "image/svg+xml" },
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
        <ThemeProvider>
          {children}
          <Toaster />
        </ThemeProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
};

// Validate env vars at module scope (fails fast during SSR bootstrap)
const convexUrl = import.meta.env.VITE_CONVEX_URL;
const clerkApiKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const posthogKey = import.meta.env.VITE_PUBLIC_POSTHOG_KEY;
const posthogHost = import.meta.env.VITE_PUBLIC_POSTHOG_HOST;

if (!convexUrl) {
  throw new Error("VITE_CONVEX_URL environment variable is not set");
}
if (!clerkApiKey) {
  throw new Error("VITE_CLERK_PUBLISHABLE_KEY environment variable is not set");
}
if (!posthogKey || !posthogHost) {
  throw new Error(
    "VITE_PUBLIC_POSTHOG_KEY or VITE_PUBLIC_POSTHOG_HOST environment variable is not set",
  );
}

// Singleton — keeps Convex WebSocket alive and query cache warm across navigations
const convex = new ConvexReactClient(convexUrl);

const App = ({ loaderData }: Route.ComponentProps) => {
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
        appearance={{ theme: shadcn }}
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

/**
 * Root-level error boundary for handling application-wide errors.
 * This catches errors that occur at the app level, including env var issues,
 * provider failures, and unhandled errors not caught by route-level boundaries.
 */
export const ErrorBoundary = ({ error }: Route.ErrorBoundaryProps) => {
  // Handle different types of errors
  if (isRouteErrorResponse(error)) {
    // HTTP errors (404, 500, etc.)
    return (
      <html lang="en">
        <head>
          <meta charSet="utf-8" />
          <meta content="width=device-width, initial-scale=1" name="viewport" />
          <Meta />
          <Links />
        </head>
        <body>
          <ThemeProvider>
            <div className="flex min-h-screen items-center justify-center bg-background px-4">
              <Card className="w-full max-w-md border-destructive/50 bg-destructive/10">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    <CardTitle className="text-destructive">
                      {error.status} {error.statusText}
                    </CardTitle>
                  </div>
                  <CardDescription>
                    {error.status === 404 ?
                      "The page you're looking for doesn't exist."
                    : "An error occurred while loading the application."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {error.data ?
                    <div className="rounded-md bg-muted p-4">
                      <p className="text-sm text-muted-foreground">{String(error.data)}</p>
                    </div>
                  : null}
                  <div className="flex gap-2">
                    <Button asChild size="sm" variant="outline">
                      <Link to="/">
                        <HomeIcon className="mr-2 h-4 w-4" />
                        Go Home
                      </Link>
                    </Button>
                    <Button
                      onClick={() => {
                        window.location.reload();
                      }}
                      size="sm"
                      variant="outline"
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Refresh
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </ThemeProvider>
          <Scripts />
        </body>
      </html>
    );
  }

  // JavaScript errors (env vars, provider setup, etc.)
  const isError = error instanceof Error;
  const errorMessage = isError ? error.message : "An unexpected error occurred";
  const errorStack = isError ? error.stack : undefined;

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta content="width=device-width, initial-scale=1" name="viewport" />
        <Meta />
        <Links />
      </head>
      <body>
        <ThemeProvider>
          <div className="flex min-h-screen items-center justify-center bg-background px-4">
            <Card className="w-full max-w-md border-destructive/50 bg-destructive/10">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  <CardTitle className="text-destructive">Application Error</CardTitle>
                </div>
                <CardDescription>
                  An error occurred while initializing the application. This is typically caused by
                  a configuration issue.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-md bg-muted p-4">
                  <p className="mb-2 text-sm font-medium">Error details:</p>
                  <p className="font-mono text-xs text-muted-foreground">{errorMessage}</p>
                  {import.meta.env.MODE === "development" && errorStack ?
                    <details className="mt-2">
                      <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                        Stack trace
                      </summary>
                      <pre className="mt-2 overflow-x-auto text-xs text-muted-foreground">
                        {errorStack}
                      </pre>
                    </details>
                  : null}
                </div>
                <div className="flex gap-2">
                  <Button asChild size="sm" variant="outline">
                    <Link to="/">
                      <HomeIcon className="mr-2 h-4 w-4" />
                      Go Home
                    </Link>
                  </Button>
                  <Button
                    onClick={() => {
                      window.location.reload();
                    }}
                    size="sm"
                    variant="outline"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Refresh
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </ThemeProvider>
        <Scripts />
      </body>
    </html>
  );
};
