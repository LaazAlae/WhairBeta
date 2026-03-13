import Link from "next/link"
import { format } from "date-fns"
import { Search } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/shared/page-header"
import { StatusBadge } from "@/components/shared/status-badge"
import { EmptyState } from "@/components/shared/empty-state"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent } from "@/components/ui/card"

export default async function ResultsPage() {
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
    return (
      <div className="space-y-6">
        <PageHeader title="Scan Results" description="View all your scan history" />
        <EmptyState
          icon={Search}
          title="No Creator Profile"
          description="You need to set up your identity profile before running scans."
        />
      </div>
    )
  }

  const { data: scans } = await supabase
    .from("scans")
    .select(
      "id, scan_type, target_url, status, total_images_found, total_faces_detected, total_matches, created_at"
    )
    .eq("creator_id", creator.id)
    .order("created_at", { ascending: false })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Scan Results"
        description="View all your scan history"
        action={
          <Link href="/detection/scan">
            <Button>New Scan</Button>
          </Link>
        }
      />

      {scans && scans.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Images</TableHead>
                  <TableHead className="text-right">Faces</TableHead>
                  <TableHead className="text-right">Matches</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scans.map((scan) => (
                  <TableRow key={scan.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell>
                      <Link
                        href={`/detection/results/${scan.id}`}
                        className="block capitalize"
                      >
                        {scan.scan_type.replace("_", " ")}
                      </Link>
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <Link
                        href={`/detection/results/${scan.id}`}
                        className="block truncate text-muted-foreground"
                      >
                        {scan.target_url ?? "Image upload"}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link href={`/detection/results/${scan.id}`}>
                        <StatusBadge status={scan.status} />
                      </Link>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/detection/results/${scan.id}`} className="block">
                        {scan.total_images_found ?? 0}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/detection/results/${scan.id}`} className="block">
                        {scan.total_faces_detected ?? 0}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/detection/results/${scan.id}`} className="block font-medium">
                        {scan.total_matches ?? 0}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      <Link href={`/detection/results/${scan.id}`} className="block">
                        {format(new Date(scan.created_at), "MMM d, yyyy")}
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <EmptyState
          icon={Search}
          title="No Scans Yet"
          description="Start your first scan to detect unauthorized uses of your likeness."
          actionLabel="New Scan"
          onAction={undefined}
        />
      )}
    </div>
  )
}
