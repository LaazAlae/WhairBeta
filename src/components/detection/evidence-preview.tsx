import { format } from "date-fns"
import {
  ExternalLink,
  ImageIcon,
  Clock,
  Hash,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MatchConfidenceBar } from "./match-confidence-bar"

export interface Incident {
  id: string
  scan_id: string | null
  creator_id: string
  source_url: string | null
  platform: string | null
  match_confidence: number
  screenshot_path: string | null
  matched_image_path: string | null
  source_image_hash: string | null
  evidence_timestamp: string | null
  status: string
  action_taken: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}

interface EvidencePreviewProps {
  incident: Incident
}

function getEvidenceImageUrl(incident: Incident): string | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (incident.matched_image_path && supabaseUrl) {
    return `${supabaseUrl}/storage/v1/object/public/evidence/${incident.matched_image_path}`
  }
  if (incident.screenshot_path && supabaseUrl) {
    return `${supabaseUrl}/storage/v1/object/public/evidence/${incident.screenshot_path}`
  }
  if (incident.source_url) {
    const ext = incident.source_url.split("?")[0].split(".").pop()?.toLowerCase()
    if (["jpg", "jpeg", "png", "webp", "gif", "bmp", "svg"].includes(ext ?? "")) {
      return incident.source_url
    }
  }
  // Fallback: web detection incidents store a matched image URL in metadata
  const metaUrl = (incident.metadata as Record<string, unknown> | null)?.matched_image_url
  if (typeof metaUrl === "string" && metaUrl) {
    return metaUrl
  }
  return null
}

/**
 * Evidence preview card showing screenshot, source URL, confidence, timestamp, and hash.
 */
export function EvidencePreview({ incident }: EvidencePreviewProps) {
  const truncatedHash = incident.source_image_hash
    ? `${incident.source_image_hash.slice(0, 8)}...${incident.source_image_hash.slice(-8)}`
    : null

  const imageUrl = getEvidenceImageUrl(incident)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Evidence</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Screenshot / matched image thumbnail */}
        <div className="flex items-center justify-center rounded-lg border bg-muted/50 p-2">
          {imageUrl ? (
            <div className="relative w-full max-w-md overflow-hidden rounded-md bg-muted">
              <img
                src={imageUrl}
                alt="Evidence — detected match"
                className="w-full rounded-md object-contain"
                referrerPolicy="no-referrer"
                loading="lazy"
              />
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-6 text-muted-foreground">
              <ImageIcon className="size-10" />
              <p className="text-sm">No screenshot available</p>
            </div>
          )}
        </div>

        {/* Source URL */}
        {incident.source_url && (
          <div className="flex items-start gap-2">
            <ExternalLink className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-muted-foreground">
                Source URL
              </p>
              <a
                href={incident.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="block truncate text-sm text-blue-600 hover:underline"
              >
                {incident.source_url}
              </a>
            </div>
          </div>
        )}

        {/* Match confidence */}
        <div>
          <p className="mb-1 text-xs font-medium text-muted-foreground">
            Match Confidence
          </p>
          <MatchConfidenceBar confidence={incident.match_confidence} />
        </div>

        {/* Timestamp */}
        {incident.evidence_timestamp && (
          <div className="flex items-center gap-2">
            <Clock className="size-4 text-muted-foreground" />
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Evidence Timestamp
              </p>
              <p className="text-sm">
                {format(
                  new Date(incident.evidence_timestamp),
                  "MMM d, yyyy HH:mm:ss"
                )}
              </p>
            </div>
          </div>
        )}

        {/* Hash */}
        {truncatedHash && (
          <div className="flex items-center gap-2">
            <Hash className="size-4 text-muted-foreground" />
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Image Hash
              </p>
              <p className="font-mono text-xs text-muted-foreground">
                {truncatedHash}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
