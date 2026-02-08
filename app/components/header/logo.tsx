import { Link } from "react-router";

export const Logo = () => {
  return (
    <Link
      className="group flex items-center gap-2 transition-opacity hover:opacity-80"
      to="/"
    >
      {/* Gold Bar Icon */}
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-yellow-400 via-yellow-500 to-yellow-600 shadow-md ring-1 ring-yellow-600/20 transition-transform group-hover:scale-105 sm:h-10 sm:w-10 dark:from-yellow-500 dark:via-yellow-600 dark:to-yellow-700">
        <svg
          className="h-5 w-5 text-yellow-950 sm:h-6 sm:w-6 dark:text-yellow-100"
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
        <span className="text-lg leading-none font-bold tracking-tight sm:text-xl">
          Dashboard
          <span className="bg-linear-to-r from-yellow-500 via-yellow-600 to-yellow-500 bg-clip-text text-transparent dark:from-yellow-400 dark:via-yellow-500 dark:to-yellow-400">
            .Gold
          </span>
        </span>
        <span className="hidden text-[10px] leading-none text-muted-foreground sm:block">
          Precious Metals Price Tracker
        </span>
      </div>
    </Link>
  );
};
