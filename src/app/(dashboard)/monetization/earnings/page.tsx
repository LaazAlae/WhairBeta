import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/shared/page-header"
import { EarningsChart } from "@/components/monetization/earnings-chart"
import type { License } from "@/types"

export default async function EarningsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { data: creator } = await supabase
    .from("creators")
    .select("id")
    .eq("user_id", user.id)
    .single()

  if (!creator) {
    redirect("/identity")
  }

  // Fetch all licenses to compute earnings
  const { data: licenses } = await supabase
    .from("licenses")
    .select("*")
    .eq("creator_id", creator.id)
    .order("created_at", { ascending: false })

  const allLicenses = (licenses ?? []) as License[]

  return (
    <div className="space-y-8">
      <PageHeader
        title="Earnings"
        description="Track your licensing revenue"
      />

      <EarningsChart licenses={allLicenses} />
    </div>
  )
}
