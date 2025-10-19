"use client";

import {
  ConvexProvider as ConvexProviderBase,
  ConvexReactClient,
} from "convex/react";
import { useMemo } from "react";

export const ConvexProvider = ({ children }: { children: React.ReactNode }) => {
  const url = import.meta.env.VITE_CONVEX_URL;

  if (!url) {
    throw new Error("VITE_CONVEX_URL environment variable is not set");
  }

  const convex = useMemo(() => new ConvexReactClient(url), [url]);

  return <ConvexProviderBase client={convex}>{children}</ConvexProviderBase>;
};
