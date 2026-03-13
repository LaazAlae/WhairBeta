"use client"

import { useCallback, useState, useRef } from "react"
import {
  Upload,
  ShieldCheck,
  ShieldX,
  Clock,
  User,
  FileText,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LoadingSpinner } from "@/components/shared/loading-spinner"
import { HashDisplay } from "./hash-display"
import { VerificationBadge } from "./verification-badge"
import { cn } from "@/lib/utils"
import { format } from "date-fns"

interface ProvenanceRecord {
  id: string
  action: string
  sha256_hash: string
  hmac_signature: string
  created_at: string
}

interface VerificationResult {
  verified: boolean
  hash: string
  message: string
  creator?: {
    id: string
    display_name: string
  }
  chain?: ProvenanceRecord[]
}

export function ProvenanceViewer() {
  const [result, setResult] = useState<VerificationResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const verifyFile = useCallback(async (file: File) => {
    setLoading(true)
    setResult(null)
    setFileName(file.name)

    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/verification/verify", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error?.message ?? "Verification failed")
      }

      setResult({
        verified: data.data.verified,
        hash: data.data.hash,
        message: data.data.message,
        creator: data.data.creator,
        chain: data.data.chain,
      })
    } catch (error) {
      setResult({
        verified: false,
        hash: "",
        message:
          error instanceof Error
            ? error.message
            : "An error occurred during verification",
      })
    } finally {
      setLoading(false)
    }
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragActive(false)
      if (e.dataTransfer.files.length > 0) {
        verifyFile(e.dataTransfer.files[0])
      }
    },
    [verifyFile]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
  }, [])

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        verifyFile(e.target.files[0])
      }
      e.target.value = ""
    },
    [verifyFile]
  )

  const actionLabels: Record<string, string> = {
    registration: "Registered",
    signing: "Signed",
    verification: "Verified",
    export: "Exported",
    revocation: "Revoked",
  }

  return (
    <div className="space-y-6">
      {/* Upload zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "relative cursor-pointer rounded-lg border-2 border-dashed p-12 text-center transition-colors",
          dragActive && "border-primary bg-primary/5",
          !dragActive && "border-muted-foreground/25 hover:border-muted-foreground/50"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          onChange={handleInputChange}
          className="hidden"
        />
        <div className="flex flex-col items-center gap-3">
          <div className="rounded-full bg-muted p-4">
            <Upload className="size-8 text-muted-foreground" />
          </div>
          <div>
            <p className="text-base font-medium">
              Upload any file to check its provenance
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Drag and drop or click to browse. We will compute its SHA-256 hash
              and check against our registry.
            </p>
          </div>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-8">
            <LoadingSpinner size="lg" />
            <p className="text-sm text-muted-foreground">
              Computing hash and checking provenance for {fileName}...
            </p>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {result && !loading && (
        <div className="space-y-4">
          {/* Status card */}
          <Card
            className={cn(
              "border-2",
              result.verified ? "border-green-200" : "border-gray-200"
            )}
          >
            <CardContent className="flex flex-col items-center gap-4 py-8">
              {result.verified ? (
                <ShieldCheck className="size-16 text-green-600" />
              ) : (
                <ShieldX className="size-16 text-gray-400" />
              )}
              <div className="text-center">
                <VerificationBadge verified={result.verified} size="lg" />
                <p className="mt-2 text-lg font-medium">
                  {result.verified
                    ? "This file is verified"
                    : "No provenance record found for this file"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {result.message}
                </p>
              </div>

              {fileName && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="size-4" />
                  <span>{fileName}</span>
                </div>
              )}

              {result.hash && (
                <div className="mt-2">
                  <HashDisplay hash={result.hash} label="SHA-256" />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Creator info */}
          {result.verified && result.creator && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <User className="size-4" />
                  Creator Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-medium">{result.creator.display_name}</p>
              </CardContent>
            </Card>
          )}

          {/* Provenance chain timeline */}
          {result.verified && result.chain && result.chain.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Clock className="size-4" />
                  Provenance Chain
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative space-y-0">
                  {result.chain.map((record, index) => (
                    <div key={record.id} className="relative flex gap-4 pb-6 last:pb-0">
                      {/* Timeline line */}
                      {index < result.chain!.length - 1 && (
                        <div className="absolute left-[11px] top-6 h-full w-0.5 bg-gray-200" />
                      )}
                      {/* Timeline dot */}
                      <div className="relative z-10 mt-1 size-6 shrink-0 rounded-full bg-primary flex items-center justify-center">
                        <div className="size-2 rounded-full bg-white" />
                      </div>
                      {/* Content */}
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
      )}
    </div>
  )
}
