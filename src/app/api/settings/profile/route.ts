import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { logAudit } from "@/lib/security/audit"

/**
 * PATCH /api/settings/profile
 * Updates the creator profile (display name, bio).
 */
export async function PATCH(request: Request) {
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

    const body = await request.json()
    const { creatorId, displayName, bio } = body

    if (!creatorId) {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: "Creator ID is required" } },
        { status: 400 }
      )
    }

    // Verify ownership
    const { data: creator } = await supabase
      .from("creators")
      .select("id")
      .eq("id", creatorId)
      .eq("user_id", user.id)
      .single()

    if (!creator) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Creator profile not found" } },
        { status: 404 }
      )
    }

    const { error } = await supabase
      .from("creators")
      .update({
        display_name: displayName || null,
        bio: bio || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", creatorId)

    if (error) {
      return NextResponse.json(
        { success: false, error: { code: "UPDATE_ERROR", message: error.message } },
        { status: 500 }
      )
    }

    await logAudit({
      userId: user.id,
      creatorId,
      action: "settings.profile.update",
      resourceType: "creator",
      resourceId: creatorId,
      details: { displayName, bio: bio ? "updated" : "cleared" },
      ip: request.headers.get("x-forwarded-for") ?? undefined,
      userAgent: request.headers.get("user-agent") ?? undefined,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Settings Profile PATCH] Error:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Internal server error" } },
      { status: 500 }
    )
  }
}
