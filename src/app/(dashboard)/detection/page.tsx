import Link from "next/link"
import { format } from "date-fns"
import {
  Search,
  ScanFace,
  ShieldAlert,
  ArrowRight,
  Plus,
} from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/shared/page-header"
import { StatsCard } from "@/components/shared/stats-card"
import { StatusBadge } from "@/components/shared/status-badge"
import { EmptyState } from "@/components/shared/empty-state"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default async function DetectionPage() {
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

  const creatorId = creator?.id

  // Fetch recent scans
  const { data: recentScans } = creatorId
    ? await supabase
        .from("scans")
        .select("id, scan_type, target_url, status, total_matches, created_at")
        .eq("creator_id", creatorId)
        .order("created_at", { ascending: false })
        .limit(5)
    : { data: [] }

  // Fetch recent incidents
  const { data: recentIncidents } = creatorId
    ? await supabase
        .from("incidents")
        .select(
          "id, source_url, platform, match_confidence, status, created_at"
        )
        .eq("creator_id", creatorId)
        .order("created_at", { ascending: false })
        .limit(5)
    : { data: [] }

  // Fetch stats
  const { count: totalScans } = creatorId
    ? await supabase
        .from("scans")
        .select("*", { count: "exact", head: true })
        .eq("creator_id", creatorId)
    : { count: 0 }

  const { count: totalMatches } = creatorId
    ? await supabase
        .from("incidents")
        .select("*", { count: "exact", head: true })
        .eq("creator_id", creatorId)
    : { count: 0 }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Detection"
        description="Find unauthorized uses of your likeness"
        action={
          <Link href="/detection/scan">
            <Button>
              <Plus className="mr-2 size-4" />
              New Scan
            </Button>
          </Link>
        }
      />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2">
        <StatsCard
          title="Total Scans"
          value={totalScans ?? 0}
          icon={Search}
          description="All-time scans performed"
        />
        <StatsCard
          title="Matches Found"
          value={totalMatches ?? 0}
          icon={ShieldAlert}
          description="Detected instances of your likeness"
        />
      </div>

      {/* Quick action */}
      <Card>
        <CardContent className="flex items-center justify-between py-6">
          <div className="flex items-center gap-4">
            <div className="rounded-lg bg-primary/10 p-3">
              <ScanFace className="size-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Run a New Scan</h3>
              <p className="text-sm text-muted-foreground">
                Paste a URL or upload an image to check for your likeness
              </p>
            </div>
          </div>
          <Link href="/detection/scan">
            <Button variant="outline">
              Start Scan
              <ArrowRight className="ml-2 size-4" />
            </Button>
          </Link>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Scans */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base">Recent Scans</CardTitle>
              <CardDescription>Your latest scan activity</CardDescription>
            </div>
            <Link href="/detection/results">
              <Button variant="ghost" size="sm">
                View All
                <ArrowRight className="ml-1 size-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentScans && recentScans.length > 0 ? (
              <div className="space-y-3">
                {recentScans.map((scan) => (
                  <Link
                    key={scan.id}
                    href={`/detection/results/${scan.id}`}
                    className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium capitalize">
                          {scan.scan_type.replace("_", " ")}
                        </span>
                        <StatusBadge status={scan.status} />
                      </div>
                      {scan.target_url && (
                        <p className="truncate text-xs text-muted-foreground">
                          {scan.target_url}
                        </p>
                      )}
                    </div>
                    <div className="ml-4 shrink-0 text-right">
                      <p className="text-sm font-medium">
                        {scan.total_matches ?? 0} matches
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(scan.created_at), "MMM d")}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No scans yet. Start your first scan to detect unauthorized uses.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Incidents */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base">Recent Incidents</CardTitle>
              <CardDescription>
                Latest detected matches
              </CardDescription>
            </div>
            <Link href="/detection/incidents">
              <Button variant="ghost" size="sm">
                View All
                <ArrowRight className="ml-1 size-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentIncidents && recentIncidents.length > 0 ? (
              <div className="space-y-3">
                {recentIncidents.map((incident) => (
                  <Link
                    key={incident.id}
                    href={`/detection/incidents/${incident.id}`}
                    className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        {incident.platform && (
                          <span className="text-sm font-medium capitalize">
                            {incident.platform}
                          </span>
                        )}
                        <StatusBadge status={incident.status} />
                      </div>
                      {incident.source_url && (
                        <p className="truncate text-xs text-muted-foreground">
                          {incident.source_url}
                        </p>
                      )}
                    </div>
                    <div className="ml-4 shrink-0 text-right">
                      <p className="text-sm font-medium">
                        {Math.round(incident.match_confidence)}%
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(incident.created_at), "MMM d")}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No incidents detected yet.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
