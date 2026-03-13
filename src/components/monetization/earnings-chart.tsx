import type { License } from "@/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, TrendingUp, Receipt } from "lucide-react"
import { StatusBadge } from "@/components/shared/status-badge"

interface EarningsChartProps {
  licenses: License[]
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

function formatDate(date: Date | string | null): string {
  if (!date) return ""
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function EarningsChart({ licenses }: EarningsChartProps) {
  // Only count paid licenses (active with paid_at set)
  const paidLicenses = licenses.filter(
    (l) => l.status === "active" && l.stripe_payment_intent_id
  )

  const totalEarnings = paidLicenses.reduce(
    (sum, l) => sum + l.price_cents,
    0
  )

  // Sort by date, most recent first
  const recentPayments = [...paidLicenses].sort((a, b) => {
    const dateA = new Date(a.created_at).getTime()
    const dateB = new Date(b.created_at).getTime()
    return dateB - dateA
  })

  if (paidLicenses.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="mb-4 rounded-full bg-muted p-4">
              <Receipt className="size-8 text-muted-foreground" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">No earnings yet</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Once licensees pay for your licenses, your earnings will appear here.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card>
        <CardContent className="pt-1">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Total Earnings</p>
              <p className="text-3xl font-bold tracking-tight">
                {formatCents(totalEarnings)}
              </p>
              <p className="text-xs text-muted-foreground">
                From {paidLicenses.length} paid{" "}
                {paidLicenses.length === 1 ? "license" : "licenses"}
              </p>
            </div>
            <div className="rounded-lg bg-emerald-50 p-2.5">
              <TrendingUp className="size-5 text-emerald-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Payments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentPayments.map((license) => (
              <div
                key={license.id}
                className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-gray-100 p-2">
                    <DollarSign className="size-4 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {license.licensee_name || "Anonymous"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(license.created_at)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={license.status} />
                  <span className="font-semibold">
                    {formatCents(license.price_cents)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
