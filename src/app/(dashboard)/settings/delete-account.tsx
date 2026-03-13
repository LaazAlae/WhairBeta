"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ConfirmationDialog } from "@/components/shared/confirmation-dialog"
import { toast } from "sonner"
import { AlertTriangle } from "lucide-react"

export function DeleteAccountSection() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    setLoading(true)

    try {
      const response = await fetch("/api/settings/account", {
        method: "DELETE",
      })

      if (!response.ok) {
        const data = await response.json()
        toast.error(data.error?.message ?? "Failed to delete account")
        return
      }

      toast.success("Account deleted. Redirecting...")
      setOpen(false)
      router.push("/")
    } catch {
      toast.error("An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-base text-red-700 flex items-center gap-2">
            <AlertTriangle className="size-5" />
            Danger Zone
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Delete Account</p>
              <p className="text-sm text-muted-foreground">
                Permanently delete your account and all associated data. This
                action cannot be undone.
              </p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setOpen(true)}
            >
              Delete Account
            </Button>
          </div>
        </CardContent>
      </Card>

      <ConfirmationDialog
        open={open}
        onOpenChange={setOpen}
        title="Delete Account"
        description="Are you sure you want to delete your account? All your data including identity enrollment, detection history, cases, and licenses will be permanently removed. This action cannot be undone."
        onConfirm={handleDelete}
        confirmLabel="Delete My Account"
        variant="destructive"
        loading={loading}
      />
    </>
  )
}
