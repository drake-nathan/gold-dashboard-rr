import { usePostHog } from "posthog-js/react";
import { Link } from "react-router";

export const Footer = () => {
  const posthog = usePostHog();

  const trackLinkClick = (link: string) => {
    posthog.capture("footer_link_clicked", { link });
  };

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
              className="transition-colors hover:text-foreground hover:underline"
              onClick={() => {
                trackLinkClick("privacy-policy");
              }}
              to="/privacy"
            >
              Privacy Policy
            </Link>
            <a
              className="transition-colors hover:text-foreground hover:underline"
              href="mailto:nathan@nathandrake.dev"
              onClick={() => {
                trackLinkClick("contact");
              }}
            >
              Contact
            </a>
            <a
              className="transition-colors hover:text-foreground hover:underline"
              href="https://buymeacoffee.com/thenathandrake"
              onClick={() => {
                trackLinkClick("buy-me-a-coffee");
              }}
              rel="noopener noreferrer"
              target="_blank"
            >
              Buy Me a Coffee
            </a>
            <Link
              className="transition-colors hover:text-foreground hover:underline"
              onClick={() => {
                trackLinkClick("terms-of-service");
              }}
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
