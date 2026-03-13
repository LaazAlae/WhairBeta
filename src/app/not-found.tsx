import Link from "next/link";

/**
 * Custom 404 page.
 * Displayed when a user navigates to a route that doesn't exist.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="mx-auto max-w-md text-center">
        <h1 className="mb-2 text-7xl font-bold tracking-tighter text-muted-foreground/50">
          404
        </h1>
        <h2 className="mb-2 text-2xl font-semibold tracking-tight">
          Page not found
        </h2>
        <p className="mb-8 text-muted-foreground">
          The page you are looking for does not exist or has been moved.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
