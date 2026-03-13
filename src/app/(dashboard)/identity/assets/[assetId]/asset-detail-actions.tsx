"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { PenTool, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog"
import { LoadingSpinner } from "@/components/shared/loading-spinner"

interface AssetDetailActionsProps {
  assetId: string
  isSigned: boolean
  status: string
}

export function AssetDetailActions({
  assetId,
  isSigned,
  status,
}: AssetDetailActionsProps) {
  const router = useRouter()
  const [signingLoading, setSigningLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const handleSign = async () => {
    setSigningLoading(true)
    try {
      const response = await fetch("/api/verification/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error?.message ?? "Failed to sign asset")
      }

      toast.success("Asset signed successfully!")
      router.refresh()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to sign asset"
      )
    } finally {
      setSigningLoading(false)
    }
  }

  const handleDelete = async () => {
    setDeleteLoading(true)
    try {
      const response = await fetch(`/api/identity/assets/${assetId}`, {
        method: "DELETE",
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error?.message ?? "Failed to delete asset")
      }

      toast.success("Asset deleted successfully")
      router.push("/identity/assets")
      router.refresh()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete asset"
      )
    } finally {
      setDeleteLoading(false)
    }
  }

  if (status === "deleted") return null

  return (
    <Card>
      <CardContent className="flex gap-3">
        {!isSigned && (
          <Button
            onClick={handleSign}
            disabled={signingLoading}
            className="flex-1"
          >
            {signingLoading ? (
              <LoadingSpinner size="sm" />
            ) : (
              <>
                <PenTool className="mr-2 size-4" />
                Sign Asset
              </>
            )}
          </Button>
        )}

        <Dialog>
          <DialogTrigger
            render={
              <Button variant="destructive" className={isSigned ? "flex-1" : ""}>
                <Trash2 className="mr-2 size-4" />
                Delete Asset
              </Button>
            }
          />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Asset</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this asset? This action cannot be
                undone. The provenance records will be preserved for audit purposes.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose
                render={<Button variant="outline" />}
              >
                Cancel
              </DialogClose>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteLoading}
              >
                {deleteLoading ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  "Delete"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}
