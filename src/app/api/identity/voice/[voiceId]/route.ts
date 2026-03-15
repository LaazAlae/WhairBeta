import { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { successResponse, errorResponse } from "@/lib/utils/api-response"
import { AuthError, NotFoundError } from "@/lib/utils/errors"
import { logAudit } from "@/lib/security/audit"
import { createLogger, generateOperationId } from "@/lib/utils/logger"

const log = createLogger("API.Identity.VoicePrint")

/**
 * GET /api/identity/voice/[voiceId]
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ voiceId: string }> }
) {
  const opId = generateOperationId()
  try {
    const { voiceId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new AuthError()

    const { data: creator } = await supabase
      .from("creators")
      .select("id")
      .eq("user_id", user.id)
      .single()
    if (!creator) throw new AuthError("Creator profile not found")

    const { data: voicePrint, error } = await supabase
      .from("voice_prints")
      .select("*")
      .eq("id", voiceId)
      .eq("creator_id", creator.id)
      .single()

    if (error || !voicePrint) {
      throw new NotFoundError("Voice print not found")
    }

    log.info("Voice print fetched", { voiceId }, opId)
    return successResponse(voicePrint)
  } catch (error) {
    log.error("GET voice print failed", error, undefined, opId)
    return errorResponse(error)
  }
}

/**
 * DELETE /api/identity/voice/[voiceId]
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ voiceId: string }> }
) {
  const opId = generateOperationId()
  try {
    const { voiceId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new AuthError()

    const { data: creator } = await supabase
      .from("creators")
      .select("id")
      .eq("user_id", user.id)
      .single()
    if (!creator) throw new AuthError("Creator profile not found")

    // Get voice print to find storage path
    const { data: voicePrint } = await supabase
      .from("voice_prints")
      .select("id, storage_path, storage_bucket")
      .eq("id", voiceId)
      .eq("creator_id", creator.id)
      .single()

    if (!voicePrint) {
      throw new NotFoundError("Voice print not found")
    }

    log.info("Deleting voice print", { voiceId, storagePath: voicePrint.storage_path }, opId)

    const admin = createAdminClient()

    // Delete from storage
    if (voicePrint.storage_path) {
      const { error: storageError } = await admin.storage
        .from(voicePrint.storage_bucket || "assets")
        .remove([voicePrint.storage_path])

      if (storageError) {
        log.warn("Failed to delete voice file from storage", {
          error: storageError.message,
          path: voicePrint.storage_path,
        }, opId)
      }
    }

    // Delete database record
    const { error: deleteError } = await admin
      .from("voice_prints")
      .delete()
      .eq("id", voiceId)
      .eq("creator_id", creator.id)

    if (deleteError) {
      log.error("Failed to delete voice print record", deleteError, { voiceId }, opId)
      throw deleteError
    }

    await logAudit({
      userId: user.id,
      creatorId: creator.id,
      action: "voice.delete",
      resourceType: "voice_print",
      resourceId: voiceId,
    })

    log.info("Voice print deleted", { voiceId }, opId)
    return successResponse({ deleted: true })
  } catch (error) {
    log.error("DELETE voice print failed", error, undefined, opId)
    return errorResponse(error)
  }
}
