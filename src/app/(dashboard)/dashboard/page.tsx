import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import {
  ShieldCheck,
  ImageIcon,
  ScanSearch,
  Briefcase,
  DollarSign,
  Search,
  CheckCircle,
  ArrowRight,
  Sparkles,
} from "lucide-react"
import { PageHeader } from "@/components/shared/page-header"
import { StatsCard } from "@/components/shared/stats-card"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  // Fetch creator profile
  const { data: creator } = await supabase
    .from("creators")
    .select("id, display_name, enrollment_completed, verification_status")
    .eq("user_id", user.id)
    .single()

  // Fetch stats in parallel
  const creatorId = creator?.id

  let assetCount = 0
  let incidentCount = 0
  let caseCount = 0

  if (creatorId) {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const [assetsResult, incidentsResult, casesResult] = await Promise.all([
      supabase
        .from("assets")
        .select("id", { count: "exact", head: true })
        .eq("creator_id", creatorId)
        .eq("status", "active"),
      supabase
        .from("incidents")
        .select("id", { count: "exact", head: true })
        .eq("creator_id", creatorId)
        .gte("created_at", thirtyDaysAgo.toISOString()),
      supabase
        .from("cases")
        .select("id", { count: "exact", head: true })
        .eq("creator_id", creatorId)
        .in("status", ["draft", "submitted", "acknowledged", "in_review"]),
    ])

    assetCount = assetsResult.count ?? 0
    incidentCount = incidentsResult.count ?? 0
    caseCount = casesResult.count ?? 0
  }

  const isEnrolled = creator?.enrollment_completed ?? false

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="Your digital likeness protection overview"
      />

      {/* Protection Status */}
      <Card>
        <CardContent className="pt-1">
          <div className="flex items-center gap-4">
            <div
              className={`rounded-full p-3 ${
                isEnrolled ? "bg-emerald-100" : "bg-amber-100"
              }`}
            >
              <ShieldCheck
                className={`size-8 ${
                  isEnrolled ? "text-emerald-600" : "text-amber-600"
                }`}
              />
            </div>
            <div>
              <h2 className="text-lg font-semibold">
                {isEnrolled
                  ? "Your likeness is protected"
                  : "Protection not yet active"}
              </h2>
              <p className="text-sm text-muted-foreground">
                {isEnrolled
                  ? "Your digital identity is enrolled and actively monitored."
                  : "Complete enrollment to activate protection for your digital likeness."}
              </p>
            </div>
            {!isEnrolled && (
              <div className="ml-auto hidden sm:block">
                <Button render={<Link href="/identity/enroll" />}>
                  Enroll Now
                  <ArrowRight className="size-4" />
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Assets"
          value={assetCount}
          description="Registered images"
          icon={ImageIcon}
        />
        <StatsCard
          title="Active Scans"
          value={incidentCount}
          description="Last 30 days"
          icon={ScanSearch}
        />
        <StatsCard
          title="Open Cases"
          value={caseCount}
          description="Pending resolution"
          icon={Briefcase}
        />
        <StatsCard
          title="Revenue"
          value="$0"
          description="Licensing income"
          icon={DollarSign}
        />
      </div>

      {/* Get Started CTA (only if not enrolled) */}
      {!isEnrolled && (
        <Card className="border-primary/20 bg-primary/[0.02]">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="size-5 text-primary" />
              <CardTitle>Get Started</CardTitle>
            </div>
            <CardDescription>
              Enroll your identity to start protecting your likeness. Upload
              reference photos and we will monitor the web for unauthorized use.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button render={<Link href="/identity/enroll" />}>
              Start Enrollment
              <ArrowRight className="size-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity + Quick Actions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Your latest protection events and actions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="rounded-full bg-gray-100 p-3 mb-3">
                <ScanSearch className="size-6 text-gray-400" />
              </div>
              <p className="text-sm text-muted-foreground">
                Activity will appear here once you start scanning.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common tasks to manage your digital likeness
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Link
                href="/detection/scan"
                className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-gray-50"
              >
                <div className="rounded-lg bg-blue-100 p-2">
                  <Search className="size-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Scan Now</p>
                  <p className="text-xs text-muted-foreground">
                    Search for unauthorized use of your likeness
                  </p>
                </div>
                <ArrowRight className="size-4 text-gray-400" />
              </Link>

              <Link
                href="/verification/verify"
                className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-gray-50"
              >
                <div className="rounded-lg bg-emerald-100 p-2">
                  <CheckCircle className="size-4 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Verify Content</p>
                  <p className="text-xs text-muted-foreground">
                    Check authenticity of content using your likeness
                  </p>
                </div>
                <ArrowRight className="size-4 text-gray-400" />
              </Link>

              <Link
                href="/enforcement/cases"
                className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-gray-50"
              >
                <div className="rounded-lg bg-amber-100 p-2">
                  <Briefcase className="size-4 text-amber-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">View Cases</p>
                  <p className="text-xs text-muted-foreground">
                    Track your enforcement and takedown requests
                  </p>
                </div>
                <ArrowRight className="size-4 text-gray-400" />
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
