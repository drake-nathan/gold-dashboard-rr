import { Link } from "react-router";

import { AuthButtons } from "./auth-buttons";
import { ThemeToggle } from "./theme-toggle";

export const Header = () => {
  return (
    <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link
          className="group flex items-center gap-2 transition-opacity hover:opacity-80"
          to="/"
        >
          {/* Gold Bar Icon */}
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-linear-to-br from-yellow-400 via-yellow-500 to-yellow-600 shadow-md ring-1 ring-yellow-600/20 transition-transform group-hover:scale-105 dark:from-yellow-500 dark:via-yellow-600 dark:to-yellow-700">
            <svg
              className="h-6 w-6 text-yellow-950 dark:text-yellow-100"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect
                height="14"
                rx="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                width="18"
                x="3"
                y="5"
              />
              <path
                d="M7 9h10M7 12h10M7 15h10"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          {/* Brand Name */}
          <div className="flex flex-col">
            <span className="text-xl leading-none font-bold tracking-tight">
              Dashboard
              <span className="bg-gradient-to-r from-yellow-500 via-yellow-600 to-yellow-500 bg-clip-text text-transparent dark:from-yellow-400 dark:via-yellow-500 dark:to-yellow-400">
                .Gold
              </span>
            </span>
            <span className="text-[10px] leading-none text-muted-foreground">
              Precious Metals Price Tracker
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <AuthButtons />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
};
