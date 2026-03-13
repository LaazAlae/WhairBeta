import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/shared/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { User, Shield, Bell } from "lucide-react"
import Link from "next/link"
import type { Creator } from "@/types"
import { ProfileForm } from "./profile-form"
import { DeleteAccountSection } from "./delete-account"

export default async function SettingsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { data: creator } = await supabase
    .from("creators")
    .select("*")
    .eq("user_id", user.id)
    .single()

  const typedCreator = creator as Creator | null

  return (
    <div className="space-y-8">
      <PageHeader
        title="Settings"
        description="Manage your account"
      />

      {/* Navigation Links */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Link href="/settings">
          <Card className="border-primary bg-primary/5 cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <User className="size-5 text-primary" />
                <div>
                  <p className="font-medium">Profile</p>
                  <p className="text-xs text-muted-foreground">
                    Manage your profile information
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/settings/security">
          <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Shield className="size-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Security</p>
                  <p className="text-xs text-muted-foreground">
                    Password and authentication
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/settings/notifications">
          <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Bell className="size-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Notifications</p>
                  <p className="text-xs text-muted-foreground">
                    Alert preferences
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Profile Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="size-5" />
            Profile Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Read-only email */}
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Email</p>
            <p className="text-sm">{user.email}</p>
            <p className="text-xs text-muted-foreground">
              Email cannot be changed. Contact support if needed.
            </p>
          </div>

          <Separator />

          <ProfileForm
            creatorId={typedCreator?.id}
            initialDisplayName={typedCreator?.display_name ?? ""}
            initialBio={typedCreator?.bio ?? ""}
          />
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <DeleteAccountSection />
    </div>
  )
}
