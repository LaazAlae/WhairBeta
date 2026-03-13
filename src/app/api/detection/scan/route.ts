import { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { successResponse, errorResponse } from "@/lib/utils/api-response"
import { AuthError, ValidationError, AppError } from "@/lib/utils/errors"
import { urlScanSchema } from "@/lib/validations/detection"
import { runDetectionPipeline } from "@/lib/detection/pipeline"
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

    // Get creator record
    const { data: creator } = await supabase
      .from("creators")
      .select("id")
      .eq("user_id", user.id)
      .single()

    if (!creator) {
      throw new AuthError("Creator profile not found. Please complete identity enrollment first.")
    }

    // Validate creator has enrolled assets (reference photos)
    const { data: assets } = await supabase
      .from("assets")
      .select("id, storage_path")
      .eq("creator_id", creator.id)
      .eq("is_canonical", true)
      .eq("status", "verified")

    if (!assets || assets.length === 0) {
      throw new ValidationError(
        "No reference photos found. Please upload reference photos in the Identity section before scanning."
      )
    }

    // Parse request body - determine scan type
    const contentType = request.headers.get("content-type") ?? ""
    let scanType: "url" | "image_upload"
    let targetUrl: string | undefined
    let uploadedImageBuffer: Buffer | undefined

    if (contentType.includes("application/json")) {
      // URL scan
      const body = await request.json()
      const validated = urlScanSchema.parse(body)
      scanType = "url"
      targetUrl = validated.targetUrl
    } else if (contentType.includes("multipart/form-data")) {
      // Image upload scan
      const formData = await request.formData()
      const file = formData.get("file") as File | null

      if (!file) {
        throw new ValidationError("No image file provided")
      }

      // Validate file type
      if (
        !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(
          file.type
        )
      ) {
        throw new ValidationError(
          "File must be a JPEG, PNG, WebP, or GIF image"
        )
      }

      // Validate file size (10MB)
      if (file.size > 10 * 1024 * 1024) {
        throw new ValidationError("File must be less than 10MB")
      }

      const arrayBuffer = await file.arrayBuffer()
      uploadedImageBuffer = Buffer.from(arrayBuffer)
      scanType = "image_upload"
    } else {
      throw new ValidationError(
        "Invalid request format. Send JSON with targetUrl or FormData with file."
      )
    }

    // Create scan record in database
    const admin = createAdminClient()
    const { data: scan, error: scanError } = await admin
      .from("scans")
      .insert({
        creator_id: creator.id,
        scan_type: scanType,
        target_url: targetUrl ?? null,
        uploaded_image_path: null,
        status: "pending",
        total_images_found: 0,
        total_faces_detected: 0,
        total_matches: 0,
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (scanError || !scan) {
      console.error("[ScanAPI] Failed to create scan record:", scanError?.message)
      throw new AppError(
        "Failed to create scan record",
        "DB_ERROR",
        500
      )
    }

    console.log(`[ScanAPI] Created scan ${scan.id} (type: ${scanType})`)

    // Fetch creator's canonical reference images from Supabase Storage
    const referenceBuffers: Buffer[] = []
    for (const asset of assets) {
      try {
        const { data: blob, error: downloadError } = await admin.storage
          .from("assets")
          .download(asset.storage_path)

        if (downloadError) {
          console.error(
            `[ScanAPI] Failed to download reference asset ${asset.id}:`,
            downloadError.message
          )
          continue
        }

        if (blob) {
          const arrayBuffer = await blob.arrayBuffer()
          referenceBuffers.push(Buffer.from(arrayBuffer))
        }
      } catch (err) {
        console.error(
          `[ScanAPI] Error downloading reference asset ${asset.id}:`,
          err
        )
      }
    }

    if (referenceBuffers.length === 0) {
      console.warn(
        "[ScanAPI] Could not load any reference images. Scan will proceed but no matches will be found."
      )
    }

    // Log audit event
    await logAudit({
      userId: user.id,
      action: "scan.initiate",
      resourceType: "scan",
      resourceId: scan.id,
      details: { scanType, targetUrl },
    })

    // Run detection pipeline synchronously
    const result = await runDetectionPipeline({
      scanId: scan.id,
      creatorId: creator.id,
      scanType,
      targetUrl,
      uploadedImageBuffer,
      referenceBuffers,
    })

    // Log completion
    await logAudit({
      userId: user.id,
      action: "scan.complete",
      resourceType: "scan",
      resourceId: scan.id,
      details: {
        imagesFound: result.imagesFound,
        facesDetected: result.facesDetected,
        matches: result.matches,
      },
    })

    // Fetch updated scan record to return the latest data
    const { data: updatedScan } = await admin
      .from("scans")
      .select("*")
      .eq("id", scan.id)
      .single()

    return successResponse({ scan: updatedScan ?? scan, result }, 202)
  } catch (error) {
    console.error("[ScanAPI] Error:", error)
    return errorResponse(error)
  }
}
