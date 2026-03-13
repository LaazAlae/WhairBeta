import { ShieldAlert } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { IncidentList } from "@/components/detection/incident-list"
import { IncidentFilterTabs } from "./incident-filter-tabs"

export default async function IncidentsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  // Fetch creator record
  const { data: creator } = await supabase
    .from("creators")
    .select("id")
    .eq("user_id", user.id)
    .single()

  if (!creator) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Incidents"
          description="Review detected unauthorized uses of your likeness"
        />
        <EmptyState
          icon={ShieldAlert}
          title="No Creator Profile"
          description="You need to set up your identity profile first."
        />
      </div>
    )
  }

  // Fetch all incidents for the creator
  const { data: incidents } = await supabase
    .from("incidents")
    .select("*")
    .eq("creator_id", creator.id)
    .order("created_at", { ascending: false })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Incidents"
        description="Review detected unauthorized uses of your likeness"
      />

      <IncidentFilterTabs incidents={incidents ?? []} />
    </div>
  )
}
