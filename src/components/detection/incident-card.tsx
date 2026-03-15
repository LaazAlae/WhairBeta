"use client"

import { format } from "date-fns"
import { ExternalLink, ImageIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { StatusBadge } from "@/components/shared/status-badge"
import { MatchConfidenceBar } from "./match-confidence-bar"
import type { Incident } from "./evidence-preview"

interface IncidentCardProps {
  incident: Incident
  onClick?: () => void
}

/**
 * Platform badge display with brand colors.
 */
const platformColors: Record<string, string> = {
  youtube: "bg-red-100 text-red-700",
  instagram: "bg-pink-100 text-pink-700",
  tiktok: "bg-gray-100 text-gray-700",
  x: "bg-gray-100 text-gray-700",
  facebook: "bg-blue-100 text-blue-700",
  reddit: "bg-orange-100 text-orange-700",
  linkedin: "bg-blue-100 text-blue-800",
  pinterest: "bg-red-100 text-red-600",
  tumblr: "bg-indigo-100 text-indigo-700",
}

function truncateUrl(url: string, maxLength: number = 60): string {
  if (url.length <= maxLength) return url
  return url.slice(0, maxLength - 3) + "..."
}

/**
 * Incident summary card displaying platform, source URL, confidence, status, and timestamp.
 */
function getThumbnailUrl(incident: Incident): string | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (incident.matched_image_path && supabaseUrl) {
    return `${supabaseUrl}/storage/v1/object/public/evidence/${incident.matched_image_path}`
  }
  if (incident.source_url) {
    const ext = incident.source_url.split("?")[0].split(".").pop()?.toLowerCase()
    if (["jpg", "jpeg", "png", "webp", "gif"].includes(ext ?? "")) {
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

export function IncidentCard({ incident, onClick }: IncidentCardProps) {
  const platformClass = incident.platform
    ? platformColors[incident.platform] ?? "bg-gray-100 text-gray-700"
    : null

  const thumbUrl = getThumbnailUrl(incident)

  return (
    <Card
      className={
        onClick
          ? "cursor-pointer transition-shadow hover:shadow-md"
          : undefined
      }
      onClick={onClick}
    >
      <CardContent className="flex items-center gap-4 py-4">
        {/* Thumbnail */}
        <div className="size-14 shrink-0 overflow-hidden rounded-md border bg-muted">
          {thumbUrl ? (
            <img
              src={thumbUrl}
              alt="Matched image"
              className="size-full object-cover"
              referrerPolicy="no-referrer"
              loading="lazy"
            />
          ) : (
            <div className="flex size-full items-center justify-center">
              <ImageIcon className="size-6 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Left: platform + URL */}
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2">
            {incident.platform && platformClass && (
              <Badge
                variant="secondary"
                className={platformClass}
              >
                {incident.platform}
              </Badge>
            )}
            <StatusBadge status={incident.status} />
          </div>

          {incident.source_url && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <ExternalLink className="size-3 shrink-0" />
              <span className="truncate">
                {truncateUrl(incident.source_url)}
              </span>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            {format(new Date(incident.created_at), "MMM d, yyyy HH:mm")}
          </p>
        </div>

        {/* Right: confidence bar */}
        <div className="w-40 shrink-0">
          <MatchConfidenceBar
            confidence={incident.match_confidence}
            size="sm"
          />
        </div>
      </CardContent>
    </Card>
  )
}
