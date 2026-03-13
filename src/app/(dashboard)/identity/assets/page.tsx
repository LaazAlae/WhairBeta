import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/shared/page-header"
import { Button } from "@/components/ui/button"
import { AssetGrid } from "@/components/identity/asset-grid"
import { Plus } from "lucide-react"
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

  return (
    <div className="space-y-8">
      <PageHeader
        title="Assets"
        description={`${assets.length} registered asset${assets.length !== 1 ? "s" : ""}`}
        action={
          <Link href="/identity/enroll">
            <Button>
              <Plus className="mr-2 size-4" />
              Add Photos
            </Button>
          </Link>
        }
      />

      <AssetGrid assets={assets} />
    </div>
  )
}
