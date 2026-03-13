"use client"

import { ImageIcon } from "lucide-react"
import { AssetCard, type Asset } from "./asset-card"
import { EmptyState } from "@/components/shared/empty-state"

interface AssetGridProps {
  assets: Asset[]
  onDelete?: (assetId: string) => void
  onSign?: (assetId: string) => void
}

export function AssetGrid({ assets, onDelete, onSign }: AssetGridProps) {
  if (assets.length === 0) {
    return (
      <EmptyState
        icon={ImageIcon}
        title="No assets yet"
        description="Upload photos of your face to register your likeness and create provenance records."
        actionLabel="Enroll Now"
        onAction={() => {
          window.location.href = "/identity/enroll"
        }}
      />
    )
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {assets.map((asset) => (
        <AssetCard
          key={asset.id}
          asset={asset}
          onDelete={onDelete}
          onSign={onSign}
        />
      ))}
    </div>
  )
}
