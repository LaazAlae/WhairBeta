"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Globe, Upload, Search, Loader2, CheckCircle2, AlertTriangle } from "lucide-react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

interface ScanProgress {
  phase: string
  current: number
  total: number
  matches: number
  message: string
}

export function ScanForm() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("url")
  const [targetUrl, setTargetUrl] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [progress, setProgress] = useState<ScanProgress | null>(null)

  const runStreamingScan = useCallback(
    async (requestInit: RequestInit) => {
      setIsSubmitting(true)
      setProgress({
        phase: "fetching",
        current: 0,
        total: 0,
        matches: 0,
        message: "Starting scan...",
      })

      try {
        const response = await fetch("/api/detection/scan", {
          ...requestInit,
          headers: {
            ...((requestInit.headers as Record<string, string>) ?? {}),
            Accept: "text/event-stream",
          },
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error?.message ?? "Failed to initiate scan")
        }

        const reader = response.body?.getReader()
        if (!reader) throw new Error("No response stream")

        const decoder = new TextDecoder()
        let buffer = ""
        let scanId: string | null = null

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split("\n\n")
          buffer = lines.pop() ?? ""

          for (const line of lines) {
            const dataLine = line.replace(/^data: /, "").trim()
            if (!dataLine) continue

            try {
              const event = JSON.parse(dataLine)

              if (event.phase === "done") {
                scanId = event.scan?.id ?? null
                setProgress({
                  phase: "complete",
                  current: event.result?.imagesFound ?? 0,
                  total: event.result?.imagesFound ?? 0,
                  matches: event.result?.matches ?? 0,
                  message: `Scan complete — ${event.result?.matches ?? 0} match${(event.result?.matches ?? 0) !== 1 ? "es" : ""} found`,
                })
              } else {
                setProgress(event as ScanProgress)
              }
            } catch {
              // Skip malformed events
            }
          }
        }

        toast.success("Scan completed successfully")

        // Brief delay to show completion state
        await new Promise((r) => setTimeout(r, 800))

        if (scanId) {
          router.push(`/detection/results/${scanId}`)
        } else {
          router.push("/detection/results")
        }
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "An error occurred"
        )
        setProgress(null)
      } finally {
        setIsSubmitting(false)
      }
    },
    [router]
  )

  async function handleUrlSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!targetUrl.trim()) {
      toast.error("Please enter a URL to scan")
      return
    }

    try {
      const parsed = new URL(targetUrl)
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        toast.error("URL must use http or https protocol")
        return
      }
    } catch {
      toast.error("Please enter a valid URL")
      return
    }

    await runStreamingScan({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scanType: "url", targetUrl }),
    })
  }

  async function handleImageSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!selectedFile) {
      toast.error("Please select an image to upload")
      return
    }

    if (
      !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(
        selectedFile.type
      )
    ) {
      toast.error("File must be a JPEG, PNG, WebP, or GIF image")
      return
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      toast.error("File must be less than 10MB")
      return
    }

    const formData = new FormData()
    formData.append("scanType", "image_upload")
    formData.append("file", selectedFile)

    await runStreamingScan({
      method: "POST",
      body: formData,
    })
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    setSelectedFile(file)
  }

  const progressPercent =
    progress && progress.total > 0
      ? Math.round((progress.current / progress.total) * 100)
      : progress?.phase === "fetching"
        ? 5
        : 0

  const isComplete = progress?.phase === "complete"
  const isError = progress?.phase === "error"

  return (
    <Card>
      <CardHeader>
        <CardTitle>Start a New Scan</CardTitle>
        <CardDescription>
          Choose a scan method to detect unauthorized uses of your likeness
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs
          defaultValue="url"
          value={activeTab}
          onValueChange={(value) => {
            if (typeof value === "string") setActiveTab(value)
          }}
        >
          <TabsList>
            <TabsTrigger value="url" disabled={isSubmitting}>
              <Globe className="mr-1.5 size-4" />
              Scan URL
            </TabsTrigger>
            <TabsTrigger value="upload" disabled={isSubmitting}>
              <Upload className="mr-1.5 size-4" />
              Upload Image
            </TabsTrigger>
          </TabsList>

          <TabsContent value="url">
            <form onSubmit={handleUrlSubmit} className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="target-url">URL to scan</Label>
                <Input
                  id="target-url"
                  type="url"
                  placeholder="https://example.com/page-to-check"
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  disabled={isSubmitting}
                />
                <p className="text-xs text-muted-foreground">
                  Enter a webpage URL or a direct image URL to check for your
                  likeness
                </p>
              </div>
              <Button type="submit" disabled={isSubmitting || !targetUrl.trim()}>
                {isSubmitting ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Search className="mr-2 size-4" />
                )}
                Scan
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="upload">
            <form onSubmit={handleImageSubmit} className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="upload-image">Image to compare</Label>
                <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 p-8 transition-colors hover:border-muted-foreground/50">
                  <Upload className="mb-2 size-8 text-muted-foreground" />
                  <p className="mb-2 text-sm text-muted-foreground">
                    {selectedFile
                      ? selectedFile.name
                      : "Click to select or drag and drop"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    JPEG, PNG, WebP, or GIF (max 10MB)
                  </p>
                  <input
                    id="upload-image"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleFileChange}
                    disabled={isSubmitting}
                    className="absolute inset-0 cursor-pointer opacity-0"
                    style={{ position: "relative" }}
                  />
                </div>
              </div>
              <Button
                type="submit"
                disabled={isSubmitting || !selectedFile}
              >
                {isSubmitting ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Search className="mr-2 size-4" />
                )}
                Compare
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        {/* Progress indicator */}
        {progress && (
          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                {isComplete ? (
                  <CheckCircle2 className="size-4 text-emerald-600" />
                ) : isError ? (
                  <AlertTriangle className="size-4 text-red-500" />
                ) : (
                  <Loader2 className="size-4 animate-spin text-primary" />
                )}
                <span className="font-medium">{progress.message}</span>
              </div>
              {progress.total > 0 && (
                <span className="text-muted-foreground tabular-nums">
                  {progress.current}/{progress.total}
                </span>
              )}
            </div>

            <Progress
              value={isComplete ? 100 : progressPercent}
              className="h-2"
            />

            {progress.matches > 0 && (
              <p className="text-sm text-emerald-600 font-medium">
                {progress.matches} match{progress.matches !== 1 ? "es" : ""} found so far
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
