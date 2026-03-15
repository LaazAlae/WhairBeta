"use client"

import { useEffect, useState } from "react"
import { Loader2, Globe, ExternalLink, ImageIcon, AlertTriangle } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""

interface Asset {
  id: string
  file_name: string
  file_type: string
  storage_path: string
  status: string
}

interface WebPage {
  url: string
  pageTitle: string | null
  fullMatchingImages: { url: string }[]
  partialMatchingImages: { url: string }[]
}

interface WebEntity {
  entityId: string
  description: string
  score: number
}

interface WebSearchResult {
  scan: Record<string, unknown>
  webDetection: {
    pagesWithMatchingImages: WebPage[]
    fullMatchingImages: { url: string; score: number }[]
    partialMatchingImages: { url: string; score: number }[]
    visuallySimilarImages: { url: string; score: number }[]
    webEntities: WebEntity[]
    bestGuessLabels: string[]
  }
  incidents: Array<{
    id: string
    source_url: string
    platform: string | null
    match_confidence: number
    status: string
  }>
}

export default function WebSearchPage() {
  const [assets, setAssets] = useState<Asset[]>([])
  const [selectedAsset, setSelectedAsset] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState<WebSearchResult | null>(null)

  useEffect(() => {
    fetchAssets()
  }, [])

  async function fetchAssets() {
    try {
      const res = await fetch("/api/identity/assets")
      const json = await res.json()
      if (json.success && Array.isArray(json.data)) {
        setAssets(json.data)
        if (json.data.length > 0) {
          setSelectedAsset(json.data[0].id)
        }
      }
    } catch (err) {
      console.error("[WebSearch] Failed to fetch assets:", err)
    } finally {
      setLoading(false)
    }
  }

  async function runWebSearch() {
    if (!selectedAsset) {
      toast.error("Please select a reference image")
      return
    }

    setScanning(true)
    setResult(null)

    try {
      const res = await fetch("/api/detection/web-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetId: selectedAsset }),
      })

      const json = await res.json()

      if (json.success) {
        setResult(json.data)
        const pageCount = json.data.webDetection.pagesWithMatchingImages.length
        const incidentCount = json.data.incidents.length
        toast.success(
          `Found ${pageCount} pages with your image. ${incidentCount} new incident(s) created.`
        )
      } else {
        toast.error(json.error?.message ?? "Web search failed")
      }
    } catch (err) {
      console.error("[WebSearch] Scan failed:", err)
      toast.error("Web search failed")
    } finally {
      setScanning(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Web Detection</h1>
        <p className="text-muted-foreground">
          Search the entire internet for where your images appear using Google Cloud Vision.
        </p>
      </div>

      {/* Search form */}
      <Card>
        <CardHeader>
          <CardTitle>Reverse Image Search</CardTitle>
          <CardDescription>
            Select one of your enrolled reference images to search for across the web.
            This uses Google Cloud Vision to find exact matches, partial matches, and visually similar images.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {assets.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertTriangle className="size-4" />
              <span>No reference images enrolled. Please enroll your identity first.</span>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {assets
                  .filter((a) => !a.file_type?.startsWith("audio/"))
                  .map((asset) => {
                    const thumbUrl = asset.storage_path
                      ? `${supabaseUrl}/storage/v1/object/public/assets/${asset.storage_path}`
                      : null
                    return (
                      <button
                        key={asset.id}
                        type="button"
                        onClick={() => setSelectedAsset(asset.id)}
                        className={`relative rounded-lg border-2 p-1 transition-all cursor-pointer ${
                          selectedAsset === asset.id
                            ? "border-primary ring-2 ring-primary/20"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <div className="aspect-square rounded bg-muted flex items-center justify-center overflow-hidden">
                          {thumbUrl ? (
                            <img
                              src={thumbUrl}
                              alt={asset.file_name}
                              className="size-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <ImageIcon className="size-8 text-muted-foreground" />
                          )}
                        </div>
                        <p className="text-xs text-center mt-1 truncate">{asset.file_name}</p>
                      </button>
                    )
                  })}
              </div>

              <Button
                onClick={runWebSearch}
                disabled={scanning || !selectedAsset}
                className="w-full sm:w-auto"
              >
                {scanning && <Loader2 className="size-4 animate-spin" />}
                {scanning ? "Searching the web..." : "Search for this image"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <div className="space-y-6">
          {/* Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold">
                  {result.webDetection.pagesWithMatchingImages.length}
                </div>
                <p className="text-sm text-muted-foreground">Pages Found</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold">
                  {result.webDetection.fullMatchingImages.length}
                </div>
                <p className="text-sm text-muted-foreground">Exact Matches</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold">
                  {result.webDetection.partialMatchingImages.length}
                </div>
                <p className="text-sm text-muted-foreground">Partial Matches</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-amber-500">
                  {result.incidents.length}
                </div>
                <p className="text-sm text-muted-foreground">New Incidents</p>
              </CardContent>
            </Card>
          </div>

          {/* Best guess labels */}
          {result.webDetection.bestGuessLabels.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Image Labels</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {result.webDetection.bestGuessLabels.map((label, i) => (
                    <Badge key={i} variant="secondary">{label}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Web entities */}
          {result.webDetection.webEntities.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Detected Entities</CardTitle>
                <CardDescription>
                  People, brands, or concepts Google identified in the image.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {result.webDetection.webEntities
                    .filter(e => e.description)
                    .map((entity, i) => (
                      <Badge key={i} variant="outline">
                        {entity.description}
                        <span className="ml-1 text-muted-foreground">
                          ({(entity.score * 100).toFixed(0)}%)
                        </span>
                      </Badge>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Pages with matching images */}
          {result.webDetection.pagesWithMatchingImages.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Pages Containing Your Image</CardTitle>
                <CardDescription>
                  Web pages where your image or a close match was found.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {result.webDetection.pagesWithMatchingImages.map((page, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30"
                    >
                      <Globe className="size-5 text-muted-foreground shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">
                          {page.pageTitle || "Untitled page"}
                        </p>
                        <a
                          href={page.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline truncate block"
                        >
                          {page.url}
                        </a>
                        <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                          {page.fullMatchingImages.length > 0 && (
                            <span>{page.fullMatchingImages.length} exact match(es)</span>
                          )}
                          {page.partialMatchingImages.length > 0 && (
                            <span>{page.partialMatchingImages.length} partial match(es)</span>
                          )}
                        </div>
                      </div>
                      <a
                        href={page.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0"
                      >
                        <ExternalLink className="size-4 text-muted-foreground hover:text-foreground" />
                      </a>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* No results */}
          {result.webDetection.pagesWithMatchingImages.length === 0 &&
            result.webDetection.fullMatchingImages.length === 0 && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <Globe className="size-12 text-emerald-500 mb-4" />
                  <h3 className="text-lg font-medium">No matches found</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Your image was not found anywhere on the web. Your likeness appears to be safe.
                  </p>
                </CardContent>
              </Card>
            )}
        </div>
      )}
    </div>
  )
}
