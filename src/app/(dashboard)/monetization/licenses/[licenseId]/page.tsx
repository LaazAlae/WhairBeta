import { redirect, notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/shared/page-header"
import { StatusBadge } from "@/components/shared/status-badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  DollarSign,
  Calendar,
  Mail,
  User,
  FileText,
  Link as LinkIcon,
  CreditCard,
} from "lucide-react"
import type { License, Incident } from "@/types"
import { RevokeLicenseButton } from "./revoke-button"

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

function formatDate(date: Date | string | null): string {
  if (!date) return "N/A"
  return new Date(date).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

function formatLicenseType(type: string): string {
  return type
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

interface LicenseDetailPageProps {
  params: Promise<{ licenseId: string }>
}

export default async function LicenseDetailPage({
  params,
}: LicenseDetailPageProps) {
  const { licenseId } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { data: creator } = await supabase
    .from("creators")
    .select("id")
    .eq("user_id", user.id)
    .single()

  if (!creator) {
    redirect("/identity")
  }

  // Fetch license
  const { data: license } = await supabase
    .from("licenses")
    .select("*")
    .eq("id", licenseId)
    .eq("creator_id", creator.id)
    .single()

  if (!license) {
    notFound()
  }

  const typedLicense = license as License

  // Fetch related incident if linked
  let incident: Incident | null = null
  if (typedLicense.incident_id) {
    const { data } = await supabase
      .from("incidents")
      .select("*")
      .eq("id", typedLicense.incident_id)
      .eq("creator_id", creator.id)
      .single()
    incident = data as Incident | null
  }

  const canRevoke =
    typedLicense.status === "active" || typedLicense.status === "pending"

  return (
    <div className="space-y-8">
      <PageHeader
        title="License Details"
        description={`License ${licenseId.slice(0, 8)}...`}
      />

      {/* Main Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="size-5" />
              License Overview
            </CardTitle>
            <StatusBadge status={typedLicense.status} />
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Price and Type */}
          <div className="flex items-center gap-4">
            <div className="rounded-lg bg-emerald-50 p-3">
              <DollarSign className="size-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {formatCents(typedLicense.price_cents)}
              </p>
              <Badge variant="outline">
                {formatLicenseType(typedLicense.license_type)}
              </Badge>
            </div>
          </div>

          <Separator />

          {/* Details grid */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <User className="size-3.5" /> Licensee
              </p>
              <p className="text-sm">
                {typedLicense.licensee_name || "Not specified"}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <Mail className="size-3.5" /> Email
              </p>
              <p className="text-sm">
                {typedLicense.licensee_email || "Not specified"}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <Calendar className="size-3.5" /> Created
              </p>
              <p className="text-sm">{formatDate(typedLicense.created_at)}</p>
            </div>

            {typedLicense.paid_at && (
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <Calendar className="size-3.5" /> Paid
                </p>
                <p className="text-sm">{formatDate(typedLicense.paid_at)}</p>
              </div>
            )}

            {typedLicense.expires_at && (
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <Calendar className="size-3.5" /> Expires
                </p>
                <p className="text-sm">{formatDate(typedLicense.expires_at)}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Payment Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="size-5" />
            Payment Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">
                Currency
              </p>
              <p className="text-sm uppercase">
                {typedLicense.currency || "usd"}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">
                Payment Status
              </p>
              <p className="text-sm">
                {typedLicense.stripe_payment_intent_id
                  ? "Payment received"
                  : "Awaiting payment"}
              </p>
            </div>

            {typedLicense.stripe_payment_intent_id && (
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                  Payment Intent
                </p>
                <p className="text-sm font-mono text-xs">
                  {typedLicense.stripe_payment_intent_id}
                </p>
              </div>
            )}

            {typedLicense.stripe_transfer_id && (
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                  Transfer ID
                </p>
                <p className="text-sm font-mono text-xs">
                  {typedLicense.stripe_transfer_id}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Related Incident */}
      {incident && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <LinkIcon className="size-5" />
              Related Incident
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                  Platform
                </p>
                <p className="text-sm">{incident.platform}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                  Source URL
                </p>
                <a
                  href={incident.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline break-all"
                >
                  {incident.source_url}
                </a>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                  Match Confidence
                </p>
                <p className="text-sm">{incident.match_confidence}%</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                  Status
                </p>
                <StatusBadge status={incident.status} />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Revoke Action */}
      {canRevoke && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-base text-red-700">
              Danger Zone
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Revoke this license</p>
                <p className="text-sm text-muted-foreground">
                  This will immediately revoke the license and notify the
                  licensee. This action cannot be undone.
                </p>
              </div>
              <RevokeLicenseButton licenseId={licenseId} />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
