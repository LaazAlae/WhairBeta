"use client"

import { useEffect, useState } from "react"
import { PageHeader } from "@/components/shared/page-header"
import { SignAssetForm } from "@/components/verification/sign-asset-form"
import { LoadingSpinner } from "@/components/shared/loading-spinner"
import { EmptyState } from "@/components/shared/empty-state"
import { ImageIcon } from "lucide-react"
import type { Asset } from "@/components/identity/asset-card"

export default function SignPage() {
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchAssets() {
      try {
        const response = await fetch("/api/identity/assets")
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error?.message ?? "Failed to fetch assets")
        }

        setAssets(data.data ?? [])
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load assets")
      } finally {
        setLoading(false)
      }
    }

    fetchAssets()
  }, [])

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <PageHeader
        title="Sign Content"
        description="Create a cryptographic proof of ownership for your assets"
      />

      {loading && (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {!loading && !error && assets.length === 0 && (
        <EmptyState
          icon={ImageIcon}
          title="No assets to sign"
          description="You need to enroll your identity and upload photos before you can sign assets."
          actionLabel="Enroll Identity"
          onAction={() => {
            window.location.href = "/identity/enroll"
          }}
        />
      )}

      {!loading && !error && assets.length > 0 && (
        <SignAssetForm assets={assets} />
      )}
    </div>
  )
}
