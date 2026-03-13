import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, ShieldCheck } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { Button } from "@/components/ui/button"
import { ScanStatusCard } from "@/components/detection/scan-status-card"
import { IncidentList } from "@/components/detection/incident-list"

interface ScanDetailPageProps {
  params: Promise<{ scanId: string }>
}

export default async function ScanDetailPage({ params }: ScanDetailPageProps) {
  const { scanId } = await params
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
    return notFound()
  }

  // Fetch scan and verify ownership
  const { data: scan } = await supabase
    .from("scans")
    .select("*")
    .eq("id", scanId)
    .eq("creator_id", creator.id)
    .single()

  if (!scan) {
    return notFound()
  }

  // Fetch incidents for this scan
  const { data: incidents } = await supabase
    .from("incidents")
    .select("*")
    .eq("scan_id", scanId)
    .eq("creator_id", creator.id)
    .order("match_confidence", { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/detection/results">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-1 size-4" />
            Back to Results
          </Button>
        </Link>
      </div>

      <PageHeader
        title="Scan Results"
        description={
          scan.target_url
            ? `Results for ${scan.target_url}`
            : "Results for uploaded image"
        }
      />

      <ScanStatusCard scan={scan} />

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">
          Detected Matches ({incidents?.length ?? 0})
        </h2>

        {incidents && incidents.length > 0 ? (
          <IncidentList incidents={incidents} />
        ) : (
          <EmptyState
            icon={ShieldCheck}
            title="No Matches Found"
            description={
              scan.status === "completed"
                ? "No unauthorized uses of your likeness were detected in this scan."
                : scan.status === "processing"
                  ? "Scan is still in progress. Check back shortly for results."
                  : "This scan has not yet been processed."
            }
          />
        )}
      </div>
    </div>
  )
}
