import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/shared/page-header"
import { StatsCard } from "@/components/shared/stats-card"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PenTool, Search, ShieldCheck, History, ArrowRight } from "lucide-react"

export default async function VerificationPage() {
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

  // Fetch stats
  let totalSigned = 0
  let totalVerifications = 0

  if (creator) {
    const { count: signedCount } = await supabase
      .from("provenance_records")
      .select("*", { count: "exact", head: true })
      .eq("creator_id", creator.id)
      .eq("action", "signing")

    const { count: verificationCount } = await supabase
      .from("provenance_records")
      .select("*", { count: "exact", head: true })
      .eq("creator_id", creator.id)
      .eq("action", "verification")

    totalSigned = signedCount ?? 0
    totalVerifications = verificationCount ?? 0
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Verification"
        description="Prove ownership and verify content authenticity"
      />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2">
        <StatsCard
          title="Signed Assets"
          value={totalSigned}
          description="Total cryptographic signatures"
          icon={PenTool}
        />
        <StatsCard
          title="Verifications"
          value={totalVerifications}
          description="Total provenance checks"
          icon={ShieldCheck}
        />
      </div>

      {/* Action cards */}
      <div className="grid gap-6 sm:grid-cols-2">
        <Card className="transition-shadow hover:shadow-md">
          <CardHeader>
            <div className="mb-2 w-fit rounded-lg bg-blue-100 p-2.5">
              <PenTool className="size-6 text-blue-600" />
            </div>
            <CardTitle>Sign Content</CardTitle>
            <CardDescription>
              Create a cryptographic proof of ownership for your assets. Each
              signature includes a SHA-256 hash and HMAC signature that can be
              independently verified.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/verification/sign">
              <Button className="w-full">
                Sign an Asset
                <ArrowRight className="ml-2 size-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="transition-shadow hover:shadow-md">
          <CardHeader>
            <div className="mb-2 w-fit rounded-lg bg-green-100 p-2.5">
              <Search className="size-6 text-green-600" />
            </div>
            <CardTitle>Verify Content</CardTitle>
            <CardDescription>
              Check if any file has verified provenance. Upload a file to compute
              its hash and search for matching provenance records in our registry.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/verification/verify">
              <Button variant="outline" className="w-full">
                Verify a File
                <ArrowRight className="ml-2 size-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* History link */}
      <div className="flex justify-center">
        <Link href="/verification/history">
          <Button variant="ghost">
            <History className="mr-2 size-4" />
            View Verification History
          </Button>
        </Link>
      </div>
    </div>
  )
}
