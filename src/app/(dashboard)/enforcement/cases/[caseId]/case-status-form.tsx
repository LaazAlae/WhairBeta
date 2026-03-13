"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ENFORCEMENT_CASE_STATUSES } from "@/lib/validations/enforcement"

interface CaseStatusFormProps {
  caseId: string
  currentStatus: string
}

const statusLabels: Record<string, string> = {
  draft: "Draft",
  submitted: "Submitted",
  acknowledged: "Acknowledged",
  in_review: "In Review",
  removed: "Removed",
  denied: "Denied",
  appealed: "Appealed",
  closed: "Closed",
}

export function CaseStatusForm({ caseId, currentStatus }: CaseStatusFormProps) {
  const router = useRouter()
  const [status, setStatus] = useState(currentStatus)
  const [notes, setNotes] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (status === currentStatus && !notes.trim()) return

    try {
      setSaving(true)
      setError(null)
      setSuccess(false)

      const body: Record<string, string> = { status }
      if (notes.trim()) body.resolutionNotes = notes.trim()

      const res = await fetch(`/api/enforcement/cases/${caseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error?.message ?? "Failed to update case")
      }

      setSuccess(true)
      setNotes("")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Update Status</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {success && (
            <Alert>
              <CheckCircle2 className="size-4 text-emerald-600" />
              <AlertDescription className="text-emerald-700">
                Case status updated successfully.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={(v) => v && setStatus(v)}>
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ENFORCEMENT_CASE_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {statusLabels[s] ?? s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add resolution notes, platform response details, or other context..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              maxLength={2000}
            />
            <p className="text-xs text-muted-foreground text-right">
              {notes.length}/2000
            </p>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={saving || (status === currentStatus && !notes.trim())}
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Update Case"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
