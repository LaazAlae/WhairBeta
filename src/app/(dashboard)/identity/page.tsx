import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/shared/page-header"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { StatusBadge } from "@/components/shared/status-badge"
import { AssetGrid } from "@/components/identity/asset-grid"
import { UserCircle, Plus, ShieldCheck } from "lucide-react"
import type { Asset } from "@/components/identity/asset-card"

export default async function IdentityPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  // Fetch creator profile
  const { data: creator } = await supabase
    .from("creators")
    .select("*")
    .eq("user_id", user.id)
    .single()

  // Fetch assets if enrolled
  let assets: Asset[] = []
  if (creator?.enrollment_completed) {
    const { data } = await supabase
      .from("assets")
      .select("*")
      .eq("creator_id", creator.id)
      .neq("status", "deleted")
      .order("created_at", { ascending: false })

    assets = (data ?? []) as Asset[]
  }

  const isEnrolled = creator?.enrollment_completed === true

  return (
    <div className="space-y-8">
      <PageHeader
        title="Identity"
        description="Manage your registered likeness"
        action={
          isEnrolled ? (
            <Link href="/identity/enroll">
              <Button>
                <Plus className="mr-2 size-4" />
                Add More Photos
              </Button>
            </Link>
          ) : undefined
        }
      />

      {!isEnrolled ? (
        /* Enrollment CTA */
        <Card className="mx-auto max-w-lg">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 rounded-full bg-primary/10 p-4">
              <UserCircle className="size-12 text-primary" />
            </div>
            <CardTitle className="text-xl">Enroll Your Identity</CardTitle>
            <CardDescription>
              Register your likeness to create cryptographic proof of ownership.
              Upload clear photos of your face to get started.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Link href="/identity/enroll">
              <Button size="lg">
                <ShieldCheck className="mr-2 size-4" />
                Start Enrollment
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        /* Enrolled view */
        <div className="space-y-8">
          {/* Profile summary */}
          <Card>
            <CardContent className="flex items-center gap-4 py-2">
              <div className="rounded-full bg-primary/10 p-3">
                <UserCircle className="size-8 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-lg font-medium">
                  {creator.display_name ?? "Creator"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {assets.length} registered asset{assets.length !== 1 ? "s" : ""}
                </p>
              </div>
              <StatusBadge status={creator.verification_status ?? "pending"} />
            </CardContent>
          </Card>

          {/* Assets */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Your Assets</h2>
              <Link href="/identity/assets">
                <Button variant="outline" size="sm">
                  View All
                </Button>
              </Link>
            </div>
            <AssetGrid assets={assets.slice(0, 8)} />
          </div>
        </div>
      )}
    </div>
  )
}
