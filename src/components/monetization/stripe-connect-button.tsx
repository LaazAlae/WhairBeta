"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, ExternalLink, CheckCircle2 } from "lucide-react"

interface StripeConnectButtonProps {
  stripeAccountId?: string | null
  onboardingComplete: boolean
}

export function StripeConnectButton({
  stripeAccountId,
  onboardingComplete,
}: StripeConnectButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleConnect() {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/monetization/connect", {
        method: "POST",
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error?.message ?? "Failed to start Stripe onboarding")
        return
      }

      // Redirect to Stripe's hosted onboarding
      if (data.url) {
        window.location.href = data.url
      }
    } catch {
      setError("An unexpected error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  // Fully connected
  if (stripeAccountId && onboardingComplete) {
    return (
      <div className="flex items-center gap-3">
        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300">
          <CheckCircle2 className="mr-1 size-3.5" />
          Stripe Connected
        </Badge>
        <span className="text-sm text-muted-foreground">
          Payments are enabled
        </span>
      </div>
    )
  }

  // Account created but onboarding incomplete
  if (stripeAccountId && !onboardingComplete) {
    return (
      <div className="space-y-2">
        <Button onClick={handleConnect} disabled={loading} variant="outline">
          {loading ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <ExternalLink className="mr-2 size-4" />
          )}
          Complete Stripe Setup
        </Button>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <p className="text-sm text-muted-foreground">
          You started the Stripe setup but didn&apos;t finish. Click to continue.
        </p>
      </div>
    )
  }

  // No account yet
  return (
    <div className="space-y-2">
      <Button onClick={handleConnect} disabled={loading}>
        {loading ? (
          <Loader2 className="mr-2 size-4 animate-spin" />
        ) : (
          <ExternalLink className="mr-2 size-4" />
        )}
        Connect with Stripe
      </Button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
