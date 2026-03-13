import { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { successResponse, errorResponse } from "@/lib/utils/api-response"
import { AuthError, NotFoundError, ValidationError } from "@/lib/utils/errors"
import { updateCaseSchema } from "@/lib/validations/enforcement"
import { logAudit } from "@/lib/security/audit"

interface RouteContext {
  params: Promise<{ caseId: string }>
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { caseId } = await context.params

    const supabase = await createClient()

    // Auth check
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw new AuthError("Authentication required")
    }

    // Get creator profile
    const { data: creator } = await supabase
      .from("creators")
      .select("id")
      .eq("user_id", user.id)
      .single()

    if (!creator) {
      throw new NotFoundError("Creator profile not found")
    }

    // Fetch case with ownership check
    const { data: caseData, error: caseError } = await supabase
      .from("cases")
      .select("*")
      .eq("id", caseId)
      .eq("creator_id", creator.id)
      .single()

    if (caseError || !caseData) {
      throw new NotFoundError("Case not found")
    }

    // Fetch related evidence packet
    let evidencePacket = null
    if (caseData.evidence_packet_id) {
      const { data: ep } = await supabase
        .from("evidence_packets")
        .select("*")
        .eq("id", caseData.evidence_packet_id)
        .single()
      evidencePacket = ep
    }

    // Fetch related incident
    const { data: incident } = await supabase
      .from("incidents")
      .select("*")
      .eq("id", caseData.incident_id)
      .single()

    return successResponse({
      case: caseData,
      evidencePacket,
      incident,
    })
  } catch (error) {
    return errorResponse(error)
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { caseId } = await context.params

    const supabase = await createClient()

    // Auth check
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw new AuthError("Authentication required")
    }

    // Get creator profile
    const { data: creator } = await supabase
      .from("creators")
      .select("id")
      .eq("user_id", user.id)
      .single()

    if (!creator) {
      throw new NotFoundError("Creator profile not found")
    }

    // Verify case ownership
    const { data: existingCase, error: caseError } = await supabase
      .from("cases")
      .select("*")
      .eq("id", caseId)
      .eq("creator_id", creator.id)
      .single()

    if (caseError || !existingCase) {
      throw new NotFoundError("Case not found")
    }

    // Validate request body
    const body = await request.json()
    const validation = updateCaseSchema.safeParse(body)

    if (!validation.success) {
      throw new ValidationError("Invalid update data", {
        errors: validation.error.flatten().fieldErrors,
      })
    }

    const { status, resolutionNotes } = validation.data
    const now = new Date().toISOString()

    // Build update payload with appropriate timestamp changes
    const updatePayload: Record<string, unknown> = {
      status,
      updated_at: now,
    }

    // Set timestamps based on status transition
    if (status === "submitted" && !existingCase.submitted_at) {
      updatePayload.submitted_at = now
    }

    if (status === "acknowledged" && !existingCase.acknowledged_at) {
      updatePayload.acknowledged_at = now
    }

    if (
      ["removed", "denied", "closed"].includes(status) &&
      !existingCase.resolved_at
    ) {
      updatePayload.resolved_at = now
    }

    if (resolutionNotes !== undefined) {
      updatePayload.resolution_notes = resolutionNotes
    }

    // Update case using admin client
    const admin = createAdminClient()
    const { data: updatedCase, error: updateError } = await admin
      .from("cases")
      .update(updatePayload)
      .eq("id", caseId)
      .select()
      .single()

    if (updateError || !updatedCase) {
      throw new Error(`Failed to update case: ${updateError?.message}`)
    }

    // Determine audit action
    const auditAction = ["removed", "denied", "closed"].includes(status)
      ? "enforcement.takedown_resolved"
      : "case.update"

    // Log audit event
    await logAudit({
      userId: user.id,
      action: auditAction,
      resourceType: "case",
      resourceId: caseId,
      details: {
        previous_status: existingCase.status,
        new_status: status,
        resolution_notes: resolutionNotes ?? null,
      },
    })

    return successResponse(updatedCase)
  } catch (error) {
    return errorResponse(error)
  }
}
