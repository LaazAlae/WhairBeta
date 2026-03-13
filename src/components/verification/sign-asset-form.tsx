"use client"

import { useState } from "react"
import { PenTool } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { LoadingSpinner } from "@/components/shared/loading-spinner"
import { HashDisplay } from "./hash-display"
import type { Asset } from "@/components/identity/asset-card"

interface SignAssetFormProps {
  assets: Asset[]
}

interface SignResult {
  hash: string
  signature: string
  signedAt: string
  keyId: string
}

export function SignAssetForm({ assets }: SignAssetFormProps) {
  const [selectedAssetId, setSelectedAssetId] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<SignResult | null>(null)

  const selectedAsset = assets.find((a) => a.id === selectedAssetId)

  const handleSign = async () => {
    if (!selectedAssetId) {
      toast.error("Please select an asset to sign")
      return
    }

    setLoading(true)
    setResult(null)

    try {
      const response = await fetch("/api/verification/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetId: selectedAssetId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error?.message ?? "Failed to sign asset")
      }

      setResult({
        hash: data.data.hash,
        signature: data.data.signature,
        signedAt: data.data.signedAt,
        keyId: data.data.provenanceRecord?.signing_key_id ?? "",
      })

      toast.success("Asset signed successfully!")
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to sign asset"
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Sign an Asset</CardTitle>
          <CardDescription>
            Select an asset to create a cryptographic proof of ownership.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Asset</label>
            <Select value={selectedAssetId} onValueChange={(v) => v && setSelectedAssetId(v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose an asset to sign..." />
              </SelectTrigger>
              <SelectContent>
                {assets.map((asset) => (
                  <SelectItem key={asset.id} value={asset.id}>
                    {asset.file_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedAsset && (
            <div className="rounded-lg border bg-muted/50 p-3">
              <p className="text-sm font-medium">{selectedAsset.file_name}</p>
              <p className="text-xs text-muted-foreground">
                Status: {selectedAsset.status} | Type: {selectedAsset.file_type}
              </p>
            </div>
          )}

          <Button
            onClick={handleSign}
            disabled={!selectedAssetId || loading}
            className="w-full"
          >
            {loading ? (
              <LoadingSpinner size="sm" />
            ) : (
              <>
                <PenTool className="mr-2 size-4" />
                Sign Asset
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Signature result */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="text-green-600">Signature Created</CardTitle>
            <CardDescription>
              Your asset has been cryptographically signed.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">
                SHA-256 Hash
              </p>
              <HashDisplay hash={result.hash} />
            </div>
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">
                HMAC Signature
              </p>
              <HashDisplay hash={result.signature} />
            </div>
            <div className="flex gap-6">
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Signed At
                </p>
                <p className="text-sm">{new Date(result.signedAt).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Key ID
                </p>
                <p className="text-sm font-mono">{result.keyId}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
