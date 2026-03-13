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

/**
 * Evidence preview card showing screenshot, source URL, confidence, timestamp, and hash.
 */
export function EvidencePreview({ incident }: EvidencePreviewProps) {
  const truncatedHash = incident.source_image_hash
    ? `${incident.source_image_hash.slice(0, 8)}...${incident.source_image_hash.slice(-8)}`
    : null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Evidence</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Screenshot / matched image thumbnail */}
        <div className="flex items-center justify-center rounded-lg border bg-muted/50 p-6">
          {incident.screenshot_path || incident.matched_image_path ? (
            <div className="relative aspect-video w-full max-w-md overflow-hidden rounded-md bg-muted">
              {/* In production, this would load from Supabase storage */}
              <div className="flex h-full items-center justify-center">
                <ImageIcon className="size-12 text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">
                  Evidence image
                </span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
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
