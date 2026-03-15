"use client"

import { useState, useCallback, useRef } from "react"
import { Plus, Upload, X, Loader2, Music } from "lucide-react"
import { toast } from "sonner"
import { PageHeader } from "@/components/shared/page-header"
import { AssetGrid } from "@/components/identity/asset-grid"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { Asset } from "@/components/identity/asset-card"

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "audio/mpeg",
  "audio/wav",
  "audio/ogg",
  "audio/mp4",
  "audio/aac",
  "audio/webm",
]
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_FILES = 10

interface AssetsPageClientProps {
  initialAssets: Asset[]
}

export function AssetsPageClient({ initialAssets }: AssetsPageClientProps) {
  const [assets, setAssets] = useState<Asset[]>(initialAssets)
  const [showUpload, setShowUpload] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [dragActive, setDragActive] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // --- Delete handler with optimistic update ---
  const handleDelete = useCallback(async (assetId: string) => {
    const previousAssets = assets
    // Optimistically remove from grid
    setAssets((prev) => prev.filter((a) => a.id !== assetId))

    try {
      const res = await fetch(`/api/identity/assets/${assetId}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error?.message ?? "Failed to delete asset")
      }

      toast.success("Asset deleted")
    } catch (err) {
      // Revert on failure
      setAssets(previousAssets)
      toast.error(err instanceof Error ? err.message : "Failed to delete asset")
    }
  }, [assets])

  // --- File processing for upload dropzone ---
  const processFiles = useCallback((incoming: FileList | File[]) => {
    setError(null)
    const incomingArray = Array.from(incoming)
    const newFiles: File[] = []
    const newPreviews: string[] = []

    for (const file of incomingArray) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        setError(`${file.name} is not a supported format. Use JPEG, PNG, WebP images or MP3, WAV, OGG, MP4, AAC, WebM audio.`)
        continue
      }
      if (file.size > MAX_FILE_SIZE) {
        setError(`${file.name} exceeds the 10MB size limit.`)
        continue
      }
      if (file.type.startsWith("image/")) {
        newPreviews.push(URL.createObjectURL(file))
      } else {
        // Audio files get no image preview
        newPreviews.push("")
      }
      newFiles.push(file)
    }

    setFiles((prev) => [...prev, ...newFiles].slice(0, MAX_FILES))
    setPreviews((prev) => [...prev, ...newPreviews].slice(0, MAX_FILES))
  }, [])

  const removeFile = useCallback(
    (index: number) => {
      if (previews[index]) {
        URL.revokeObjectURL(previews[index])
      }
      setFiles((prev) => prev.filter((_, i) => i !== index))
      setPreviews((prev) => prev.filter((_, i) => i !== index))
    },
    [previews]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragActive(false)
      if (uploading) return
      if (e.dataTransfer.files.length > 0) {
        processFiles(e.dataTransfer.files)
      }
    },
    [uploading, processFiles]
  )

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      if (!uploading) setDragActive(true)
    },
    [uploading]
  )

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
  }, [])

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        processFiles(e.target.files)
      }
      e.target.value = ""
    },
    [processFiles]
  )

  // --- Upload handler ---
  const handleUpload = useCallback(async () => {
    if (files.length === 0) return

    setUploading(true)
    try {
      const formData = new FormData()
      for (const file of files) {
        formData.append("files", file)
      }

      const res = await fetch("/api/identity/assets", {
        method: "POST",
        body: formData,
      })

      const body = await res.json()

      if (!res.ok) {
        throw new Error(body?.error?.message ?? "Upload failed")
      }

      const newAssets: Asset[] = body.data.assets
      // Prepend new assets to the grid (they are newest)
      setAssets((prev) => [...newAssets, ...prev])

      // Clean up
      previews.forEach((p) => { if (p) URL.revokeObjectURL(p) })
      setFiles([])
      setPreviews([])
      setShowUpload(false)
      setError(null)

      if (body.data.warnings) {
        toast.warning(body.data.message ?? "Some files had issues", {
          description: body.data.warnings.join(", "),
        })
      } else {
        toast.success(`${newAssets.length} asset${newAssets.length !== 1 ? "s" : ""} added`)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setUploading(false)
    }
  }, [files, previews])

  const cancelUpload = useCallback(() => {
    previews.forEach((p) => { if (p) URL.revokeObjectURL(p) })
    setFiles([])
    setPreviews([])
    setShowUpload(false)
    setError(null)
  }, [previews])

  const isAtMax = files.length >= MAX_FILES
  const acceptString = ALLOWED_TYPES.join(",")

  return (
    <div className="space-y-8">
      <PageHeader
        title="Assets"
        description={`${assets.length} registered asset${assets.length !== 1 ? "s" : ""}`}
        action={
          <Button onClick={() => setShowUpload((prev) => !prev)}>
            <Plus className="mr-2 size-4" />
            {showUpload ? "Cancel" : "Add More"}
          </Button>
        }
      />

      {/* Inline upload dropzone */}
      {showUpload && (
        <div className="space-y-4 rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium">Add more assets</h3>
              <p className="text-xs text-muted-foreground">
                Upload images or audio files. JPEG, PNG, WebP, MP3, WAV, OGG, MP4, AAC, WebM up to 10MB each.
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={cancelUpload}>
              <X className="size-4" />
            </Button>
          </div>

          {/* Dropzone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => !uploading && !isAtMax && inputRef.current?.click()}
            className={cn(
              "relative cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors",
              dragActive && "border-primary bg-primary/5",
              !dragActive && "border-muted-foreground/25 hover:border-muted-foreground/50",
              uploading && "cursor-not-allowed opacity-50",
              isAtMax && "cursor-default opacity-75"
            )}
          >
            <input
              ref={inputRef}
              type="file"
              accept={acceptString}
              multiple
              onChange={handleInputChange}
              className="hidden"
              disabled={uploading || isAtMax}
            />
            <div className="flex flex-col items-center gap-3">
              <div className="rounded-full bg-muted p-3">
                <Upload className="size-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">
                  {isAtMax
                    ? "Maximum files reached"
                    : "Drag and drop files or click to browse"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Images and audio files, up to 10MB each. Max {MAX_FILES} files per upload.
                </p>
              </div>
            </div>
          </div>

          {/* Error */}
          {error && <p className="text-sm text-destructive">{error}</p>}

          {/* File preview grid */}
          {files.length > 0 && (
            <div className="space-y-4">
              <p className="text-sm font-medium text-muted-foreground">
                {files.length} file{files.length !== 1 ? "s" : ""} selected
              </p>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
                {files.map((file, index) => (
                  <div
                    key={`${file.name}-${index}`}
                    className="group relative aspect-square overflow-hidden rounded-lg border bg-muted"
                  >
                    {previews[index] ? (
                      <img
                        src={previews[index]}
                        alt={`File ${index + 1}`}
                        className="size-full object-cover"
                      />
                    ) : (
                      <div className="flex size-full flex-col items-center justify-center gap-1">
                        <Music className="size-8 text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground">Audio</span>
                      </div>
                    )}
                    {!uploading && (
                      <Button
                        variant="destructive"
                        size="icon-xs"
                        onClick={(e) => {
                          e.stopPropagation()
                          removeFile(index)
                        }}
                        className="absolute top-1 right-1 opacity-0 transition-opacity group-hover:opacity-100"
                      >
                        <X className="size-3" />
                      </Button>
                    )}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-1.5 py-1">
                      <p className="truncate text-[10px] text-white">
                        {file.name}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Upload button */}
              <div className="flex gap-3">
                <Button onClick={handleUpload} disabled={uploading}>
                  {uploading ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 size-4" />
                      Upload {files.length} file{files.length !== 1 ? "s" : ""}
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={cancelUpload} disabled={uploading}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <AssetGrid assets={assets} onDelete={handleDelete} />
    </div>
  )
}
