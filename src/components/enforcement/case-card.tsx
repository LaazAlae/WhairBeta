"use client"

import Link from "next/link"
import { ExternalLink } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { StatusBadge } from "@/components/shared/status-badge"
import { cn } from "@/lib/utils"

interface CaseData {
  id: string
  incident_id: string
  creator_id: string
  evidence_packet_id: string | null
  platform: string
  platform_report_url: string | null
  status: string
  submitted_at: string | null
  acknowledged_at: string | null
  resolved_at: string | null
  resolution_notes: string | null
  metadata: Record<string, unknown> | null
  created_at: string
  updated_at: string
  // Joined from incidents
  source_url?: string
  match_confidence?: number
}

interface CaseCardProps {
  caseData: CaseData
}

const platformColors: Record<string, string> = {
  youtube: "bg-red-100 text-red-700 border-red-200",
  instagram: "bg-pink-100 text-pink-700 border-pink-200",
  tiktok: "bg-gray-100 text-gray-700 border-gray-200",
  x: "bg-slate-100 text-slate-700 border-slate-200",
  other: "bg-blue-100 text-blue-700 border-blue-200",
}

const platformLabels: Record<string, string> = {
  youtube: "YouTube",
  instagram: "Instagram",
  tiktok: "TikTok",
  x: "X (Twitter)",
}

function truncateUrl(url: string, maxLength: number = 50): string {
  if (url.length <= maxLength) return url
  try {
    const parsed = new URL(url)
    const path = parsed.pathname + parsed.search
    const truncatedPath =
      path.length > 30 ? path.slice(0, 27) + "..." : path
    return parsed.hostname + truncatedPath
  } catch {
    return url.slice(0, maxLength - 3) + "..."
  }
}

function formatDate(dateString: string | null): string {
  if (!dateString) return "--"
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function CaseCard({ caseData }: CaseCardProps) {
  const platformColorClass =
    platformColors[caseData.platform?.toLowerCase()] ?? platformColors.other
  const platformLabel =
    platformLabels[caseData.platform?.toLowerCase()] ?? caseData.platform ?? "Unknown"

  return (
    <Link href={`/enforcement/cases/${caseData.id}`}>
      <Card className="transition-colors hover:bg-muted/50 cursor-pointer">
        <CardContent className="pt-1">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge
                  variant="outline"
                  className={cn("text-xs font-medium", platformColorClass)}
                >
                  {platformLabel}
                </Badge>
                <StatusBadge status={caseData.status} />
              </div>

              {caseData.source_url && (
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <ExternalLink className="size-3.5 shrink-0" />
                  <span className="truncate font-mono text-xs">
                    {truncateUrl(caseData.source_url)}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>Created {formatDate(caseData.created_at)}</span>
                {caseData.submitted_at && (
                  <span>Submitted {formatDate(caseData.submitted_at)}</span>
                )}
                {caseData.match_confidence != null && (
                  <span>{caseData.match_confidence}% match</span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
