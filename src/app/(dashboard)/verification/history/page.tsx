import { createClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/shared/page-header"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/shared/empty-state"
import { History } from "lucide-react"
import { format } from "date-fns"

export default async function VerificationHistoryPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

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
          title="Verification History"
          description="You need to enroll your identity first."
        />
      </div>
    )
  }

  // Fetch provenance records with asset info
  const { data: records } = await supabase
    .from("provenance_records")
    .select(`
      id,
      action,
      sha256_hash,
      created_at,
      assets!inner (
        file_name
      )
    `)
    .eq("creator_id", creator.id)
    .order("created_at", { ascending: false })
    .limit(100)

  const provenanceRecords = records ?? []

  const actionStyles: Record<string, { variant: "default" | "secondary" | "outline"; label: string }> = {
    registration: { variant: "default", label: "Registration" },
    signing: { variant: "secondary", label: "Signing" },
    verification: { variant: "outline", label: "Verification" },
    export: { variant: "outline", label: "Export" },
    revocation: { variant: "secondary", label: "Revocation" },
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Verification History"
        description={`${provenanceRecords.length} provenance record${provenanceRecords.length !== 1 ? "s" : ""}`}
      />

      {provenanceRecords.length === 0 ? (
        <EmptyState
          icon={History}
          title="No verification history"
          description="Your provenance records will appear here after you sign or verify assets."
        />
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Hash</TableHead>
                <TableHead>Timestamp</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {provenanceRecords.map((record: any) => {
                const style = actionStyles[record.action] ?? {
                  variant: "outline" as const,
                  label: record.action,
                }
                const truncatedHash = record.sha256_hash
                  ? `${record.sha256_hash.slice(0, 8)}...${record.sha256_hash.slice(-8)}`
                  : "N/A"

                return (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">
                      {record.assets?.file_name ?? "Unknown"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={style.variant}>{style.label}</Badge>
                    </TableCell>
                    <TableCell>
                      <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">
                        {truncatedHash}
                      </code>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(
                        new Date(record.created_at),
                        "MMM d, yyyy h:mm a"
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
