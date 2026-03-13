import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { logAudit } from "@/lib/security/audit"

/**
 * PATCH /api/settings/notifications
 * Saves notification preferences to creator.metadata JSONB.
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

    const { data: creator } = await supabase
      .from("creators")
      .select("id, metadata")
      .eq("user_id", user.id)
      .single()

    if (!creator) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Creator profile not found" } },
        { status: 404 }
      )
    }

    const body = await request.json()
    const { detectionAlerts, caseUpdates } = body

    // Merge notification preferences into existing metadata
    const existingMetadata = (creator.metadata as Record<string, unknown>) ?? {}
    const updatedMetadata = {
      ...existingMetadata,
      notifications: {
        detectionAlerts: !!detectionAlerts,
        caseUpdates: !!caseUpdates,
      },
    }

    const { error } = await supabase
      .from("creators")
      .update({
        metadata: updatedMetadata,
        updated_at: new Date().toISOString(),
      })
      .eq("id", creator.id)

    if (error) {
      return NextResponse.json(
        { success: false, error: { code: "UPDATE_ERROR", message: error.message } },
        { status: 500 }
      )
    }

    await logAudit({
      userId: user.id,
      creatorId: creator.id,
      action: "settings.notifications.update",
      resourceType: "creator",
      resourceId: creator.id,
      details: { detectionAlerts, caseUpdates },
      ip: request.headers.get("x-forwarded-for") ?? undefined,
      userAgent: request.headers.get("user-agent") ?? undefined,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Settings Notifications PATCH] Error:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Internal server error" } },
      { status: 500 }
    )
  }
}
