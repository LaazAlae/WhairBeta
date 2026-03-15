import { createClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/shared/page-header"
import { AssetsPageClient } from "./assets-page-client"
import type { Asset } from "@/components/identity/asset-card"

export default async function AssetsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  // Get creator profile
  const { data: creator } = await supabase
    .from("creators")
    .select("id")
    .eq("user_id", user.id)
    .single()

  if (!creator) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="Assets"
          description="You need to enroll your identity first."
        />
      </div>
    )
  }

  // Fetch all assets
  const { data } = await supabase
    .from("assets")
    .select("*")
    .eq("creator_id", creator.id)
    .neq("status", "deleted")
    .order("created_at", { ascending: false })

  const assets = (data ?? []) as Asset[]

  return <AssetsPageClient initialAssets={assets} />
}
