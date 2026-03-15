import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, ImageIcon } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/shared/page-header"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { EvidencePreview } from "@/components/detection/evidence-preview"
import { MatchConfidenceBar } from "@/components/detection/match-confidence-bar"
import { IncidentActions } from "./incident-actions"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""

interface IncidentDetailPageProps {
  params: Promise<{ incidentId: string }>
}

export default async function IncidentDetailPage({
  params,
}: IncidentDetailPageProps) {
  const { incidentId } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  // Fetch creator record
  const { data: creator } = await supabase
    .from("creators")
    .select("id")
    .eq("user_id", user.id)
    .single()

  if (!creator) {
    return notFound()
  }

  // Fetch incident and verify ownership
  const { data: incident } = await supabase
    .from("incidents")
    .select("*")
    .eq("id", incidentId)
    .eq("creator_id", creator.id)
    .single()

  if (!incident) {
    return notFound()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/detection/incidents">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-1 size-4" />
            Back to Incidents
          </Button>
        </Link>
      </div>

      <PageHeader
        title="Incident Details"
        description={
          incident.source_url
            ? `Detection from ${incident.source_url}`
            : "Detection incident details"
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left column: Evidence */}
        <EvidencePreview incident={incident} />

        {/* Right column: Details and actions */}
        <div className="space-y-6">
          {/* Match confidence large display */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Match Confidence</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <MatchConfidenceBar
                  confidence={incident.match_confidence}
                  size="lg"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                {incident.match_confidence >= 90
                  ? "Very high confidence match. This is very likely your likeness."
                  : incident.match_confidence >= 80
                    ? "High confidence match. This is likely your likeness."
                    : incident.match_confidence >= 50
                      ? "Moderate confidence match. Manual review recommended."
                      : "Low confidence match. This may be a false positive."}
              </p>
            </CardContent>
          </Card>

          {/* Platform and status info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <StatusBadge status={incident.status} />
              </div>
              {incident.platform && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Platform
                  </span>
                  <Badge variant="secondary" className="capitalize">
                    {incident.platform}
                  </Badge>
                </div>
              )}
              {incident.action_taken && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Action Taken
                  </span>
                  <Badge variant="outline" className="capitalize">
                    {incident.action_taken}
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Reference comparison */}
          <ImageComparison incident={incident} creatorId={creator.id} />

          {/* Action buttons */}
          <IncidentActions incident={incident} />
        </div>
      </div>
    </div>
  )
}

async function ImageComparison({
  incident,
  creatorId,
}: {
  incident: Record<string, unknown>
  creatorId: string
}) {
  const supabase = await createClient()
  const meta = incident.metadata as Record<string, unknown> | null
  const refAssetId = typeof meta?.reference_asset_id === "string" ? meta.reference_asset_id : null

  // Fetch the specific matched reference asset, or fall back to first one
  let refAsset: { storage_path: string; file_name: string } | null = null
  if (refAssetId) {
    const { data } = await supabase
      .from("assets")
      .select("storage_path, file_name")
      .eq("id", refAssetId)
      .eq("creator_id", creatorId)
      .single()
    refAsset = data
  }
  if (!refAsset) {
    const { data } = await supabase
      .from("assets")
      .select("storage_path, file_name")
      .eq("creator_id", creatorId)
      .eq("is_canonical", true)
      .eq("status", "active")
      .not("file_type", "like", "audio/%")
      .limit(1)
      .single()
    refAsset = data
  }

  // Build detected image URL
  let detectedUrl: string | null = null
  if (incident.matched_image_path && supabaseUrl) {
    detectedUrl = `${supabaseUrl}/storage/v1/object/public/evidence/${incident.matched_image_path}`
  } else if (typeof incident.source_url === "string") {
    const ext = incident.source_url.split("?")[0].split(".").pop()?.toLowerCase()
    if (["jpg", "jpeg", "png", "webp", "gif"].includes(ext ?? "")) {
      detectedUrl = incident.source_url
    }
  }
  // Fallback: web detection incidents store a matched image URL in metadata
  if (!detectedUrl) {
    const meta = incident.metadata as Record<string, unknown> | null
    if (typeof meta?.matched_image_url === "string" && meta.matched_image_url) {
      detectedUrl = meta.matched_image_url
    }
  }

  const referenceUrl =
    refAsset?.storage_path && supabaseUrl
      ? `${supabaseUrl}/storage/v1/object/public/assets/${refAsset.storage_path}`
      : null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Image Comparison</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              Detected Image
            </p>
            <div className="flex aspect-square items-center justify-center overflow-hidden rounded-lg border bg-muted/50">
              {detectedUrl ? (
                <img
                  src={detectedUrl}
                  alt="Detected match"
                  className="size-full object-cover rounded-lg"
                  referrerPolicy="no-referrer"
                  loading="lazy"
                />
              ) : (
                <ImageIcon className="size-8 text-muted-foreground" />
              )}
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              Your Reference
            </p>
            <div className="flex aspect-square items-center justify-center overflow-hidden rounded-lg border bg-muted/50">
              {referenceUrl ? (
                <img
                  src={referenceUrl}
                  alt={refAsset?.file_name ?? "Reference photo"}
                  className="size-full object-cover rounded-lg"
                  loading="lazy"
                />
              ) : (
                <ImageIcon className="size-8 text-muted-foreground" />
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
