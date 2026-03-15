"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { LoadingSpinner } from "@/components/shared/loading-spinner"
import { FaceUploadDropzone } from "@/components/identity/face-upload-dropzone"
import { EnrollmentProgress } from "@/components/identity/enrollment-progress"
import { PageHeader } from "@/components/shared/page-header"
import { Progress } from "@/components/ui/progress"
import { ShieldCheck } from "lucide-react"

export default function EnrollPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [files, setFiles] = useState<File[]>([])
  const [displayName, setDisplayName] = useState("")
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [nameError, setNameError] = useState<string | null>(null)

  const canProceed = files.length >= 5
  const canSubmit = canProceed && displayName.trim().length >= 2

  const handleFilesReady = (selectedFiles: File[]) => {
    setFiles(selectedFiles)
    if (selectedFiles.length >= 5 && step === 1) {
      setStep(2)
    }
  }

  const handleSubmit = async () => {
    if (!canSubmit) return

    // Validate display name
    if (displayName.trim().length < 2) {
      setNameError("Display name must be at least 2 characters")
      return
    }
    if (displayName.trim().length > 100) {
      setNameError("Display name must be at most 100 characters")
      return
    }
    setNameError(null)

    setUploading(true)
    setStep(2)

    try {
      const formData = new FormData()
      formData.append("displayName", displayName.trim())
      files.forEach((file) => {
        formData.append("files", file)
      })

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 500)

      const response = await fetch("/api/identity/enroll", {
        method: "POST",
        body: formData,
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      const data = await response.json()

      if (!response.ok) {
        // Show detailed errors if available
        const details = data.error?.details
        if (details && Array.isArray(details)) {
          details.forEach((d: string) => toast.error(d))
        }
        throw new Error(data.error?.message ?? "Enrollment failed")
      }

      setStep(3)
      toast.success("Identity enrolled successfully!")

      // Redirect after a short delay to show completion
      setTimeout(() => {
        router.push("/identity")
        router.refresh()
      }, 1500)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Enrollment failed"
      )
      setUploading(false)
      setUploadProgress(0)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <PageHeader
        title="Enroll Your Identity"
        description="Register your likeness with cryptographic proof of ownership"
      />

      <EnrollmentProgress currentStep={step} />

      <Card>
        <CardHeader>
          <CardTitle>
            {step === 1 && "Upload Your Photos"}
            {step === 2 && (uploading ? "Uploading & Registering" : "Verify Your Information")}
            {step === 3 && "Enrollment Complete"}
          </CardTitle>
          <CardDescription>
            {step === 1 &&
              "Upload 5-10 clear photos of your face from different angles."}
            {step === 2 &&
              (uploading
                ? "Your photos are being hashed, signed, and registered..."
                : "Confirm your display name and complete enrollment.")}
            {step === 3 &&
              "Your identity has been registered and your assets have been signed."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 1: Upload photos */}
          {step <= 2 && !uploading && (
            <FaceUploadDropzone
              onFilesReady={handleFilesReady}
              disabled={uploading}
            />
          )}

          {/* Step 2: Display name + confirm */}
          {step >= 2 && !uploading && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  placeholder="Enter your display name"
                  value={displayName}
                  onChange={(e) => {
                    setDisplayName(e.target.value)
                    setNameError(null)
                  }}
                  disabled={uploading}
                />
                {nameError && (
                  <p className="text-sm text-destructive">{nameError}</p>
                )}
              </div>
            </div>
          )}

          {/* Upload progress */}
          {uploading && (
            <div className="space-y-4">
              <div className="flex items-center justify-center py-4">
                <LoadingSpinner size="lg" />
              </div>
              <Progress value={uploadProgress}>
                <span className="text-sm text-muted-foreground">
                  {uploadProgress}%
                </span>
              </Progress>
              <p className="text-center text-sm text-muted-foreground">
                Hashing {files.length} files and creating provenance records...
              </p>
            </div>
          )}

          {/* Step 3: Complete */}
          {step === 3 && (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="rounded-full bg-green-100 p-4">
                <ShieldCheck className="size-12 text-green-600" />
              </div>
              <p className="text-center text-sm text-muted-foreground">
                {files.length} assets registered with cryptographic signatures.
                Redirecting to your identity page...
              </p>
            </div>
          )}

          {/* Submit button */}
          {!uploading && step < 3 && (
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="w-full"
              size="lg"
            >
              Upload & Register
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
