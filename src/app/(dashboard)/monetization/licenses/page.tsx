import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/shared/page-header"
import { LicenseCard } from "@/components/monetization/license-card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { FileText } from "lucide-react"
import type { License } from "@/types"

export default async function LicensesPage() {
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

  const { data: licenses } = await supabase
    .from("licenses")
    .select("*")
    .eq("creator_id", creator.id)
    .order("created_at", { ascending: false })

  const allLicenses = (licenses ?? []) as License[]
  const pendingLicenses = allLicenses.filter((l) => l.status === "pending")
  const activeLicenses = allLicenses.filter((l) => l.status === "active")
  const expiredLicenses = allLicenses.filter(
    (l) => l.status === "expired" || l.status === "revoked"
  )

  function renderLicenseList(items: License[], emptyMessage: string) {
    if (items.length === 0) {
      return (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="mb-4 rounded-full bg-muted p-4">
                <FileText className="size-8 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">{emptyMessage}</p>
            </div>
          </CardContent>
        </Card>
      )
    }

    return (
      <div className="space-y-3">
        {items.map((license) => (
          <LicenseCard key={license.id} license={license} />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Licenses"
        description="Manage all licensing agreements for your likeness"
      />

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">
            All ({allLicenses.length})
          </TabsTrigger>
          <TabsTrigger value="pending">
            Pending ({pendingLicenses.length})
          </TabsTrigger>
          <TabsTrigger value="active">
            Active ({activeLicenses.length})
          </TabsTrigger>
          <TabsTrigger value="expired">
            Expired/Revoked ({expiredLicenses.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          {renderLicenseList(allLicenses, "No licenses created yet.")}
        </TabsContent>

        <TabsContent value="pending" className="mt-6">
          {renderLicenseList(pendingLicenses, "No pending licenses.")}
        </TabsContent>

        <TabsContent value="active" className="mt-6">
          {renderLicenseList(activeLicenses, "No active licenses.")}
        </TabsContent>

        <TabsContent value="expired" className="mt-6">
          {renderLicenseList(expiredLicenses, "No expired or revoked licenses.")}
        </TabsContent>
      </Tabs>
    </div>
  )
}
