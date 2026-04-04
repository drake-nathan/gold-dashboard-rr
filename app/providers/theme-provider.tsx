"use client";

import { createContext, useContext, useEffect } from "react";
import { useLocalStorage } from "usehooks-ts";
import * as z from "zod";

const themeSchema = z.enum(["dark", "light", "system"]);

type Theme = z.infer<typeof themeSchema>;

export const THEME_STORAGE_KEY = "gold-dashboard-theme";

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}

interface ThemeProviderState {
  setTheme: (theme: Theme) => void;
  theme: Theme;
}

const initialState: ThemeProviderState = {
  setTheme: () => {},
  theme: "system",
};

const ThemeProviderContext = createContext(initialState);

export const ThemeProvider = ({
  children,
  defaultTheme = "system",
  storageKey = THEME_STORAGE_KEY,
  ...props
}: ThemeProviderProps) => {
  const [theme, setTheme] = useLocalStorage<Theme>(storageKey, defaultTheme, {
    deserializer: (value: string): Theme => {
      const result = themeSchema.safeParse(value);
      return result.success ? result.data : defaultTheme;
    },
    // Defer localStorage read until after hydration to prevent SSR mismatch
    initializeWithValue: false,
    serializer: (value: Theme): string => value,
  });

  useEffect(() => {
    const root = window.document.documentElement;

    root.classList.remove("light", "dark");

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";

      root.classList.add(systemTheme);

      // Listen for system theme changes
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handleChange = (e: MediaQueryListEvent) => {
        root.classList.remove("light", "dark");
        root.classList.add(e.matches ? "dark" : "light");
      };

      mediaQuery.addEventListener("change", handleChange);

      return () => {
        mediaQuery.removeEventListener("change", handleChange);
      };
    }

    root.classList.add(theme);
    return undefined;
  }, [theme]);

  const value = {
    setTheme,
    theme,
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeProviderContext);
