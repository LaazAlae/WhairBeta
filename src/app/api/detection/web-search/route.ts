import { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { successResponse, errorResponse } from "@/lib/utils/api-response"
import { AuthError, ValidationError, AppError } from "@/lib/utils/errors"
import {
  detectWebPresence,
  isGoogleVisionConfigured,
} from "@/lib/detection/web-detection"
import { checkWhitelist } from "@/lib/detection/whitelist"
import { logAudit } from "@/lib/security/audit"
import { createLogger, generateOperationId } from "@/lib/utils/logger"

const log = createLogger("API.Detection.WebSearch")

/**
 * POST /api/detection/web-search
 *
 * Runs a Google Cloud Vision Web Detection scan using one of the
 * creator's enrolled reference images. This finds everywhere that
 * image (or visually similar images) appears on the internet.
 *
 * Body (JSON): { assetId: string }
 * - Uses the creator's enrolled reference image to search
 *
 * OR multipart/form-data with:
 * - file: Image file to search for
 */
export async function POST(request: NextRequest) {
  const opId = generateOperationId()
  try {
    // Check if Google Vision is configured
    if (!isGoogleVisionConfigured()) {
      throw new ValidationError(
        "Google Cloud Vision is not configured. Add GOOGLE_CLOUD_API_KEY to environment variables."
      )
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new AuthError()

    const { data: creator } = await supabase
      .from("creators")
      .select("id")
      .eq("user_id", user.id)
      .single()
    if (!creator) throw new AuthError("Creator profile not found")

    const contentType = request.headers.get("content-type") ?? ""
    let imageBuffer: Buffer
    let referenceAssetId: string | null = null

    if (contentType.includes("application/json")) {
      // Use an enrolled asset
      const body = await request.json()
      const assetId = body.assetId
      referenceAssetId = assetId

      if (!assetId || typeof assetId !== "string") {
        throw new ValidationError("assetId is required")
      }

      log.info("Web search using enrolled asset", { assetId, creatorId: creator.id }, opId)

      // Fetch asset record
      const { data: asset, error: assetError } = await supabase
        .from("assets")
        .select("id, storage_path")
        .eq("id", assetId)
        .eq("creator_id", creator.id)
        .single()

      if (assetError || !asset) {
        throw new ValidationError("Asset not found or not owned by you")
      }

      // Download from storage
      const admin = createAdminClient()
      const { data: blob, error: downloadError } = await admin.storage
        .from("assets")
        .download(asset.storage_path)

      if (downloadError || !blob) {
        log.error("Failed to download asset for web search", downloadError, { assetId }, opId)
        throw new AppError("Failed to download asset image", "STORAGE_ERROR", 500)
      }

      const arrayBuffer = await blob.arrayBuffer()
      imageBuffer = Buffer.from(arrayBuffer)
    } else if (contentType.includes("multipart/form-data")) {
      // Direct image upload
      const formData = await request.formData()
      const file = formData.get("file") as File | null

      if (!file) {
        throw new ValidationError("No image file provided")
      }

      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        throw new ValidationError("File must be JPEG, PNG, or WebP")
      }

      if (file.size > 10 * 1024 * 1024) {
        throw new ValidationError("File must be less than 10MB")
      }

      log.info("Web search using uploaded image", {
        fileName: file.name,
        fileSize: file.size,
        creatorId: creator.id,
      }, opId)

      const arrayBuffer = await file.arrayBuffer()
      imageBuffer = Buffer.from(arrayBuffer)
    } else {
      throw new ValidationError("Send JSON with assetId or multipart/form-data with file")
    }

    // Run Google Vision Web Detection
    const webResult = await log.timed(
      "Google Vision Web Detection",
      () => detectWebPresence(imageBuffer),
      { imageSize: imageBuffer.length },
      opId
    )

    // Create a scan record for this web detection
    const admin = createAdminClient()
    const { data: scan } = await admin
      .from("scans")
      .insert({
        creator_id: creator.id,
        scan_type: "web_detection",
        status: "completed",
        total_images_found: webResult.pagesWithMatchingImages.length +
          webResult.fullMatchingImages.length +
          webResult.partialMatchingImages.length,
        total_faces_detected: 0,
        total_matches: webResult.pagesWithMatchingImages.length,
        metadata: {
          web_entities: webResult.webEntities.slice(0, 5),
          best_guess_labels: webResult.bestGuessLabels,
        },
        completed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    // Create incidents for pages with matching images (filtering out whitelisted ones)
    // Use top-level matching images as fallback when per-page images are empty
    const globalMatchImageUrl =
      webResult.fullMatchingImages[0]?.url ??
      webResult.partialMatchingImages[0]?.url ??
      null
    const incidents = []
    for (const page of webResult.pagesWithMatchingImages) {
      // Check whitelist before creating incident
      const whitelistCheck = await checkWhitelist(creator.id, page.url)
      if (whitelistCheck.isWhitelisted) {
        log.info("Page whitelisted, skipping incident", {
          url: page.url,
          rule: whitelistCheck.matchedRule?.label,
        }, opId)
        continue
      }

      // Determine platform from URL
      let platform: string | null = null
      try {
        const hostname = new URL(page.url).hostname.toLowerCase()
        if (hostname.includes("youtube")) platform = "youtube"
        else if (hostname.includes("instagram")) platform = "instagram"
        else if (hostname.includes("tiktok")) platform = "tiktok"
        else if (hostname.includes("twitter") || hostname.includes("x.com")) platform = "x"
        else if (hostname.includes("facebook")) platform = "facebook"
        else if (hostname.includes("reddit")) platform = "reddit"
        else if (hostname.includes("pinterest")) platform = "pinterest"
      } catch { /* ignore parse errors */ }

      const { data: incident } = await admin
        .from("incidents")
        .insert({
          creator_id: creator.id,
          scan_id: scan?.id ?? null,
          source_url: page.url,
          platform,
          match_confidence: 85, // Web Detection doesn't give exact confidence, default to 85
          status: "new",
          metadata: {
            page_title: page.pageTitle,
            detection_method: "google_vision_web_detection",
            full_matches: page.fullMatchingImages.length,
            partial_matches: page.partialMatchingImages.length,
            matched_image_url:
              page.fullMatchingImages[0]?.url ??
              page.partialMatchingImages[0]?.url ??
              globalMatchImageUrl,
            reference_asset_id: referenceAssetId,
          },
        })
        .select("id, source_url, platform, match_confidence, status")
        .single()

      if (incident) {
        incidents.push(incident)
      }
    }

    // Audit log
    await logAudit({
      userId: user.id,
      creatorId: creator.id,
      action: "scan.complete",
      resourceType: "scan",
      resourceId: scan?.id,
      details: {
        scanType: "web_detection",
        pagesFound: webResult.pagesWithMatchingImages.length,
        incidentsCreated: incidents.length,
        fullMatches: webResult.fullMatchingImages.length,
        partialMatches: webResult.partialMatchingImages.length,
        similarImages: webResult.visuallySimilarImages.length,
      },
    })

    log.info("Web detection scan completed", {
      scanId: scan?.id,
      pagesFound: webResult.pagesWithMatchingImages.length,
      incidentsCreated: incidents.length,
    }, opId)

    return successResponse({
      scan,
      webDetection: {
        pagesWithMatchingImages: webResult.pagesWithMatchingImages,
        fullMatchingImages: webResult.fullMatchingImages.slice(0, 20),
        partialMatchingImages: webResult.partialMatchingImages.slice(0, 20),
        visuallySimilarImages: webResult.visuallySimilarImages.slice(0, 20),
        webEntities: webResult.webEntities,
        bestGuessLabels: webResult.bestGuessLabels,
      },
      incidents,
    })
  } catch (error) {
    log.error("POST /api/detection/web-search failed", error, undefined, opId)
    return errorResponse(error)
  }
}
