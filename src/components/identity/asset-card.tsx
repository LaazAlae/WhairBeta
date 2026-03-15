"use client"

import { useState } from "react"
import { Copy, Check, Trash2, PenTool, ExternalLink } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/shared/status-badge"
import { cn } from "@/lib/utils"
import { format } from "date-fns"

export interface Asset {
  id: string
  file_name: string
  file_type: string
  file_size: number
  storage_path: string
  sha256_hash: string
  hmac_signature?: string | null
  status: string
  created_at: string
}

interface AssetCardProps {
  asset: Asset
  onDelete?: (assetId: string) => void
  onSign?: (assetId: string) => void
}

export function AssetCard({ asset, onDelete, onSign }: AssetCardProps) {
  const [copied, setCopied] = useState(false)

  const truncatedHash = asset.sha256_hash
    ? `${asset.sha256_hash.slice(0, 8)}...${asset.sha256_hash.slice(-8)}`
    : "N/A"

  const copyHash = async () => {
    if (!asset.sha256_hash) return
    await navigator.clipboard.writeText(asset.sha256_hash)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const thumbnailUrl = asset.storage_path
    ? `${supabaseUrl}/storage/v1/object/public/assets/${asset.storage_path}`
    : null

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md">
      {/* Thumbnail */}
      <div className="relative aspect-square bg-muted">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={asset.file_name}
            className="size-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex size-full items-center justify-center">
            <ExternalLink className="size-8 text-muted-foreground" />
          </div>
        )}
        <div className="absolute top-2 right-2">
          <StatusBadge status={asset.status} />
        </div>
      </div>

      <CardContent className="space-y-3">
        {/* File name */}
        <p className="truncate text-sm font-medium" title={asset.file_name}>
          {asset.file_name}
        </p>

        {/* Hash with copy */}
        <div className="flex items-center gap-1.5">
          <code className="flex-1 truncate rounded bg-muted px-1.5 py-0.5 text-[11px] font-mono text-muted-foreground">
            {truncatedHash}
          </code>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={copyHash}
            title="Copy full hash"
          >
            {copied ? (
              <Check className="size-3 text-green-600" />
            ) : (
              <Copy className="size-3" />
            )}
          </Button>
        </div>

        {/* Date */}
        <p className="text-xs text-muted-foreground">
          {format(new Date(asset.created_at), "MMM d, yyyy")}
        </p>

        {/* Actions */}
        <div className="flex gap-2">
          {onSign && !asset.hmac_signature && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSign(asset.id)}
              className="flex-1"
            >
              <PenTool className="mr-1 size-3" />
              Sign
            </Button>
          )}
          {onDelete && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => onDelete(asset.id)}
              className={cn(onSign && !asset.hmac_signature ? "" : "flex-1")}
            >
              <Trash2 className="mr-1 size-3" />
              Delete
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
