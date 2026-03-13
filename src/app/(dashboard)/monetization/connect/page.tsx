"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { PageHeader } from "@/components/shared/page-header"
import { StripeConnectButton } from "@/components/monetization/stripe-connect-button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  CheckCircle2,
  AlertTriangle,
  CreditCard,
  Shield,
  Banknote,
  Zap,
} from "lucide-react"

export default function ConnectPage() {
  const searchParams = useSearchParams()
  const setup = searchParams.get("setup")

  const [creatorData, setCreatorData] = useState<{
    stripeAccountId: string | null
    onboardingComplete: boolean
  } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchCreator() {
      try {
        const response = await fetch("/api/monetization/connect", {
          method: "GET",
        })

        // The GET endpoint might not exist, handle gracefully
        if (response.ok) {
          const data = await response.json()
          setCreatorData({
            stripeAccountId: data.data?.stripe_account_id ?? null,
            onboardingComplete: data.data?.stripe_onboarding_complete ?? false,
          })
        } else {
          setCreatorData({
            stripeAccountId: null,
            onboardingComplete: false,
          })
        }
      } catch {
        setCreatorData({
          stripeAccountId: null,
          onboardingComplete: false,
        })
      } finally {
        setLoading(false)
      }
    }

    fetchCreator()
  }, [])

  return (
    <div className="space-y-8">
      <PageHeader
        title="Stripe Connect"
        description="Connect your bank account to receive licensing payments"
      />

      {/* Return from Stripe messages */}
      {setup === "complete" && (
        <Alert className="border-emerald-300 bg-emerald-50">
          <CheckCircle2 className="size-4 text-emerald-600" />
          <AlertTitle className="text-emerald-800">Setup complete</AlertTitle>
          <AlertDescription className="text-emerald-700">
            Your Stripe account has been connected successfully. You can now
            receive payments from licensed uses of your likeness.
          </AlertDescription>
        </Alert>
      )}

      {setup === "refresh" && (
        <Alert className="border-yellow-300 bg-yellow-50">
          <AlertTriangle className="size-4 text-yellow-600" />
          <AlertTitle className="text-yellow-800">Setup incomplete</AlertTitle>
          <AlertDescription className="text-yellow-700">
            Your Stripe setup session expired. Please click the button below to
            continue setting up your account.
          </AlertDescription>
        </Alert>
      )}

      {/* Connect Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="size-5" />
            Payment Account
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Whair uses Stripe Connect to securely process payments. When
            someone licenses the use of your likeness, the payment goes
            directly to your connected bank account.
          </p>

          {loading ? (
            <div className="py-4 text-center text-sm text-muted-foreground">
              Loading account status...
            </div>
          ) : (
            <StripeConnectButton
              stripeAccountId={creatorData?.stripeAccountId}
              onboardingComplete={creatorData?.onboardingComplete ?? false}
            />
          )}
        </CardContent>
      </Card>

      {/* Benefits */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-2">
              <div className="rounded-full bg-blue-50 p-3">
                <Shield className="size-5 text-blue-600" />
              </div>
              <h3 className="font-medium">Secure Payments</h3>
              <p className="text-sm text-muted-foreground">
                Stripe handles all payment security and PCI compliance.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-2">
              <div className="rounded-full bg-emerald-50 p-3">
                <Banknote className="size-5 text-emerald-600" />
              </div>
              <h3 className="font-medium">Direct Deposits</h3>
              <p className="text-sm text-muted-foreground">
                Earnings are deposited directly into your bank account.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-2">
              <div className="rounded-full bg-purple-50 p-3">
                <Zap className="size-5 text-purple-600" />
              </div>
              <h3 className="font-medium">Instant Setup</h3>
              <p className="text-sm text-muted-foreground">
                Set up your payment account in just a few minutes.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
