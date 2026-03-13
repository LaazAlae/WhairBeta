"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ConfirmationDialog } from "@/components/shared/confirmation-dialog"
import { toast } from "sonner"

interface RevokeLicenseButtonProps {
  licenseId: string
}

export function RevokeLicenseButton({ licenseId }: RevokeLicenseButtonProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleRevoke() {
    setLoading(true)

    try {
      const response = await fetch(`/api/monetization/licenses/${licenseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "revoked" }),
      })

      if (!response.ok) {
        const data = await response.json()
        toast.error(data.error?.message ?? "Failed to revoke license")
        return
      }

      toast.success("License revoked successfully")
      setOpen(false)
      router.refresh()
    } catch {
      toast.error("An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button variant="destructive" size="sm" onClick={() => setOpen(true)}>
        Revoke License
      </Button>

      <ConfirmationDialog
        open={open}
        onOpenChange={setOpen}
        title="Revoke License"
        description="Are you sure you want to revoke this license? The licensee will be notified and will no longer have the right to use your likeness. This action cannot be undone."
        onConfirm={handleRevoke}
        confirmLabel="Revoke License"
        variant="destructive"
        loading={loading}
      />
    </>
  )
}
