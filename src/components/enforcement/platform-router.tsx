"use client"

import { ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getReportTypeLabel } from "@/lib/enforcement/platform-routes"

interface PlatformRouterProps {
  platform: string
  reportUrls: Record<string, string>
}

const platformLabels: Record<string, string> = {
  youtube: "YouTube",
  instagram: "Instagram",
  tiktok: "TikTok",
  x: "X (Twitter)",
}

export function PlatformRouter({ platform, reportUrls }: PlatformRouterProps) {
  const platformLabel =
    platformLabels[platform.toLowerCase()] ?? platform

  const reportTypes = Object.entries(reportUrls)

  if (reportTypes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Platform Reporting</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No reporting URLs are available for {platformLabel}. You may need to
            manually locate the platform&apos;s reporting form.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Report to {platformLabel}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Select the appropriate report type below to open {platformLabel}&apos;s
          reporting form in a new tab. After submitting on the platform, come back
          and update the case status.
        </p>

        <div className="flex flex-wrap gap-2">
          {reportTypes.map(([type, url]) => (
            <Button
              key={type}
              variant="outline"
              size="sm"
              render={<a href={url} target="_blank" rel="noopener noreferrer" />}
            >
                <ExternalLink className="mr-2 size-3.5" />
                {getReportTypeLabel(type)}
            </Button>
          ))}
        </div>

        <p className="text-xs text-muted-foreground border-t pt-3">
          Tip: Copy the evidence details from the packet above before opening the
          report form. Most platforms require the infringing URL, a description of
          your rights, and proof of ownership.
        </p>
      </CardContent>
    </Card>
  )
}
