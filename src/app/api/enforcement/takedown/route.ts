import { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { successResponse, errorResponse } from "@/lib/utils/api-response"
import { AppError, AuthError, NotFoundError, ValidationError } from "@/lib/utils/errors"
import { takedownRequestSchema } from "@/lib/validations/enforcement"
import { generateTakedownPacket } from "@/lib/enforcement/takedown-generator"
import { generateTakedownPDF } from "@/lib/enforcement/pdf-generator"
import { getPlatformReportUrl } from "@/lib/enforcement/platform-routes"
import { logAudit } from "@/lib/security/audit"

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw new AuthError("Authentication required")
    }

    // Get creator profile
    const { data: creator, error: creatorError } = await supabase
      .from("creators")
      .select("id, display_name, email, verification_status")
      .eq("user_id", user.id)
      .single()

    if (creatorError || !creator) {
      throw new NotFoundError("Creator profile not found. Please complete identity setup first.")
    }

    // Validate request body
    const body = await request.json()
    const validation = takedownRequestSchema.safeParse(body)

    if (!validation.success) {
      throw new ValidationError("Invalid request", {
        errors: validation.error.flatten().fieldErrors,
      })
    }

    const { incidentId } = validation.data

    // Fetch incident and verify ownership
    const { data: incident, error: incidentError } = await supabase
      .from("incidents")
      .select("*")
      .eq("id", incidentId)
      .eq("creator_id", creator.id)
      .single()

    if (incidentError || !incident) {
      throw new NotFoundError("Incident not found or you do not have access to it.")
    }

    // Fetch provenance records for the creator (related to any matched asset)
    let provenanceRecords: any[] = []
    if (incident.source_image_hash) {
      const admin = createAdminClient()
      const { data: provRecords } = await admin
        .from("provenance_records")
        .select("*")
        .eq("creator_id", creator.id)
        .eq("sha256_hash", incident.source_image_hash)
        .order("created_at", { ascending: true })

      provenanceRecords = provRecords ?? []
    }

    // Generate takedown packet
    const { content, hash } = await generateTakedownPacket({
      incident,
      creator: {
        id: creator.id,
        display_name: creator.display_name,
        email: creator.email,
        verified: creator.verification_status === "verified",
      },
      provenanceRecords: provenanceRecords.length > 0 ? provenanceRecords : undefined,
    })

    // Generate PDF buffer for storage
    const pdfBuffer = await generateTakedownPDF(content)

    // Store evidence packet in database
    const admin = createAdminClient()
    const { data: evidencePacket, error: epError } = await admin
      .from("evidence_packets")
      .insert({
        incident_id: incidentId,
        creator_id: creator.id,
        packet_type: "takedown",
        content,
        includes_provenance: provenanceRecords.length > 0,
        generated_hash: hash,
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (epError || !evidencePacket) {
      throw new AppError(
        "Failed to store evidence packet",
        "STORAGE_ERROR",
        500
      )
    }

    // Upload packet data to Supabase Storage
    let storagePath: string | null = null
    try {
      const fileName = `takedown-${evidencePacket.id}-${Date.now()}.json`
      const { data: uploadData, error: uploadError } = await admin.storage
        .from("exports")
        .upload(`takedown-packets/${fileName}`, pdfBuffer, {
          contentType: "application/json",
          upsert: false,
        })

      if (!uploadError && uploadData) {
        storagePath = uploadData.path

        // Update evidence packet with storage path
        await admin
          .from("evidence_packets")
          .update({ pdf_storage_path: storagePath })
          .eq("id", evidencePacket.id)
      }
    } catch {
      // Storage upload is non-critical; continue without it
      console.error("[Takedown] Failed to upload packet to storage")
    }

    // Determine platform report URL
    const platformReportUrl =
      getPlatformReportUrl(incident.platform, "copyright") ?? null

    // Create case record
    const { data: caseRecord, error: caseError } = await admin
      .from("cases")
      .insert({
        incident_id: incidentId,
        creator_id: creator.id,
        evidence_packet_id: evidencePacket.id,
        platform: incident.platform ?? "other",
        platform_report_url: platformReportUrl,
        status: "draft",
        metadata: {
          generated_hash: hash,
          has_provenance: provenanceRecords.length > 0,
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (caseError || !caseRecord) {
      throw new AppError("Failed to create enforcement case", "CASE_ERROR", 500)
    }

    // Update incident status
    await admin
      .from("incidents")
      .update({
        status: "actioned",
        action_taken: "takedown",
      })
      .eq("id", incidentId)

    // Log audit event
    await logAudit({
      userId: user.id,
      action: "enforcement.takedown_sent",
      resourceType: "case",
      resourceId: caseRecord.id,
      details: {
        incident_id: incidentId,
        platform: incident.platform,
        evidence_packet_id: evidencePacket.id,
        has_provenance: provenanceRecords.length > 0,
      },
    })

    return successResponse(
      {
        case: caseRecord,
        evidencePacket: {
          id: evidencePacket.id,
          content,
          hash,
          storagePath,
        },
        platformReportUrl,
      },
      201
    )
  } catch (error) {
    return errorResponse(error)
  }
}
