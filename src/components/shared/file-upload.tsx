"use client"

import { useCallback, useRef, useState } from "react"
import { Upload, X, FileIcon, ImageIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface FileUploadProps {
  accept?: string
  maxSize?: number
  multiple?: boolean
  maxFiles?: number
  onFilesSelected: (files: File[]) => void
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function FileUpload({
  accept,
  maxSize = 10 * 1024 * 1024,
  multiple = false,
  maxFiles,
  onFilesSelected,
}: FileUploadProps) {
  const [files, setFiles] = useState<File[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const [previews, setPreviews] = useState<Record<string, string>>({})
  const inputRef = useRef<HTMLInputElement>(null)

  const acceptedTypes = accept?.split(",").map((t) => t.trim()) ?? []

  const validateFile = useCallback(
    (file: File): string | null => {
      if (acceptedTypes.length > 0) {
        const isAccepted = acceptedTypes.some((type) => {
          if (type.startsWith(".")) {
            return file.name.toLowerCase().endsWith(type.toLowerCase())
          }
          if (type.endsWith("/*")) {
            return file.type.startsWith(type.replace("/*", "/"))
          }
          return file.type === type
        })
        if (!isAccepted) {
          return `"${file.name}" is not an accepted file type.`
        }
      }
      if (file.size > maxSize) {
        return `"${file.name}" exceeds the maximum size of ${formatFileSize(maxSize)}.`
      }
      return null
    },
    [acceptedTypes, maxSize]
  )

  const generatePreview = useCallback((file: File): string | undefined => {
    if (file.type.startsWith("image/")) {
      return URL.createObjectURL(file)
    }
    return undefined
  }, [])

  const addFiles = useCallback(
    (incoming: File[]) => {
      const newFiles: File[] = []
      const newPreviews: Record<string, string> = {}

      for (const file of incoming) {
        const error = validateFile(file)
        if (error) {
          toast.error(error)
          continue
        }

        // Prevent duplicates
        const isDuplicate = files.some(
          (f) => f.name === file.name && f.size === file.size && f.lastModified === file.lastModified
        )
        if (isDuplicate) {
          toast.error(`"${file.name}" has already been added.`)
          continue
        }

        newFiles.push(file)
        const preview = generatePreview(file)
        if (preview) {
          newPreviews[`${file.name}-${file.size}-${file.lastModified}`] = preview
        }
      }

      if (newFiles.length === 0) return

      const effectiveMaxFiles = maxFiles ?? (multiple ? Infinity : 1)

      let combined: File[]
      if (!multiple) {
        // Single file mode: replace existing
        // Clean up old previews
        Object.values(previews).forEach(URL.revokeObjectURL)
        combined = [newFiles[0]]
      } else {
        combined = [...files, ...newFiles]
      }

      if (combined.length > effectiveMaxFiles) {
        toast.error(`Maximum of ${effectiveMaxFiles} files allowed.`)
        combined = combined.slice(0, effectiveMaxFiles)
      }

      setFiles(combined)
      setPreviews((prev) => {
        if (!multiple) return newPreviews
        return { ...prev, ...newPreviews }
      })
      onFilesSelected(combined)
    },
    [files, maxFiles, multiple, onFilesSelected, previews, validateFile, generatePreview]
  )

  const removeFile = useCallback(
    (index: number) => {
      const file = files[index]
      const key = `${file.name}-${file.size}-${file.lastModified}`
      if (previews[key]) {
        URL.revokeObjectURL(previews[key])
      }

      const updated = files.filter((_, i) => i !== index)
      setFiles(updated)
      setPreviews((prev) => {
        const next = { ...prev }
        delete next[key]
        return next
      })
      onFilesSelected(updated)
    },
    [files, previews, onFilesSelected]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setIsDragOver(false)
      const droppedFiles = Array.from(e.dataTransfer.files)
      addFiles(droppedFiles)
    },
    [addFiles]
  )

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = Array.from(e.target.files ?? [])
      addFiles(selectedFiles)
      // Reset input so the same file can be selected again
      e.target.value = ""
    },
    [addFiles]
  )

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 text-center cursor-pointer transition-colors",
          isDragOver
            ? "border-primary bg-primary/5"
            : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
        )}
      >
        <div className="rounded-full bg-gray-100 p-3">
          <Upload className="size-6 text-gray-500" />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-700">
            Drag & drop or click to browse
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {accept ? `Accepted: ${accept}` : "All file types accepted"} | Max{" "}
            {formatFileSize(maxSize)}
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleInputChange}
          className="hidden"
        />
      </div>

      {/* File previews */}
      {files.length > 0 && (
        <ul className="space-y-2">
          {files.map((file, index) => {
            const key = `${file.name}-${file.size}-${file.lastModified}`
            const preview = previews[key]

            return (
              <li
                key={key}
                className="flex items-center gap-3 rounded-lg border bg-white p-3"
              >
                {preview ? (
                  <img
                    src={preview}
                    alt={file.name}
                    className="size-10 rounded object-cover"
                  />
                ) : file.type.startsWith("image/") ? (
                  <div className="flex size-10 items-center justify-center rounded bg-gray-100">
                    <ImageIcon className="size-5 text-gray-400" />
                  </div>
                ) : (
                  <div className="flex size-10 items-center justify-center rounded bg-gray-100">
                    <FileIcon className="size-5 text-gray-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700 truncate">
                    {file.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(file.size)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    removeFile(index)
                  }}
                >
                  <X className="size-4" />
                  <span className="sr-only">Remove file</span>
                </Button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
