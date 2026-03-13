"use client"

import { useEffect } from "react"
import { ErrorDisplay } from "@/components/shared/error-display"

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Dashboard error:", error)
  }, [error])

  return (
    <div className="flex items-center justify-center min-h-[50vh] px-4">
      <div className="w-full max-w-md">
        <ErrorDisplay
          title="Dashboard Error"
          message={
            error.message ||
            "An unexpected error occurred while loading the dashboard."
          }
          onRetry={reset}
        />
      </div>
    </div>
  )
}
