import Link from "next/link"
import type { License } from "@/types"
import { Card, CardContent } from "@/components/ui/card"
import { StatusBadge } from "@/components/shared/status-badge"
import { Badge } from "@/components/ui/badge"
import { CalendarDays, DollarSign, Mail, User } from "lucide-react"

interface LicenseCardProps {
  license: License
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

function formatDate(date: Date | string | null): string {
  if (!date) return "N/A"
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function formatLicenseType(type: string): string {
  return type
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export function LicenseCard({ license }: LicenseCardProps) {
  return (
    <Link href={`/monetization/licenses/${license.id}`}>
      <Card className="transition-colors hover:bg-muted/50 cursor-pointer">
        <CardContent className="pt-1">
          <div className="flex items-start justify-between">
            <div className="space-y-3 flex-1">
              {/* Top row: Price + type + status */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-lg font-semibold">
                  {formatCents(license.price_cents)}
                </span>
                <Badge variant="outline">{formatLicenseType(license.license_type)}</Badge>
                <StatusBadge status={license.status} />
              </div>

              {/* Details */}
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                {license.licensee_name && (
                  <span className="flex items-center gap-1">
                    <User className="size-3.5" />
                    {license.licensee_name}
                  </span>
                )}
                {license.licensee_email && (
                  <span className="flex items-center gap-1">
                    <Mail className="size-3.5" />
                    {license.licensee_email}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <CalendarDays className="size-3.5" />
                  Created {formatDate(license.created_at)}
                </span>
                {license.expires_at && (
                  <span className="flex items-center gap-1">
                    <CalendarDays className="size-3.5" />
                    Expires {formatDate(license.expires_at)}
                  </span>
                )}
              </div>
            </div>

            {/* Price indicator */}
            <div className="rounded-lg bg-emerald-50 p-2.5 shrink-0">
              <DollarSign className="size-5 text-emerald-600" />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
