import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { Toaster } from "@/components/ui/sonner"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Fetch creator profile if it exists
  const { data: creator } = await supabase
    .from("creators")
    .select("id, display_name, avatar_url, enrollment_completed, verification_status")
    .eq("user_id", user.id)
    .single()

  const dashboardUser = {
    email: user.email ?? "",
    displayName: creator?.display_name ?? undefined,
  }

  return (
    <>
      <DashboardShell user={dashboardUser}>{children}</DashboardShell>
      <Toaster position="bottom-right" />
    </>
  )
}
