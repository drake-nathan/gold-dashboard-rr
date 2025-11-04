import { api } from "convex/_generated/api";
import { preloadQuery } from "convex/nextjs";
import { usePreloadedQuery } from "convex/react";
import { AlertTriangle, Home as HomeIcon, RefreshCw } from "lucide-react";
import { isRouteErrorResponse, Link, useRouteError } from "react-router";

import { Dashboard } from "@/components/dashboard";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import type { Route } from "./+types/dashboard";

export const meta = () => {
  const title = "Dashboard.Gold - Live Costco vs Collect Pure Price Comparison";
  const description =
    "Real-time price comparison for Costco gold and silver products vs Collect Pure bids. Calculate your profit with cashback rewards. Updated every 5 minutes.";
  const url = "https://gold-dashboard-rr-production.up.railway.app"; // TODO: Replace with your actual domain
  const imageUrl = `${url}/og-image.png`; // TODO: Create OG image

  return [
    // Basic meta tags
    { title },
    { content: description, name: "description" },
    {
      content:
        "costco gold, costco silver, precious metals, gold price comparison, collect pure, gold arbitrage, costco bullion",
      name: "keywords",
    },

    // Open Graph (Facebook, LinkedIn, etc.)
    { content: "website", property: "og:type" },
    { content: url, property: "og:url" },
    { content: title, property: "og:title" },
    { content: description, property: "og:description" },
    { content: imageUrl, property: "og:image" },
    { content: "1200", property: "og:image:width" },
    { content: "630", property: "og:image:height" },
    { content: "Dashboard.Gold", property: "og:site_name" },
    { content: "en_US", property: "og:locale" },

    // Twitter Card
    { content: "summary_large_image", name: "twitter:card" },
    { content: url, name: "twitter:url" },
    { content: title, name: "twitter:title" },
    { content: description, name: "twitter:description" },
    { content: imageUrl, name: "twitter:image" },

    // Additional SEO
    { content: "index, follow", name: "robots" },
    { content: "Dashboard.Gold", name: "author" },
    { content: "#D4AF37", name: "theme-color" }, // Gold color
  ];
};

export const loader = async () => {
  const convexUrl = process.env.VITE_CONVEX_URL;

  if (!convexUrl) {
    throw new Error("VITE_CONVEX_URL is not set");
  }

  // Use Convex's preloadQuery - this creates a payload that includes both the data
  // and the query metadata needed for client-side subscription
  const preloadedStats = await preloadQuery(
    api.dashboard.getStats,
    {},
    {
      url: convexUrl,
    },
  );

  return { preloadedStats };
};

const Home = ({ loaderData }: Route.ComponentProps) => {
  const stats = usePreloadedQuery(loaderData.preloadedStats);
  // const stats = useQuery(api.dashboard.getStats);

  // Check if there's actually no data
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!stats) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-medium">Error</div>
          <div className="text-sm text-muted-foreground">
            We&apos;re having an issue connecting to our database, please try
            again later.
          </div>
        </div>
      </div>
    );
  }

  return <Dashboard stats={stats} />;
};

export default Home;

/**
 * Route-level error boundary for handling loader and rendering errors.
 * This catches errors that occur during data loading or page rendering.
 */
export const ErrorBoundary = () => {
  const error = useRouteError();

  // Handle different types of errors
  if (isRouteErrorResponse(error)) {
    // HTTP errors (404, 500, etc.)
    return (
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
              : "An error occurred while loading this page."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error.data ?
              <div className="rounded-md bg-muted p-4">
                <p className="text-sm text-muted-foreground">
                  {String(error.data)}
                </p>
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
    );
  }

  // JavaScript errors (data loading failures, rendering errors, etc.)
  const isError = error instanceof Error;
  const errorMessage = isError ? error.message : "An unexpected error occurred";
  const errorStack = isError ? error.stack : undefined;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md border-destructive/50 bg-destructive/10">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <CardTitle className="text-destructive">
              Something went wrong
            </CardTitle>
          </div>
          <CardDescription>
            An error occurred while loading the dashboard. This could be due to
            a network issue or a problem with the data.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md bg-muted p-4">
            <p className="mb-2 text-sm font-medium">Error details:</p>
            <p className="font-mono text-xs text-muted-foreground">
              {errorMessage}
            </p>
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
  );
};
