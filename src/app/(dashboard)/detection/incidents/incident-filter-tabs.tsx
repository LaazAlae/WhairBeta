"use client"

import { useState } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { IncidentList } from "@/components/detection/incident-list"
import type { Incident } from "@/components/detection/evidence-preview"

interface IncidentFilterTabsProps {
  incidents: Incident[]
}

export function IncidentFilterTabs({ incidents }: IncidentFilterTabsProps) {
  const [activeTab, setActiveTab] = useState("all")

  const newIncidents = incidents.filter((i) => i.status === "new")
  const confirmedIncidents = incidents.filter((i) => i.status === "confirmed")
  const actionedIncidents = incidents.filter((i) => i.status === "actioned")

  return (
    <Tabs
      defaultValue="all"
      value={activeTab}
      onValueChange={(val) => {
        if (typeof val === "string") setActiveTab(val)
      }}
    >
      <TabsList>
        <TabsTrigger value="all">All ({incidents.length})</TabsTrigger>
        <TabsTrigger value="new">New ({newIncidents.length})</TabsTrigger>
        <TabsTrigger value="confirmed">
          Confirmed ({confirmedIncidents.length})
        </TabsTrigger>
        <TabsTrigger value="actioned">
          Actioned ({actionedIncidents.length})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="all" className="mt-4">
        <IncidentList
          incidents={incidents}
          emptyMessage="No incidents detected yet. Run a scan to get started."
        />
      </TabsContent>

      <TabsContent value="new" className="mt-4">
        <IncidentList
          incidents={newIncidents}
          emptyMessage="No new incidents to review."
        />
      </TabsContent>

      <TabsContent value="confirmed" className="mt-4">
        <IncidentList
          incidents={confirmedIncidents}
          emptyMessage="No confirmed incidents."
        />
      </TabsContent>

      <TabsContent value="actioned" className="mt-4">
        <IncidentList
          incidents={actionedIncidents}
          emptyMessage="No actioned incidents."
        />
      </TabsContent>
    </Tabs>
  )
}
