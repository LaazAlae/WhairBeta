import { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { successResponse, errorResponse } from "@/lib/utils/api-response"
import { AuthError, NotFoundError, ValidationError } from "@/lib/utils/errors"
import { incidentUpdateSchema } from "@/lib/validations/detection"
import { logAudit } from "@/lib/security/audit"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ incidentId: string }> }
) {
  try {
    const { incidentId } = await params
    const supabase = await createClient()

    // Auth check
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw new AuthError("Authentication required")
    }

    // Get creator record
    const { data: creator } = await supabase
      .from("creators")
      .select("id")
      .eq("user_id", user.id)
      .single()

    if (!creator) {
      throw new NotFoundError("Creator profile not found")
    }

    // Fetch incident with ownership check
    const { data: incident, error } = await supabase
      .from("incidents")
      .select("*")
      .eq("id", incidentId)
      .eq("creator_id", creator.id)
      .single()

    if (error || !incident) {
      throw new NotFoundError("Incident not found")
    }

    return successResponse({ incident })
  } catch (error) {
    console.error("[IncidentDetailAPI] GET Error:", error)
    return errorResponse(error)
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ incidentId: string }> }
) {
  try {
    const { incidentId } = await params
    const supabase = await createClient()

    // Auth check
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw new AuthError("Authentication required")
    }

    // Get creator record
    const { data: creator } = await supabase
      .from("creators")
      .select("id")
      .eq("user_id", user.id)
      .single()

    if (!creator) {
      throw new NotFoundError("Creator profile not found")
    }

    // Verify ownership
    const { data: existingIncident } = await supabase
      .from("incidents")
      .select("id, status")
      .eq("id", incidentId)
      .eq("creator_id", creator.id)
      .single()

    if (!existingIncident) {
      throw new NotFoundError("Incident not found")
    }

    // Parse and validate request body
    const body = await request.json()
    const parseResult = incidentUpdateSchema.safeParse(body)

    if (!parseResult.success) {
      throw new ValidationError("Invalid update data", {
        errors: parseResult.error.flatten().fieldErrors,
      })
    }

    const { status, actionTaken } = parseResult.data

    // Build update object
    const updateData: Record<string, unknown> = {}
    if (status !== undefined) {
      updateData.status = status
    }
    if (actionTaken !== undefined) {
      updateData.action_taken = actionTaken
    }

    if (Object.keys(updateData).length === 0) {
      throw new ValidationError("No update fields provided")
    }

    // Update using admin client to bypass RLS
    const admin = createAdminClient()
    const { data: updatedIncident, error: updateError } = await admin
      .from("incidents")
      .update(updateData)
      .eq("id", incidentId)
      .eq("creator_id", creator.id)
      .select("*")
      .single()

    if (updateError) {
      console.error("[IncidentDetailAPI] Update error:", updateError.message)
      throw new Error("Failed to update incident")
    }

    // Determine audit action
    const auditAction =
      status === "dismissed" ? "incident.dismiss" : "incident.update"

    await logAudit({
      userId: user.id,
      action: auditAction,
      resourceType: "incident",
      resourceId: incidentId,
      details: { previousStatus: existingIncident.status, ...updateData },
    })

    return successResponse({ incident: updatedIncident })
  } catch (error) {
    console.error("[IncidentDetailAPI] PATCH Error:", error)
    return errorResponse(error)
  }
}
