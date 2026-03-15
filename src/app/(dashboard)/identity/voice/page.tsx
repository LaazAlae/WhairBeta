"use client"

import { useEffect, useState, useRef } from "react"
import { Loader2, Plus, Trash2, Mic, Upload, FileAudio, CheckCircle2, AlertCircle } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"

interface VoicePrint {
  id: string
  sample_name: string
  status: string
  sha256_hash: string | null
  storage_path: string
  metadata: Record<string, unknown> | null
  created_at: string
}

export default function VoiceEnrollmentPage() {
  const [voicePrints, setVoicePrints] = useState<VoicePrint[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [sampleName, setSampleName] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchVoicePrints()
  }, [])

  async function fetchVoicePrints() {
    try {
      const res = await fetch("/api/identity/voice")
      const json = await res.json()
      if (json.success) {
        setVoicePrints(json.data)
      }
    } catch (err) {
      console.error("[Voice] Failed to fetch voice prints:", err)
      toast.error("Failed to load voice samples")
    } finally {
      setLoading(false)
    }
  }

  async function uploadVoiceSample(e: React.FormEvent) {
    e.preventDefault()

    if (!selectedFile) {
      toast.error("Please select an audio file")
      return
    }

    setUploading(true)

    try {
      const formData = new FormData()
      formData.append("file", selectedFile)
      formData.append("sampleName", sampleName || `Voice sample ${voicePrints.length + 1}`)

      const res = await fetch("/api/identity/voice", {
        method: "POST",
        body: formData,
      })

      const json = await res.json()

      if (json.success) {
        toast.success("Voice sample uploaded successfully")
        setVoicePrints([json.data, ...voicePrints])
        setShowForm(false)
        setSampleName("")
        setSelectedFile(null)
      } else {
        toast.error(json.error?.message ?? "Failed to upload voice sample")
      }
    } catch (err) {
      console.error("[Voice] Upload failed:", err)
      toast.error("Failed to upload voice sample")
    } finally {
      setUploading(false)
    }
  }

  async function deleteVoicePrint(voiceId: string) {
    try {
      const res = await fetch(`/api/identity/voice/${voiceId}`, {
        method: "DELETE",
      })
      const json = await res.json()
      if (json.success) {
        setVoicePrints(voicePrints.filter(v => v.id !== voiceId))
        toast.success("Voice sample deleted")
      }
    } catch {
      toast.error("Failed to delete voice sample")
    }
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Voice Enrollment</h1>
          <p className="text-muted-foreground">
            Upload voice samples to register your voiceprint for audio likeness detection.
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="size-4" />
          Add Voice Sample
        </Button>
      </div>

      {/* Info card */}
      <Card className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30">
        <CardContent className="flex gap-3 py-4">
          <Mic className="size-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-blue-900 dark:text-blue-100">About Voice Enrollment</p>
            <p className="text-blue-700 dark:text-blue-300 mt-1">
              Upload clear audio recordings of your voice (at least 5 seconds each). These samples
              will be used to create a voiceprint that can help detect unauthorized use of your
              voice in AI-generated content, deepfakes, and unauthorized recordings.
            </p>
            <p className="text-blue-700 dark:text-blue-300 mt-1">
              For best results, upload 3+ samples with different speaking styles (reading, conversation, presentation).
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Upload form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Upload Voice Sample</CardTitle>
            <CardDescription>
              Upload an audio file (MP3, WAV, OGG, M4A) of your voice. Minimum 5 seconds.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={uploadVoiceSample} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="sampleName">Sample Name</Label>
                <Input
                  id="sampleName"
                  value={sampleName}
                  onChange={(e) => setSampleName(e.target.value)}
                  placeholder="e.g., Speaking sample - interview"
                />
              </div>

              <div className="space-y-2">
                <Label>Audio File</Label>
                <div
                  className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {selectedFile ? (
                    <div className="flex items-center justify-center gap-3">
                      <FileAudio className="size-8 text-primary" />
                      <div className="text-left">
                        <p className="font-medium">{selectedFile.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatFileSize(selectedFile.size)}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <Upload className="size-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Click to select an audio file
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        MP3, WAV, OGG, M4A — Max 20MB
                      </p>
                    </>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={uploading || !selectedFile}>
                  {uploading && <Loader2 className="size-4 animate-spin" />}
                  Upload Sample
                </Button>
                <Button type="button" variant="outline" onClick={() => {
                  setShowForm(false)
                  setSelectedFile(null)
                }}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Voice prints list */}
      {voicePrints.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Mic className="size-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No voice samples</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md">
              Upload voice recordings to register your voiceprint. This enables audio-based
              likeness detection.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {voicePrints.map((vp) => (
            <Card key={vp.id}>
              <CardContent className="flex items-center gap-4 py-4">
                <FileAudio className="size-8 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate">{vp.sample_name}</p>
                    <Badge
                      variant={vp.status === "ready" ? "default" : "secondary"}
                    >
                      {vp.status === "ready" && <CheckCircle2 className="size-3" />}
                      {vp.status === "failed" && <AlertCircle className="size-3" />}
                      {vp.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {vp.metadata && typeof vp.metadata === "object" && "original_filename" in vp.metadata
                      ? String(vp.metadata.original_filename)
                      : vp.storage_path.split("/").pop()}
                    {" — "}
                    {new Date(vp.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => deleteVoicePrint(vp.id)}
                  title="Delete voice sample"
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
