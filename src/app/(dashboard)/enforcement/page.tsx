import Link from "next/link"
import { redirect } from "next/navigation"
import { Gavel, Send, CheckCircle2, FolderOpen, Search } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/shared/page-header"
import { StatsCard } from "@/components/shared/stats-card"
import { EmptyState } from "@/components/shared/empty-state"
import { CaseCard } from "@/components/enforcement/case-card"
import { Button } from "@/components/ui/button"

export default async function EnforcementPage() {
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

  // Fetch all cases for this creator
  const { data: cases, error } = await supabase
    .from("cases")
    .select("*, incidents(source_url, match_confidence)")
    .eq("creator_id", creator.id)
    .order("created_at", { ascending: false })

  const allCases = (cases ?? []).map((c: any) => ({
    ...c,
    source_url: c.incidents?.source_url as string | undefined,
    match_confidence: c.incidents?.match_confidence as number | undefined,
  }))

  // Compute stats
  const activeCases = allCases.filter((c) =>
    ["draft", "submitted", "acknowledged", "in_review", "appealed"].includes(
      c.status as string
    )
  ).length
  const submittedCases = allCases.filter(
    (c) => c.status === "submitted"
  ).length
  const resolvedCases = allCases.filter((c) =>
    ["removed", "denied", "closed"].includes(c.status as string)
  ).length

  const recentCases = allCases.slice(0, 5)

  return (
    <div className="space-y-8">
      <PageHeader
        title="Enforcement"
        description="Take action on unauthorized uses of your likeness"
        action={
          <Link href="/enforcement/cases">
            <Button variant="outline" size="sm">
              <FolderOpen className="mr-2 size-4" />
              View All Cases
            </Button>
          </Link>
        }
      />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatsCard
          title="Active Cases"
          value={activeCases}
          description="Cases in progress"
          icon={Gavel}
        />
        <StatsCard
          title="Submitted"
          value={submittedCases}
          description="Awaiting platform response"
          icon={Send}
        />
        <StatsCard
          title="Resolved"
          value={resolvedCases}
          description="Cases with final outcome"
          icon={CheckCircle2}
        />
      </div>

      {/* Recent Cases */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Recent Cases</h2>
          {allCases.length > 5 && (
            <Link
              href="/enforcement/cases"
              className="text-sm text-blue-600 hover:underline"
            >
              View all
            </Link>
          )}
        </div>

        {recentCases.length === 0 ? (
          <EmptyState
            icon={Search}
            title="No active cases"
            description="No enforcement cases yet. Detect unauthorized uses of your likeness first, then create takedown requests."
            actionLabel="Go to Detection"
            onAction={undefined}
          />
        ) : (
          <div className="space-y-3">
            {recentCases.map((caseData) => (
              <CaseCard key={caseData.id as string} caseData={caseData as any} />
            ))}
          </div>
        )}

        {recentCases.length === 0 && (
          <div className="mt-4 text-center">
            <Link href="/detection/scan">
              <Button>
                <Search className="mr-2 size-4" />
                Start Scanning
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
