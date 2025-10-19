import { ConvexProvider as ConvexProviderBase, ConvexReactClient } from "convex/react";

export const ConvexProvider = ({ children }: { children: React.ReactNode }) => {
  const url = import.meta.env.VITE_CONVEX_URL;
  
  if (!url) {
    throw new Error("VITE_CONVEX_URL environment variable is not set");
  }

  const convex = new ConvexReactClient(url);

  return <ConvexProviderBase client={convex}>{children}</ConvexProviderBase>;
};
