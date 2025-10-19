import { ConvexProvider } from "./convex-provider";
import { ThemeProvider } from "./theme-provider";

export const Providers = ({ children }: { children: React.ReactNode }) => {
  return (
    <ConvexProvider>
      <ThemeProvider>{children}</ThemeProvider>
    </ConvexProvider>
  );
};
