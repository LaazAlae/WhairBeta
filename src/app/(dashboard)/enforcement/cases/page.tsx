import Link from "next/link"
import { redirect } from "next/navigation"
import { FolderOpen } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { CaseCard } from "@/components/enforcement/case-card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"

interface CasesPageProps {
  searchParams: Promise<{ tab?: string }>
}

export default async function CasesPage({ searchParams }: CasesPageProps) {
  const params = await searchParams
  const activeTab = params.tab ?? "all"

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  // Get creator profile
  const { data: creator } = await supabase
    .from("creators")
    .select("id")
    .eq("user_id", user.id)
    .single()

  if (!creator) redirect("/identity")

  // Fetch all cases for this creator with incident data
  const { data: cases } = await supabase
    .from("cases")
    .select("*, incidents(source_url, match_confidence)")
    .eq("creator_id", creator.id)
    .order("created_at", { ascending: false })

  const allCases = (cases ?? []).map((c: any) => ({
    ...c,
    source_url: c.incidents?.source_url as string | undefined,
    match_confidence: c.incidents?.match_confidence as number | undefined,
  }))

  const draftCases = allCases.filter((c) => c.status === "draft")
  const submittedCases = allCases.filter((c) =>
    ["submitted", "acknowledged", "in_review", "appealed"].includes(c.status as string)
  )
  const resolvedCases = allCases.filter((c) =>
    ["removed", "denied", "closed"].includes(c.status as string)
  )

  const tabCounts: Record<string, number> = {
    all: allCases.length,
    draft: draftCases.length,
    submitted: submittedCases.length,
    resolved: resolvedCases.length,
  }

  const filteredCases: Record<string, typeof allCases> = {
    all: allCases,
    draft: draftCases,
    submitted: submittedCases,
    resolved: resolvedCases,
  }

  const currentCases = filteredCases[activeTab] ?? allCases

  return (
    <div className="space-y-6">
      <PageHeader
        title="All Cases"
        description="Track your enforcement cases through their lifecycle"
        action={
          <Link
            href="/enforcement"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Back to Enforcement Hub
          </Link>
        }
      />

      <Tabs defaultValue={activeTab} className="space-y-4">
        <TabsList>
          {["all", "draft", "submitted", "resolved"].map((tab) => (
            <TabsTrigger key={tab} value={tab}>
                <span className="capitalize">{tab}</span>
                <Badge variant="secondary" className="text-xs px-1.5 py-0">
                  {tabCounts[tab]}
                </Badge>
            </TabsTrigger>
          ))}
        </TabsList>

        {["all", "draft", "submitted", "resolved"].map((tab) => (
          <TabsContent key={tab} value={tab}>
            {(filteredCases[tab] ?? []).length === 0 ? (
              <EmptyState
                icon={FolderOpen}
                title={`No ${tab === "all" ? "" : tab + " "}cases`}
                description={
                  tab === "all"
                    ? "No enforcement cases yet. Detect unauthorized uses first."
                    : `No cases with ${tab} status.`
                }
              />
            ) : (
              <div className="space-y-3">
                {(filteredCases[tab] ?? []).map((caseData) => (
                  <CaseCard key={caseData.id as string} caseData={caseData as any} />
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
