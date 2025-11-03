/* eslint-disable react/destructuring-assignment */
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Component, type ErrorInfo, type ReactNode } from "react";

import { Button } from "./button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./card";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
}

interface ErrorBoundaryState {
  error: Error | null;
  hasError: boolean;
}

/**
 * ErrorBoundary component that catches JavaScript errors anywhere in the child component tree.
 *
 * Features:
 * - Catches errors during rendering, lifecycle methods, and constructors
 * - Displays a fallback UI when errors occur
 * - Provides reset functionality to try recovering
 * - Optional error logging callback
 * - Optional error details display (useful for development)
 *
 * Usage:
 * ```tsx
 * <ErrorBoundary>
 *   <YourComponent />
 * </ErrorBoundary>
 * ```
 *
 * With custom fallback:
 * ```tsx
 * <ErrorBoundary fallback={<div>Custom error message</div>}>
 *   <YourComponent />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { error: null, hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error, hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console in development
    if (import.meta.env.MODE === "development") {
      console.error("ErrorBoundary caught an error:", error, errorInfo);
    }

    // Call optional error handler
    this.props.onError?.(error, errorInfo);
  }

  handleReset = () => {
    this.setState({ error: null, hasError: false });
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <Card className="border-destructive/50 bg-destructive/10">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <CardTitle className="text-destructive">
                Something went wrong
              </CardTitle>
            </div>
            <CardDescription>
              An error occurred while rendering this section. You can try
              refreshing to recover.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {this.props.showDetails && this.state.error ?
              <div className="rounded-md bg-muted p-4">
                <p className="font-mono text-xs text-muted-foreground">
                  {this.state.error.message}
                </p>
              </div>
            : null}
            <Button onClick={this.handleReset} size="sm" variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Try again
            </Button>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

/**
 * Lightweight error fallback component for inline use.
 * Useful when you want a smaller, less prominent error display.
 */
export const ErrorFallback = ({
  error,
  onReset,
}: {
  error?: Error | string;
  onReset?: () => void;
}) => (
  <div className="flex items-center justify-center rounded-lg border border-destructive/50 bg-destructive/10 p-8">
    <div className="text-center">
      <AlertTriangle className="mx-auto mb-2 h-8 w-8 text-destructive" />
      <p className="mb-1 font-medium text-destructive">Error</p>
      <p className="mb-4 text-sm text-muted-foreground">
        {typeof error === "string" ?
          error
        : error?.message || "An unexpected error occurred"}
      </p>
      {onReset ?
        <Button onClick={onReset} size="sm" variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Try again
        </Button>
      : null}
    </div>
  </div>
);
