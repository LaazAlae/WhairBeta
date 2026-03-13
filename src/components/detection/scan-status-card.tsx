"use client"

import { format } from "date-fns"
import { AlertCircle, Clock, ImageIcon, ScanFace, Users } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { StatusBadge } from "@/components/shared/status-badge"

export interface Scan {
  id: string
  creator_id: string
  scan_type: "url" | "image_upload" | "scheduled"
  target_url: string | null
  uploaded_image_path: string | null
  status: "pending" | "processing" | "completed" | "failed"
  total_images_found: number | null
  total_faces_detected: number | null
  total_matches: number | null
  error_message: string | null
  started_at: string | null
  completed_at: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}

interface ScanStatusCardProps {
  scan: Scan
}

export function ScanStatusCard({ scan }: ScanStatusCardProps) {
  const isProcessing = scan.status === "processing"
  const isFailed = scan.status === "failed"

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-semibold">Scan Details</CardTitle>
        <StatusBadge status={scan.status} />
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress bar for processing state */}
        {isProcessing && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Scan in progress...
            </p>
            <Progress value={null} />
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4">
          <div className="flex items-center gap-2">
            <div className="rounded-md bg-blue-50 p-2">
              <ImageIcon className="size-4 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Images Found</p>
              <p className="text-lg font-semibold">
                {scan.total_images_found ?? 0}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="rounded-md bg-purple-50 p-2">
              <ScanFace className="size-4 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Faces Detected</p>
              <p className="text-lg font-semibold">
                {scan.total_faces_detected ?? 0}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="rounded-md bg-emerald-50 p-2">
              <Users className="size-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Matches</p>
              <p className="text-lg font-semibold">
                {scan.total_matches ?? 0}
              </p>
            </div>
          </div>
        </div>

        {/* Scan info */}
        <div className="space-y-2 text-sm">
          {scan.target_url && (
            <div className="flex items-start gap-2">
              <span className="shrink-0 text-muted-foreground">Target:</span>
              <a
                href={scan.target_url}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate text-blue-600 hover:underline"
              >
                {scan.target_url}
              </a>
            </div>
          )}

          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Type:</span>
            <span className="capitalize">
              {scan.scan_type.replace("_", " ")}
            </span>
          </div>
        </div>

        {/* Timestamps */}
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
          {scan.started_at && (
            <div className="flex items-center gap-1">
              <Clock className="size-3" />
              Started: {format(new Date(scan.started_at), "MMM d, yyyy HH:mm")}
            </div>
          )}
          {scan.completed_at && (
            <div className="flex items-center gap-1">
              <Clock className="size-3" />
              Completed:{" "}
              {format(new Date(scan.completed_at), "MMM d, yyyy HH:mm")}
            </div>
          )}
        </div>

        {/* Error message for failed scans */}
        {isFailed && scan.error_message && (
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertTitle>Scan Failed</AlertTitle>
            <AlertDescription>{scan.error_message}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
