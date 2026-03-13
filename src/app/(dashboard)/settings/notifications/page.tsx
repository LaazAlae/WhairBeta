"use client"

import { useState } from "react"
import { PageHeader } from "@/components/shared/page-header"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Loader2, Bell, Mail } from "lucide-react"
import { toast } from "sonner"

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
        checked ? "bg-primary" : "bg-gray-200"
      }`}
    >
      <span
        className={`pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  )
}

export default function NotificationsPage() {
  const [loading, setLoading] = useState(false)
  const [detectionAlerts, setDetectionAlerts] = useState(true)
  const [caseUpdates, setCaseUpdates] = useState(true)

  async function handleSave() {
    setLoading(true)

    try {
      const response = await fetch("/api/settings/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          detectionAlerts,
          caseUpdates,
        }),
      })

      if (!response.ok) {
        toast.error("Failed to save preferences")
        return
      }

      toast.success("Notification preferences saved")
    } catch {
      toast.error("An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Notifications"
        description="Configure how and when you receive alerts"
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="size-5" />
            Email Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Detection Alerts */}
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-blue-50 p-2 mt-0.5">
                <Mail className="size-4 text-blue-600" />
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-medium">New Detection Alerts</Label>
                <p className="text-xs text-muted-foreground">
                  Receive an email when a new unauthorized use of your likeness
                  is detected
                </p>
              </div>
            </div>
            <Toggle checked={detectionAlerts} onChange={setDetectionAlerts} />
          </div>

          <Separator />

          {/* Case Updates */}
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-purple-50 p-2 mt-0.5">
                <Mail className="size-4 text-purple-600" />
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-medium">Case Update Alerts</Label>
                <p className="text-xs text-muted-foreground">
                  Receive an email when there are updates to your enforcement
                  cases
                </p>
              </div>
            </div>
            <Toggle checked={caseUpdates} onChange={setCaseUpdates} />
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleSave} disabled={loading}>
            {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
            Save Preferences
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
