import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { updateLicenseSchema } from "@/lib/validations/monetization"
import { logAudit } from "@/lib/security/audit"

interface RouteContext {
  params: Promise<{ licenseId: string }>
}

/**
 * GET /api/monetization/licenses/:licenseId
 * Fetches a single license with incident data. Verifies ownership.
 */
export async function GET(request: Request, context: RouteContext) {
  try {
    const { licenseId } = await context.params
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

    // Fetch license
    const { data: license, error } = await supabase
      .from("licenses")
      .select("*")
      .eq("id", licenseId)
      .eq("creator_id", creator.id)
      .single()

    if (error || !license) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "License not found" } },
        { status: 404 }
      )
    }

    // Try to fetch related incident from terms
    let incident = null
    const terms = license.terms as Record<string, unknown> | null
    if (terms?.incident_id) {
      const { data } = await supabase
        .from("incidents")
        .select("*")
        .eq("id", terms.incident_id as string)
        .eq("creator_id", creator.id)
        .single()
      incident = data
    }

    return NextResponse.json({
      success: true,
      data: { license, incident },
    })
  } catch (error) {
    console.error("[License GET] Error:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Internal server error" } },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/monetization/licenses/:licenseId
 * Updates license status (revoke or cancel). Verifies ownership.
 */
export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { licenseId } = await context.params
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

    // Validate body
    const body = await request.json()
    const validation = updateLicenseSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid input",
            details: validation.error.flatten().fieldErrors,
          },
        },
        { status: 400 }
      )
    }

    const { status: newStatus } = validation.data

    // Verify license exists and belongs to creator
    const { data: existingLicense } = await supabase
      .from("licenses")
      .select("id, status")
      .eq("id", licenseId)
      .eq("creator_id", creator.id)
      .single()

    if (!existingLicense) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "License not found" } },
        { status: 404 }
      )
    }

    // Check if the license can be updated
    if (existingLicense.status !== "active" && existingLicense.status !== "pending") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_STATE",
            message: `Cannot ${newStatus === "revoked" ? "revoke" : "cancel"} a license with status "${existingLicense.status}"`,
          },
        },
        { status: 400 }
      )
    }

    const now = new Date().toISOString()

    // Update the license
    const { data: updatedLicense, error: updateError } = await supabase
      .from("licenses")
      .update({
        status: newStatus,
        revoked_at: newStatus === "revoked" ? now : undefined,
        updated_at: now,
      })
      .eq("id", licenseId)
      .select()
      .single()

    if (updateError) {
      console.error("[License PATCH] Update error:", updateError)
      return NextResponse.json(
        { success: false, error: { code: "UPDATE_ERROR", message: updateError.message } },
        { status: 500 }
      )
    }

    // Audit log
    await logAudit({
      userId: user.id,
      creatorId: creator.id,
      action: `monetization.license.${newStatus}`,
      resourceType: "license",
      resourceId: licenseId,
      details: {
        previous_status: existingLicense.status,
        new_status: newStatus,
      },
      ip: request.headers.get("x-forwarded-for") ?? undefined,
      userAgent: request.headers.get("user-agent") ?? undefined,
    })

    return NextResponse.json({
      success: true,
      data: { license: updatedLicense },
    })
  } catch (error) {
    console.error("[License PATCH] Error:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Internal server error" } },
      { status: 500 }
    )
  }
}
