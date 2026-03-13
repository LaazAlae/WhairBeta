import Link from "next/link"
import { redirect, notFound } from "next/navigation"
import { ArrowLeft, Download, ExternalLink } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/shared/page-header"
import { StatusBadge } from "@/components/shared/status-badge"
import { CaseTimeline } from "@/components/enforcement/case-timeline"
import { EvidencePacketPreview } from "@/components/enforcement/evidence-packet-preview"
import { PlatformRouter } from "@/components/enforcement/platform-router"
import { CaseStatusForm } from "./case-status-form"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getPlatformReportUrls } from "@/lib/enforcement/platform-routes"

interface CaseDetailPageProps {
  params: Promise<{ caseId: string }>
}

export default async function CaseDetailPage({ params }: CaseDetailPageProps) {
  const { caseId } = await params

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  // Get creator profile
  const { data: creator } = await supabase
    .from("creators")
    .select("id")
    .eq("user_id", user.id)
    .single()

  if (!creator) redirect("/identity")

  // Fetch case with evidence packet and incident
  const { data: caseData, error } = await supabase
    .from("cases")
    .select("*")
    .eq("id", caseId)
    .eq("creator_id", creator.id)
    .single()

  if (error || !caseData) notFound()

  // Fetch related evidence packet
  let evidencePacket = null
  if (caseData.evidence_packet_id) {
    const { data: ep } = await supabase
      .from("evidence_packets")
      .select("*")
      .eq("id", caseData.evidence_packet_id)
      .single()
    evidencePacket = ep
  }

  // Fetch related incident
  const { data: incident } = await supabase
    .from("incidents")
    .select("*")
    .eq("id", caseData.incident_id)
    .single()

  // Get platform report URLs
  const reportUrls = getPlatformReportUrls(caseData.platform ?? "")

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/enforcement/cases">
          <Button variant="ghost" size="icon" className="size-8">
            <ArrowLeft className="size-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <PageHeader
            title={`Case ${caseId.slice(0, 8).toUpperCase()}`}
            description={
              incident?.source_url
                ? `Takedown for ${incident.source_url}`
                : "Enforcement case details"
            }
          />
        </div>
        <StatusBadge status={caseData.status} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="space-y-6 lg:col-span-2">
          {/* Incident Details */}
          {incident && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Incident Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Source URL
                    </p>
                    <a
                      href={incident.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline break-all"
                    >
                      {incident.source_url}
                      <ExternalLink className="size-3 shrink-0" />
                    </a>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Platform
                    </p>
                    <Badge variant="outline" className="capitalize">
                      {caseData.platform}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Match Confidence
                    </p>
                    <p className="text-sm font-semibold">
                      {incident.match_confidence}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Detected
                    </p>
                    <p className="text-sm">
                      {new Date(
                        incident.evidence_timestamp ?? incident.created_at
                      ).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Evidence Packet */}
          {evidencePacket?.content && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Evidence Packet</h3>
                {evidencePacket.pdf_storage_path && (
                  <Button variant="outline" size="sm" render={<a href={evidencePacket.pdf_storage_path} target="_blank" rel="noopener noreferrer" />}>
                      <Download className="mr-2 size-3.5" />
                      Download Packet
                  </Button>
                )}
              </div>
              <EvidencePacketPreview
                packet={
                  evidencePacket.content as Record<string, unknown>
                }
              />
            </div>
          )}

          {/* Platform Router */}
          <PlatformRouter
            platform={caseData.platform ?? "other"}
            reportUrls={reportUrls}
          />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Case Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <CaseTimeline caseData={caseData as any} />
            </CardContent>
          </Card>

          {/* Update Status Form */}
          <CaseStatusForm
            caseId={caseData.id}
            currentStatus={caseData.status}
          />
        </div>
      </div>
    </div>
  )
}
