import { AlertTriangle, Home as HomeIcon, RefreshCw } from "lucide-react";
import { posthog } from "posthog-js";
import { type ReactNode } from "react";
import { isRouteErrorResponse, Link } from "react-router";

import { Button } from "./button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./card";

interface RouteErrorPageProps {
  /** Description shown for unexpected (non-Response) errors. */
  description: ReactNode;
  /** The error returned by `useRouteError()`. */
  error: unknown;
  /** When true, render the error stack inside a <details> in dev. */
  showStack?: boolean;
  /** Title shown for unexpected (non-Response) errors. */
  title: string;
}

const Actions = () => (
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
);

export const RouteErrorPage = ({
  description,
  error,
  showStack = false,
  title,
}: RouteErrorPageProps) => {
  if (isRouteErrorResponse(error)) {
    return (
      <main className="container mx-auto flex flex-1 items-center justify-center px-4 py-8">
        <Card className="w-full max-w-md border-destructive/50 bg-destructive/10">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <CardTitle className="text-destructive">
                {error.status} {error.statusText}
              </CardTitle>
            </div>
            <CardDescription>
              {error.status === 404
                ? "The page you're looking for doesn't exist."
                : "An error occurred while loading this page."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error.data ? (
              <div className="rounded-md bg-muted p-4">
                <p className="text-sm text-muted-foreground">{String(error.data)}</p>
              </div>
            ) : null}
            <Actions />
          </CardContent>
        </Card>
      </main>
    );
  }

  const isError = error instanceof Error;
  const errorMessage = isError ? error.message : "An unexpected error occurred";
  const errorStack = isError ? error.stack : undefined;
  const isDev = import.meta.env.MODE === "development";

  if (typeof window !== "undefined") {
    // Normalize non-Error throws (strings, plain objects) so PostHog still
    // captures the failure with a usable stack trace and original type tag.
    const captured = isError
      ? error
      : new Error(typeof error === "string" ? error : "Non-Error thrown from route");
    posthog.captureException(captured, {
      $current_url: window.location.href,
      original_error_type: isError ? error.constructor.name : typeof error,
      route_path: window.location.pathname,
      source: "route_error_boundary",
    });
  }

  return (
    <main className="container mx-auto flex flex-1 items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md border-destructive/50 bg-destructive/10">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <CardTitle className="text-destructive">{title}</CardTitle>
          </div>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isDev ? (
            <div className="rounded-md bg-muted p-4">
              <p className="mb-2 text-sm font-medium">Error details:</p>
              <p className="font-mono text-xs text-muted-foreground">{errorMessage}</p>
              {showStack && errorStack ? (
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                    Stack trace
                  </summary>
                  <pre className="mt-2 overflow-x-auto text-xs text-muted-foreground">
                    {errorStack}
                  </pre>
                </details>
              ) : null}
            </div>
          ) : null}
          <Actions />
        </CardContent>
      </Card>
    </main>
  );
};
