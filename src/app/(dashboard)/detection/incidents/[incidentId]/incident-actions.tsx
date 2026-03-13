"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Gavel, FileText, XCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Incident } from "@/components/detection/evidence-preview"

interface IncidentActionsProps {
  incident: Incident
}

export function IncidentActions({ incident }: IncidentActionsProps) {
  const router = useRouter()
  const [isDismissing, setIsDismissing] = useState(false)

  const isDismissed = incident.status === "dismissed"
  const isActioned = incident.status === "actioned"

  async function handleDismiss() {
    setIsDismissing(true)

    try {
      const response = await fetch(
        `/api/detection/incidents/${incident.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "dismissed" }),
        }
      )

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error?.message ?? "Failed to dismiss incident")
      }

      toast.success("Incident dismissed")
      router.refresh()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "An error occurred"
      )
    } finally {
      setIsDismissing(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button
          className="w-full justify-start"
          variant="default"
          disabled={isDismissed || isActioned}
          onClick={() =>
            router.push(`/enforcement/takedown/${incident.id}`)
          }
        >
          <Gavel className="mr-2 size-4" />
          Take It Down
        </Button>

        <Button
          className="w-full justify-start"
          variant="outline"
          disabled={isDismissed || isActioned}
          onClick={() =>
            router.push(
              `/monetization/licenses?incident=${incident.id}`
            )
          }
        >
          <FileText className="mr-2 size-4" />
          License It
        </Button>

        <Button
          className="w-full justify-start"
          variant="ghost"
          disabled={isDismissed || isActioned || isDismissing}
          onClick={handleDismiss}
        >
          {isDismissing ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <XCircle className="mr-2 size-4" />
          )}
          Dismiss
        </Button>

        {isDismissed && (
          <p className="text-center text-sm text-muted-foreground">
            This incident has been dismissed.
          </p>
        )}
        {isActioned && (
          <p className="text-center text-sm text-muted-foreground">
            Action has already been taken on this incident.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
