"use client"

import { useCallback, useState, useRef, useEffect } from "react"
import { Upload, X, CheckCircle2, ImageIcon, Music } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface FileUploadDropzoneProps {
  onFilesReady: (files: File[]) => void
  disabled?: boolean
  minFiles?: number
  maxFiles?: number
}

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

function isAudioFile(file: File): boolean {
  return file.type.startsWith("audio/")
}

export function FileUploadDropzone({
  onFilesReady,
  disabled = false,
  minFiles = 1,
  maxFiles = 10,
}: FileUploadDropzoneProps) {
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [dragActive, setDragActive] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Notify parent whenever files change — deferred to avoid setState-during-render
  useEffect(() => {
    onFilesReady(files)
  }, [files, onFilesReady])

  const processFiles = useCallback(
    (incoming: FileList | File[]) => {
      setError(null)
      const newFiles: File[] = []
      const newPreviews: string[] = []

      const incomingArray = Array.from(incoming)

      for (const file of incomingArray) {
        if (!ALLOWED_TYPES.includes(file.type)) {
          setError(`${file.name} is not a supported format. Use JPEG, PNG, WebP, MP3, WAV, OGG, or M4A.`)
          continue
        }
        if (file.size > MAX_FILE_SIZE) {
          setError(`${file.name} exceeds the 10MB size limit.`)
          continue
        }
        newFiles.push(file)
        newPreviews.push(URL.createObjectURL(file))
      }

      setFiles((prev) => [...prev, ...newFiles].slice(0, maxFiles))
      setPreviews((prev) => [...prev, ...newPreviews].slice(0, maxFiles))
    },
    [maxFiles]
  )

  const removeFile = useCallback(
    (index: number) => {
      URL.revokeObjectURL(previews[index])
      setFiles((prev) => prev.filter((_, i) => i !== index))
      setPreviews((prev) => prev.filter((_, i) => i !== index))
    },
    [previews]
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

  const hasMinimum = files.length >= minFiles
  const isAtMax = files.length >= maxFiles

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
                ? "Maximum files reached"
                : `Upload up to ${maxFiles} photos or audio files`}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Drag and drop or click to browse. Images (JPEG, PNG, WebP) or audio (MP3, WAV, OGG, M4A) up to 10MB each.
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
          {files.length} of {minFiles} minimum {minFiles === 1 ? "file" : "files"} selected
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
              {isAudioFile(files[index]) ? (
                <div className="flex size-full flex-col items-center justify-center gap-2 p-2">
                  <Music className="size-8 text-muted-foreground" />
                  <p className="line-clamp-2 text-center text-[10px] font-medium text-muted-foreground">
                    {files[index].name}
                  </p>
                </div>
              ) : (
                <img
                  src={preview}
                  alt={`Photo ${index + 1}`}
                  className="size-full object-cover"
                />
              )}
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
              {!isAudioFile(files[index]) && (
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent px-1.5 py-1">
                  <p className="truncate text-[10px] text-white">
                    {files[index].name}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
