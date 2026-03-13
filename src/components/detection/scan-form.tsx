"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Globe, Upload, Search, Loader2 } from "lucide-react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

type ScanStep = "idle" | "scanning" | "extracting" | "comparing" | "done"

const stepMessages: Record<ScanStep, string> = {
  idle: "",
  scanning: "Scanning... Fetching content from URL",
  extracting: "Extracting images from page...",
  comparing: "Comparing faces against your reference photos...",
  done: "Scan complete! Redirecting...",
}

export function ScanForm() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("url")
  const [targetUrl, setTargetUrl] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [step, setStep] = useState<ScanStep>("idle")

  async function handleUrlSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!targetUrl.trim()) {
      toast.error("Please enter a URL to scan")
      return
    }

    // Basic URL validation
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

    setIsSubmitting(true)
    setStep("scanning")

    try {
      // Simulate progression steps for UX
      const stepTimer1 = setTimeout(() => setStep("extracting"), 3000)
      const stepTimer2 = setTimeout(() => setStep("comparing"), 6000)

      const response = await fetch("/api/detection/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scanType: "url", targetUrl }),
      })

      clearTimeout(stepTimer1)
      clearTimeout(stepTimer2)

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error?.message ?? "Failed to initiate scan")
      }

      setStep("done")
      toast.success("Scan completed successfully")

      const scanId = data.data?.scan?.id
      if (scanId) {
        router.push(`/detection/results/${scanId}`)
      } else {
        router.push("/detection/results")
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "An error occurred"
      )
      setStep("idle")
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleImageSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!selectedFile) {
      toast.error("Please select an image to upload")
      return
    }

    // Validate file type
    if (
      !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(
        selectedFile.type
      )
    ) {
      toast.error("File must be a JPEG, PNG, WebP, or GIF image")
      return
    }

    // Validate file size (10MB)
    if (selectedFile.size > 10 * 1024 * 1024) {
      toast.error("File must be less than 10MB")
      return
    }

    setIsSubmitting(true)
    setStep("comparing")

    try {
      const formData = new FormData()
      formData.append("scanType", "image_upload")
      formData.append("file", selectedFile)

      const response = await fetch("/api/detection/scan", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error?.message ?? "Failed to initiate scan")
      }

      setStep("done")
      toast.success("Scan completed successfully")

      const scanId = data.data?.scan?.id
      if (scanId) {
        router.push(`/detection/results/${scanId}`)
      } else {
        router.push("/detection/results")
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "An error occurred"
      )
      setStep("idle")
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    setSelectedFile(file)
  }

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
            <TabsTrigger value="url">
              <Globe className="mr-1.5 size-4" />
              Scan URL
            </TabsTrigger>
            <TabsTrigger value="upload">
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

        {isSubmitting && step !== "idle" && (
          <div className="mt-4 flex items-center gap-3 rounded-lg bg-muted px-4 py-3">
            <Loader2 className="size-4 animate-spin text-primary" />
            <p className="text-sm font-medium text-muted-foreground">
              {stepMessages[step]}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
