"use client";

import { useEffect } from "react";

/**
 * Root error boundary.
 * Catches unhandled errors in the app and displays a fallback UI.
 * In development mode, shows the actual error message for debugging.
 * In production, shows a generic message to avoid leaking internal details.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to the console for debugging
    console.error("[App Error]", error);
  }, [error]);

  const isDev = process.env.NODE_ENV === "development";

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="mx-auto max-w-md text-center">
        <div className="mb-4 text-6xl font-bold text-destructive">!</div>
        <h1 className="mb-2 text-2xl font-semibold tracking-tight">
          Something went wrong
        </h1>
        <p className="mb-6 text-muted-foreground">
          {isDev
            ? error.message
            : "An unexpected error occurred. Please try again."}
        </p>
        {isDev && error.digest && (
          <p className="mb-4 font-mono text-xs text-muted-foreground">
            Digest: {error.digest}
          </p>
        )}
        <button
          onClick={reset}
          className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
