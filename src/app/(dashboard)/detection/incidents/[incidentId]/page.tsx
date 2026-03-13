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
                  <div className="flex aspect-square items-center justify-center rounded-lg border bg-muted/50">
                    <ImageIcon className="size-8 text-muted-foreground" />
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    Your Reference
                  </p>
                  <div className="flex aspect-square items-center justify-center rounded-lg border bg-muted/50">
                    <ImageIcon className="size-8 text-muted-foreground" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action buttons */}
          <IncidentActions incident={incident} />
        </div>
      </div>
    </div>
  )
}
