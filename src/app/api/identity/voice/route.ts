import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { successResponse, errorResponse } from "@/lib/utils/api-response"
import { AuthError, ValidationError } from "@/lib/utils/errors"
import { logAudit } from "@/lib/security/audit"
import { createLogger, generateOperationId } from "@/lib/utils/logger"

const log = createLogger("API.Identity.Voice")

const ALLOWED_AUDIO_TYPES = [
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/ogg",
  "audio/mp4",
  "audio/m4a",
  "audio/aac",
  "audio/webm",
  "audio/x-wav",
  "audio/x-m4a",
  "audio/x-aac",
]

const AUDIO_EXTENSIONS = ["mp3", "wav", "ogg", "m4a", "aac", "webm", "mp4"]

const MAX_AUDIO_SIZE = 20 * 1024 * 1024 // 20MB
const MIN_DURATION_SECONDS = 5
const MAX_DURATION_SECONDS = 120

/**
 * GET /api/identity/voice
 * List all voice prints for the authenticated creator.
 */
export async function GET() {
  const opId = generateOperationId()
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new AuthError()

    const { data: creator } = await supabase
      .from("creators")
      .select("id")
      .eq("user_id", user.id)
      .single()
    if (!creator) throw new AuthError("Creator profile not found")

    log.info("Fetching voice prints", { creatorId: creator.id }, opId)

    const { data: voicePrints, error } = await supabase
      .from("voice_prints")
      .select("*")
      .eq("creator_id", creator.id)
      .order("created_at", { ascending: false })

    if (error) {
      log.error("Failed to fetch voice prints", error, { creatorId: creator.id }, opId)
      throw error
    }

    log.info("Voice prints fetched", { count: voicePrints?.length ?? 0 }, opId)
    return successResponse(voicePrints ?? [])
  } catch (error) {
    log.error("GET /api/identity/voice failed", error, undefined, opId)
    return errorResponse(error)
  }
}

/**
 * POST /api/identity/voice
 * Upload a voice sample for voice print enrollment.
 *
 * Accepts multipart/form-data with:
 * - file: Audio file (mp3, wav, ogg, mp4, webm)
 * - sampleName: Optional name for the sample
 */
export async function POST(request: NextRequest) {
  const opId = generateOperationId()
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new AuthError()

    const { data: creator } = await supabase
      .from("creators")
      .select("id")
      .eq("user_id", user.id)
      .single()
    if (!creator) throw new AuthError("Creator profile not found. Please complete identity enrollment first.")

    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const sampleName = (formData.get("sampleName") as string) || "Voice sample"

    if (!file) {
      throw new ValidationError("No audio file provided")
    }

    log.info("Voice upload received", {
      creatorId: creator.id,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      sampleName,
    }, opId)

    // Validate file type — check MIME type first, fall back to extension
    const ext = file.name.split(".").pop()?.toLowerCase() ?? ""
    if (!ALLOWED_AUDIO_TYPES.includes(file.type) && !AUDIO_EXTENSIONS.includes(ext)) {
      throw new ValidationError(
        `Unsupported audio format: ${file.type} (ext: .${ext}). Accepted: MP3, WAV, OGG, M4A, WebM`
      )
    }

    // Validate file size
    if (file.size > MAX_AUDIO_SIZE) {
      throw new ValidationError(`Audio file exceeds ${MAX_AUDIO_SIZE / (1024 * 1024)}MB limit`)
    }

    if (file.size < 1024) {
      throw new ValidationError("Audio file is too small — minimum 1KB")
    }

    // Upload to Supabase Storage
    const admin = createAdminClient()
    const fileId = crypto.randomUUID()
    const extension = file.name.split(".").pop() ?? "mp3"
    const storagePath = `${creator.id}/voice/${fileId}.${extension}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Compute SHA-256 hash of the audio
    const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer)
    const sha256Hash = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")

    log.info("Uploading voice sample to storage", { storagePath, hash: sha256Hash.slice(0, 16) }, opId)

    const { error: uploadError } = await admin.storage
      .from("assets")
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      log.error("Voice upload to storage failed", uploadError, { storagePath }, opId)
      throw new ValidationError(
        `Storage upload failed: ${uploadError.message ?? "unknown error"}`
      )
    }

    // Create voice_prints record
    const { data: voicePrint, error: insertError } = await admin
      .from("voice_prints")
      .insert({
        creator_id: creator.id,
        sample_name: sampleName,
        storage_path: storagePath,
        storage_bucket: "assets",
        sha256_hash: sha256Hash,
        status: "processing",
        metadata: {
          original_filename: file.name,
          mime_type: file.type,
          file_size: file.size,
        },
      })
      .select()
      .single()

    if (insertError || !voicePrint) {
      log.error("Failed to create voice print record", insertError, { creatorId: creator.id }, opId)
      throw new ValidationError(
        `DB insert failed: ${insertError?.message ?? "no data returned"}`
      )
    }

    // Also create an asset record for this voice sample
    await admin.from("assets").insert({
      creator_id: creator.id,
      file_name: file.name,
      file_type: file.type,
      file_size: file.size,
      storage_path: storagePath,
      sha256_hash: sha256Hash,
      is_canonical: true,
      status: "active",
      metadata: {
        asset_type: "voice",
        voice_print_id: voicePrint.id,
      },
    })

    // Mark voice print as ready (in a real system, we'd process audio features async)
    // For now, we mark it ready immediately since we're storing raw audio
    await admin
      .from("voice_prints")
      .update({ status: "ready" })
      .eq("id", voicePrint.id)

    await logAudit({
      userId: user.id,
      creatorId: creator.id,
      action: "voice.enroll",
      resourceType: "voice_print",
      resourceId: voicePrint.id,
      details: {
        sampleName,
        fileName: file.name,
        fileSize: file.size,
      },
      ip: request.headers.get("x-forwarded-for") ?? undefined,
      userAgent: request.headers.get("user-agent") ?? undefined,
    })

    log.info("Voice print enrolled successfully", { voicePrintId: voicePrint.id }, opId)

    return successResponse(
      { ...voicePrint, status: "ready" },
      201
    )
  } catch (error) {
    log.error("POST /api/identity/voice failed", error, undefined, opId)
    return errorResponse(error)
  }
}
