import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { logAudit } from "@/lib/security/audit"

/**
 * DELETE /api/settings/account
 * Soft-deletes the creator account by anonymizing their data.
 */
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      )
    }

    const { data: creator } = await supabase
      .from("creators")
      .select("id")
      .eq("user_id", user.id)
      .single()

    if (!creator) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Creator profile not found" } },
        { status: 404 }
      )
    }

    const now = new Date().toISOString()

    // Soft delete: anonymize the creator record
    const { error } = await supabase
      .from("creators")
      .update({
        display_name: "[Deleted]",
        full_name: "[Deleted]",
        email: `deleted-${creator.id}@whair.deleted`,
        bio: null,
        avatar_url: null,
        enrolled: false,
        metadata: { deleted: true, deleted_at: now },
        updated_at: now,
      })
      .eq("id", creator.id)

    if (error) {
      return NextResponse.json(
        { success: false, error: { code: "DELETE_ERROR", message: error.message } },
        { status: 500 }
      )
    }

    // Audit log before sign out
    await logAudit({
      userId: user.id,
      creatorId: creator.id,
      action: "settings.account.delete",
      resourceType: "creator",
      resourceId: creator.id,
      details: { soft_delete: true },
      ip: request.headers.get("x-forwarded-for") ?? undefined,
      userAgent: request.headers.get("user-agent") ?? undefined,
    })

    // Sign the user out
    await supabase.auth.signOut()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Settings Account DELETE] Error:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Internal server error" } },
      { status: 500 }
    )
  }
}
