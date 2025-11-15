import { Link } from "react-router";

export const Footer = () => {
  return (
    <footer className="mt-12 border-t bg-muted/50 py-8">
      <div className="container mx-auto px-4">
        <div className="flex flex-col items-center justify-between gap-4 text-sm text-muted-foreground sm:flex-row">
          <div className="flex flex-col items-center gap-1 sm:items-start">
            <p className="font-semibold text-foreground">Dashboard.Gold</p>
            <p>Real-time precious metals price comparison</p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
            <Link
              className="transition-colors hover:text-foreground"
              to="/privacy"
            >
              Privacy Policy
            </Link>
            <a
              className="transition-colors hover:text-foreground"
              href="mailto:nathan@nathandrake.dev"
            >
              Contact
            </a>
            <a
              className="transition-colors hover:text-foreground"
              href="https://buymeacoffee.com/thenathandrake"
              rel="noopener noreferrer"
              target="_blank"
            >
              Buy Me a Coffee
            </a>
            <Link
              className="transition-colors hover:text-foreground"
              to="/terms"
            >
              Terms of Service
            </Link>
          </div>

          <div className="text-center sm:text-right">
            <p>&copy; {new Date().getFullYear()} Dashboard.Gold</p>
            <p className="mt-1 text-xs">
              Not financial advice. Verify all prices independently.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};
