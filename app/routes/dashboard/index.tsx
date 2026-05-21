import { api } from "convex/_generated/api";
import { preloadQuery } from "convex/nextjs";
import { usePreloadedQuery } from "convex/react";
import { useRouteError } from "react-router";

import { RouteErrorPage } from "@/components/ui/route-error-page";

import type { Route } from "./+types/index";
import { DashboardContent } from "./dashboard-content";
import { type DashboardStats } from "./types";

export type { DashboardMarketPrice, DashboardStats, ProductCardData } from "./types";

export const meta = () => {
  const title = "Dashboard.Gold - Precious Metals Price Comparison";
  const description =
    "Real-time price comparison for Costco gold and silver products vs Collect Pure bids. Calculate your profit with cashback rewards. Updated every 5 minutes.";
  const url = "https://gold-dashboard-rr-production.up.railway.app";
  const imageUrl = `${url}/og-image.png`;

  return [
    { title },
    { content: description, name: "description" },
    {
      content:
        "costco gold, costco silver, precious metals, gold price comparison, collect pure, gold arbitrage, costco bullion",
      name: "keywords",
    },
    { content: "website", property: "og:type" },
    { content: url, property: "og:url" },
    { content: title, property: "og:title" },
    { content: description, property: "og:description" },
    { content: imageUrl, property: "og:image" },
    { content: "1200", property: "og:image:width" },
    { content: "630", property: "og:image:height" },
    { content: "Dashboard.Gold", property: "og:site_name" },
    { content: "en_US", property: "og:locale" },
    { content: "summary_large_image", name: "twitter:card" },
    { content: url, name: "twitter:url" },
    { content: title, name: "twitter:title" },
    { content: description, name: "twitter:description" },
    { content: imageUrl, name: "twitter:image" },
    { content: "index, follow", name: "robots" },
    { content: "Dashboard.Gold", name: "author" },
    { content: "#D4AF37", name: "theme-color" },
  ];
};

export const loader = async () => {
  const convexUrl = process.env.VITE_CONVEX_URL;

  if (!convexUrl) {
    throw new Error("VITE_CONVEX_URL is not set");
  }

  const [preloadedSummary, preloadedProducts] = await Promise.all([
    preloadQuery(
      api.dashboard.getDashboardSummary,
      {},
      {
        url: convexUrl,
      },
    ),
    preloadQuery(
      api.dashboard.getDashboardProducts,
      {},
      {
        url: convexUrl,
      },
    ),
  ]);

  return { preloadedProducts, preloadedSummary };
};

const Home = ({ loaderData }: Route.ComponentProps) => {
  const summary = usePreloadedQuery(loaderData.preloadedSummary);
  const products = usePreloadedQuery(loaderData.preloadedProducts);

  // oxlint-disable-next-line typescript/no-unnecessary-condition -- defense-in-depth: keep a user-facing fallback if preloaded route data is unexpectedly missing at runtime
  if (!summary || !products) {
    return (
      <main className="flex flex-1 items-center justify-center px-4 py-8">
        <div className="text-center">
          <div className="text-lg font-medium">Error</div>
          <div className="text-sm text-muted-foreground">
            We&apos;re having an issue connecting to our database, please try again later.
          </div>
        </div>
      </main>
    );
  }

  const stats: DashboardStats = {
    ...summary,
    goldProducts: {
      ...summary.goldProducts,
      productsByPureSpread: products.goldProducts,
    },
    silverProducts: {
      ...summary.silverProducts,
      productsByPureSpread: products.silverProducts,
    },
  };

  return <DashboardContent stats={stats} />;
};

export default Home;

export const ErrorBoundary = () => {
  const error = useRouteError();

  return (
    <RouteErrorPage
      description="An error occurred while loading the dashboard. This could be due to a network issue or a problem with the data."
      error={error}
      showStack
      title="Something went wrong"
    />
  );
};
