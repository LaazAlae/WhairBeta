"use client"

import { useRouter } from "next/navigation"
import { ShieldAlert } from "lucide-react"
import { EmptyState } from "@/components/shared/empty-state"
import { IncidentCard } from "./incident-card"
import type { Incident } from "./evidence-preview"

interface IncidentListProps {
  incidents: Incident[]
  emptyMessage?: string
}

/**
 * Renders a list of IncidentCards with an empty state fallback.
 */
export function IncidentList({
  incidents,
  emptyMessage = "No incidents found",
}: IncidentListProps) {
  const router = useRouter()

  if (incidents.length === 0) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="No Incidents"
        description={emptyMessage}
      />
    )
  }

  return (
    <div className="space-y-3">
      {incidents.map((incident) => (
        <IncidentCard
          key={incident.id}
          incident={incident}
          onClick={() =>
            router.push(`/detection/incidents/${incident.id}`)
          }
        />
      ))}
    </div>
  )
}
