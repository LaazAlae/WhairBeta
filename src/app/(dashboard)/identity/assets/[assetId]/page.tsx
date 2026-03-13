import { notFound } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/shared/page-header"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { StatusBadge } from "@/components/shared/status-badge"
import { HashDisplay } from "@/components/verification/hash-display"
import { VerificationBadge } from "@/components/verification/verification-badge"
import { ArrowLeft, Clock, FileText, HardDrive } from "lucide-react"
import { format } from "date-fns"
import type { ProvenanceRecord } from "@/lib/verification/provenance"
import { AssetDetailActions } from "./asset-detail-actions"

interface AssetDetailPageProps {
  params: Promise<{ assetId: string }>
}

export default async function AssetDetailPage({ params }: AssetDetailPageProps) {
  const { assetId } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  // Get creator
  const { data: creator } = await supabase
    .from("creators")
    .select("id")
    .eq("user_id", user.id)
    .single()

  if (!creator) return notFound()

  // Fetch asset
  const { data: asset } = await supabase
    .from("assets")
    .select("*")
    .eq("id", assetId)
    .eq("creator_id", creator.id)
    .single()

  if (!asset) return notFound()

  // Fetch provenance records
  const { data: provenanceRecords } = await supabase
    .from("provenance_records")
    .select("*")
    .eq("asset_id", assetId)
    .order("created_at", { ascending: true })

  const records = (provenanceRecords ?? []) as ProvenanceRecord[]
  const isSigned = !!asset.hmac_signature

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const imageUrl = asset.storage_path
    ? `${supabaseUrl}/storage/v1/object/public/assets/${asset.storage_path}`
    : null

  const actionLabels: Record<string, string> = {
    registration: "Registered",
    signing: "Signed",
    verification: "Verified",
    export: "Exported",
    revocation: "Revoked",
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title={asset.file_name}
        description="Asset detail and provenance chain"
        action={
          <Link href="/identity/assets">
            <Button variant="outline">
              <ArrowLeft className="mr-2 size-4" />
              Back to Assets
            </Button>
          </Link>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Image preview */}
        <Card>
          <CardContent className="p-0">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={asset.file_name}
                className="w-full rounded-xl object-contain"
              />
            ) : (
              <div className="flex aspect-square items-center justify-center rounded-xl bg-muted">
                <FileText className="size-16 text-muted-foreground" />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Metadata */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Asset Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <StatusBadge status={asset.status} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Verification</span>
                <VerificationBadge verified={isSigned} size="sm" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">File Type</span>
                <span className="text-sm">{asset.file_type}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">File Size</span>
                <span className="flex items-center gap-1 text-sm">
                  <HardDrive className="size-3" />
                  {formatFileSize(asset.file_size)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Created</span>
                <span className="flex items-center gap-1 text-sm">
                  <Clock className="size-3" />
                  {format(new Date(asset.created_at), "MMM d, yyyy 'at' h:mm a")}
                </span>
              </div>

              <div className="border-t pt-4">
                <p className="mb-2 text-sm font-medium">SHA-256 Hash</p>
                <HashDisplay hash={asset.sha256_hash} />
              </div>

              {asset.hmac_signature && (
                <div className="border-t pt-4">
                  <p className="mb-2 text-sm font-medium">HMAC Signature</p>
                  <HashDisplay hash={asset.hmac_signature} />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <AssetDetailActions
            assetId={asset.id}
            isSigned={isSigned}
            status={asset.status}
          />
        </div>
      </div>

      {/* Provenance chain */}
      {records.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="size-4" />
              Provenance Chain ({records.length} record{records.length !== 1 ? "s" : ""})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative space-y-0">
              {records.map((record, index) => (
                <div
                  key={record.id}
                  className="relative flex gap-4 pb-6 last:pb-0"
                >
                  {index < records.length - 1 && (
                    <div className="absolute left-[11px] top-6 h-full w-0.5 bg-gray-200" />
                  )}
                  <div className="relative z-10 mt-1 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary">
                    <div className="size-2 rounded-full bg-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {actionLabels[record.action] ?? record.action}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(
                          new Date(record.created_at),
                          "MMM d, yyyy 'at' h:mm a"
                        )}
                      </span>
                    </div>
                    <div className="mt-1">
                      <HashDisplay hash={record.sha256_hash} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
