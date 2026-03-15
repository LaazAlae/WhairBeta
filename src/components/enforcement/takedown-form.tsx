"use client"

import { useState, useEffect, useCallback } from "react"
import { ExternalLink, FileText, Loader2, CheckCircle2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { EvidencePacketPreview } from "./evidence-packet-preview"

interface IncidentData {
  id: string
  source_url: string
  platform: string | null
  match_confidence: number
  screenshot_path?: string | null
  evidence_timestamp?: string | null
  status: string
  created_at: string
}

interface TakedownResult {
  case: {
    id: string
    status: string
    platform_report_url: string | null
  }
  evidencePacket: {
    id: string
    content: Record<string, unknown>
  }
  platformReportUrl: string | null
}

interface TakedownFormProps {
  incidentId: string
}

export function TakedownForm({ incidentId }: TakedownFormProps) {
  const [incident, setIncident] = useState<IncidentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<TakedownResult | null>(null)

  const fetchIncident = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(`/api/detection/incidents/${incidentId}`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error?.message ?? "Failed to fetch incident details")
      }
      const data = await res.json()
      setIncident(data.data?.incident ?? data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load incident")
    } finally {
      setLoading(false)
    }
  }, [incidentId])

  useEffect(() => {
    fetchIncident()
  }, [fetchIncident])

  async function handleGenerateTakedown() {
    try {
      setGenerating(true)
      setError(null)
      const res = await fetch("/api/enforcement/takedown", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ incidentId }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error?.message ?? "Failed to generate takedown packet")
      }

      const data = await res.json()
      setResult(data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate takedown")
    } finally {
      setGenerating(false)
    }
  }

  async function handleMarkSubmitted() {
    if (!result?.case?.id) return
    try {
      setSubmitting(true)
      setError(null)
      const res = await fetch(`/api/enforcement/cases/${result.case.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "submitted" }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error?.message ?? "Failed to update case status")
      }

      const data = await res.json()
      setResult((prev) =>
        prev ? { ...prev, case: { ...prev.case, ...data.data } } : prev
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!incident) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="size-4" />
        <AlertDescription>
          {error ?? "Incident not found. Please check the URL and try again."}
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Incident Evidence Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Incident Evidence Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Source URL</p>
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
              <p className="text-xs font-medium text-muted-foreground">Platform</p>
              <p className="text-sm capitalize">{incident.platform ?? "Unknown"}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Match Confidence</p>
              <Badge
                variant={incident.match_confidence >= 90 ? "default" : "secondary"}
                className={
                  incident.match_confidence >= 90
                    ? "bg-emerald-100 text-emerald-700"
                    : ""
                }
              >
                {incident.match_confidence}%
              </Badge>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Detected At</p>
              <p className="text-sm">
                {new Date(
                  incident.evidence_timestamp ?? incident.created_at
                ).toLocaleString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Generate or Show Result */}
      {!result ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <FileText className="mx-auto size-12 text-muted-foreground" />
              <div>
                <h3 className="text-base font-semibold">Generate Takedown Packet</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Create an evidence packet with your rights information, match evidence,
                  and provenance proof to submit a formal takedown request.
                </p>
              </div>
              <Button
                size="lg"
                onClick={handleGenerateTakedown}
                disabled={generating}
              >
                {generating ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <FileText className="mr-2 size-4" />
                    Generate Takedown Packet
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Success Banner */}
          <Alert>
            <CheckCircle2 className="size-4 text-emerald-600" />
            <AlertDescription className="text-emerald-700">
              Takedown packet generated successfully. Review the evidence below, then
              submit to the platform.
            </AlertDescription>
          </Alert>

          {/* Evidence Packet Preview */}
          <EvidencePacketPreview
            packet={result.evidencePacket.content}
          />

          <Separator />

          {/* Platform Submission Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Submit to Platform</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Open the platform&apos;s report form in a new tab and paste the evidence
                from the packet above. After submitting on the platform, come back and
                mark this case as submitted.
              </p>
              <div className="flex flex-wrap gap-3">
                {result.platformReportUrl && (
                  <Button render={<a href={result.platformReportUrl} target="_blank" rel="noopener noreferrer" />}>
                      <ExternalLink className="mr-2 size-4" />
                      Go to {incident.platform ? incident.platform.charAt(0).toUpperCase() + incident.platform.slice(1) : "Platform"} Report Form
                  </Button>
                )}
                <Button
                  variant={
                    result.case.status === "submitted" ? "secondary" : "outline"
                  }
                  onClick={handleMarkSubmitted}
                  disabled={submitting || result.case.status === "submitted"}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Updating...
                    </>
                  ) : result.case.status === "submitted" ? (
                    <>
                      <CheckCircle2 className="mr-2 size-4" />
                      Marked as Submitted
                    </>
                  ) : (
                    "Mark as Submitted"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
