import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/shared/page-header"
import { StatsCard } from "@/components/shared/stats-card"
import { StripeConnectButton } from "@/components/monetization/stripe-connect-button"
import { LicenseCard } from "@/components/monetization/license-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  DollarSign,
  FileText,
  CheckCircle2,
  CreditCard,
  ArrowRight,
  AlertTriangle,
} from "lucide-react"
import type { License } from "@/types"

export default async function MonetizationPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Fetch creator profile
  const { data: creator } = await supabase
    .from("creators")
    .select("id, stripe_account_id, stripe_onboarding_complete")
    .eq("user_id", user.id)
    .single()

  if (!creator) {
    redirect("/identity")
  }

  // Fetch licenses
  const { data: licenses } = await supabase
    .from("licenses")
    .select("*")
    .eq("creator_id", creator.id)
    .order("created_at", { ascending: false })
    .limit(10)

  const allLicenses = (licenses ?? []) as License[]
  const activeLicenses = allLicenses.filter((l) => l.status === "active")
  const totalEarnings = activeLicenses
    .filter((l) => l.stripe_payment_intent_id)
    .reduce((sum, l) => sum + l.price_cents, 0)

  const stripeConfigured = !!process.env.STRIPE_SECRET_KEY

  return (
    <div className="space-y-8">
      <PageHeader
        title="Monetization"
        description="License your likeness and earn from authorized uses"
        action={
          <Link href="/monetization/licenses">
            <Button variant="outline">
              View All Licenses
              <ArrowRight className="ml-2 size-4" />
            </Button>
          </Link>
        }
      />

      {/* Stripe not configured warning */}
      {!stripeConfigured && (
        <Card className="border-yellow-300 bg-yellow-50">
          <CardContent className="pt-1">
            <div className="flex items-start gap-3">
              <AlertTriangle className="size-5 text-yellow-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-yellow-800">
                  Stripe is not configured
                </p>
                <p className="text-sm text-yellow-700 mt-1">
                  To enable payments, add your STRIPE_SECRET_KEY to the environment
                  variables. Contact your administrator for setup instructions.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stripe Connect Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="size-5" />
            Payment Setup
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!creator.stripe_account_id && !creator.stripe_onboarding_complete ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Connect your Stripe account to start receiving payments from
                licensed uses of your likeness.
              </p>
              <StripeConnectButton
                stripeAccountId={creator.stripe_account_id}
                onboardingComplete={creator.stripe_onboarding_complete}
              />
            </div>
          ) : (
            <StripeConnectButton
              stripeAccountId={creator.stripe_account_id}
              onboardingComplete={creator.stripe_onboarding_complete}
            />
          )}
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatsCard
          title="Total Licenses"
          value={allLicenses.length}
          icon={FileText}
          description="All time"
        />
        <StatsCard
          title="Active Licenses"
          value={activeLicenses.length}
          icon={CheckCircle2}
          description="Currently active"
        />
        <StatsCard
          title="Total Earnings"
          value={`$${(totalEarnings / 100).toFixed(2)}`}
          icon={DollarSign}
          description="From paid licenses"
        />
      </div>

      {/* Recent Licenses */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent Licenses</h2>
          {allLicenses.length > 0 && (
            <Link href="/monetization/licenses">
              <Button variant="ghost" size="sm">
                View all
                <ArrowRight className="ml-1 size-3.5" />
              </Button>
            </Link>
          )}
        </div>

        {allLicenses.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="flex flex-col items-center justify-center text-center">
                <div className="mb-4 rounded-full bg-muted p-4">
                  <FileText className="size-8 text-muted-foreground" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">No licenses yet</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  When you detect unauthorized uses of your likeness, you can
                  choose to license them instead of issuing takedowns.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {allLicenses.slice(0, 5).map((license) => (
              <LicenseCard key={license.id} license={license} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
