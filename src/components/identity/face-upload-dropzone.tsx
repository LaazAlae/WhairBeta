"use client"

import { useCallback, useState, useRef } from "react"
import { Upload, X, CheckCircle2, ImageIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface FaceUploadDropzoneProps {
  onFilesReady: (files: File[]) => void
  disabled?: boolean
}

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"]
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const MIN_FILES = 5
const MAX_FILES = 10

export function FaceUploadDropzone({
  onFilesReady,
  disabled = false,
}: FaceUploadDropzoneProps) {
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [dragActive, setDragActive] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const processFiles = useCallback(
    (incoming: FileList | File[]) => {
      setError(null)
      const newFiles: File[] = []
      const newPreviews: string[] = []

      const incomingArray = Array.from(incoming)

      for (const file of incomingArray) {
        if (!ALLOWED_TYPES.includes(file.type)) {
          setError(`${file.name} is not a supported image format. Use JPEG, PNG, or WebP.`)
          continue
        }
        if (file.size > MAX_FILE_SIZE) {
          setError(`${file.name} exceeds the 10MB size limit.`)
          continue
        }
        newFiles.push(file)
        newPreviews.push(URL.createObjectURL(file))
      }

      setFiles((prev) => {
        const combined = [...prev, ...newFiles].slice(0, MAX_FILES)
        onFilesReady(combined)
        return combined
      })
      setPreviews((prev) => [...prev, ...newPreviews].slice(0, MAX_FILES))
    },
    [onFilesReady]
  )

  const removeFile = useCallback(
    (index: number) => {
      URL.revokeObjectURL(previews[index])
      setFiles((prev) => {
        const updated = prev.filter((_, i) => i !== index)
        onFilesReady(updated)
        return updated
      })
      setPreviews((prev) => prev.filter((_, i) => i !== index))
    },
    [previews, onFilesReady]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragActive(false)
      if (disabled) return
      if (e.dataTransfer.files.length > 0) {
        processFiles(e.dataTransfer.files)
      }
    },
    [disabled, processFiles]
  )

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      if (!disabled) setDragActive(true)
    },
    [disabled]
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
      // Reset input so same file can be re-selected
      e.target.value = ""
    },
    [processFiles]
  )

  const hasMinimum = files.length >= MIN_FILES
  const isAtMax = files.length >= MAX_FILES

  return (
    <div className="space-y-4">
      {/* Dropzone area */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !disabled && !isAtMax && inputRef.current?.click()}
        className={cn(
          "relative cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors",
          dragActive && "border-primary bg-primary/5",
          !dragActive && "border-muted-foreground/25 hover:border-muted-foreground/50",
          disabled && "cursor-not-allowed opacity-50",
          isAtMax && "cursor-default opacity-75"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED_TYPES.join(",")}
          multiple
          onChange={handleInputChange}
          className="hidden"
          disabled={disabled || isAtMax}
        />
        <div className="flex flex-col items-center gap-3">
          <div className="rounded-full bg-muted p-3">
            <Upload className="size-6 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium">
              {isAtMax
                ? "Maximum photos reached"
                : "Upload 5-10 clear photos of your face"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Drag and drop or click to browse. JPEG, PNG, or WebP up to 10MB each.
            </p>
          </div>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {/* Progress counter */}
      <div className="flex items-center gap-2">
        {hasMinimum ? (
          <CheckCircle2 className="size-4 text-green-600" />
        ) : (
          <ImageIcon className="size-4 text-muted-foreground" />
        )}
        <span
          className={cn(
            "text-sm font-medium",
            hasMinimum ? "text-green-600" : "text-muted-foreground"
          )}
        >
          {files.length} of {MIN_FILES} minimum photos selected
        </span>
      </div>

      {/* Preview grid */}
      {files.length > 0 && (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
          {previews.map((preview, index) => (
            <div
              key={`${files[index].name}-${index}`}
              className="group relative aspect-square overflow-hidden rounded-lg border bg-muted"
            >
              <img
                src={preview}
                alt={`Photo ${index + 1}`}
                className="size-full object-cover"
              />
              {!disabled && (
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
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent px-1.5 py-1">
                <p className="truncate text-[10px] text-white">
                  {files[index].name}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
