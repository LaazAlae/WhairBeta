import { createAdminClient } from "@/lib/supabase/admin"
import { fetchUrl } from "./url-fetcher"
import { extractImageUrls, downloadImage } from "./image-extractor"
import { detectFaces } from "@/lib/aws/rekognition"
import { compareAgainstReference } from "./face-comparator"

/**
 * Parameters for running the detection pipeline.
 */
export interface PipelineParams {
  scanId: string
  creatorId: string
  scanType: "url" | "image_upload"
  targetUrl?: string
  uploadedImageBuffer?: Buffer
  referenceBuffers: Buffer[]
}

/**
 * Summary returned after the pipeline completes.
 */
export interface PipelineSummary {
  incidents: IncidentRecord[]
  imagesFound: number
  facesDetected: number
  matches: number
}

/**
 * A created incident record.
 */
interface IncidentRecord {
  id: string
  source_url: string | null
  platform: string | null
  match_confidence: number
  status: string
}

/**
 * Known platform domain mappings.
 */
const PLATFORM_MAP: Record<string, string> = {
  "youtube.com": "youtube",
  "www.youtube.com": "youtube",
  "youtu.be": "youtube",
  "instagram.com": "instagram",
  "www.instagram.com": "instagram",
  "tiktok.com": "tiktok",
  "www.tiktok.com": "tiktok",
  "twitter.com": "x",
  "www.twitter.com": "x",
  "x.com": "x",
  "www.x.com": "x",
  "facebook.com": "facebook",
  "www.facebook.com": "facebook",
  "fb.com": "facebook",
  "reddit.com": "reddit",
  "www.reddit.com": "reddit",
  "linkedin.com": "linkedin",
  "www.linkedin.com": "linkedin",
  "pinterest.com": "pinterest",
  "www.pinterest.com": "pinterest",
  "tumblr.com": "tumblr",
  "www.tumblr.com": "tumblr",
  "flickr.com": "flickr",
  "www.flickr.com": "flickr",
  "vimeo.com": "vimeo",
  "www.vimeo.com": "vimeo",
  "twitch.tv": "twitch",
  "www.twitch.tv": "twitch",
}

/**
 * Determines the platform name from a URL hostname.
 */
function detectPlatform(url: string): string | null {
  try {
    const hostname = new URL(url).hostname.toLowerCase()
    return PLATFORM_MAP[hostname] ?? null
  } catch {
    return null
  }
}

/**
 * Runs the full detection pipeline for a scan.
 *
 * Pipeline steps:
 * 1. Update scan status to 'processing'
 * 2. Gather images (from URL or direct upload)
 * 3. Detect faces in each image
 * 4. Compare faces against creator's reference images
 * 5. Create incident records for matches
 * 6. Update scan with final counts and status
 *
 * @param params - Pipeline parameters including scan ID, creator ID, and image/URL data
 * @returns Summary of pipeline results
 */
export async function runDetectionPipeline(
  params: PipelineParams
): Promise<PipelineSummary> {
  const { scanId, creatorId, scanType, targetUrl, uploadedImageBuffer, referenceBuffers } =
    params
  const supabase = createAdminClient()

  let imagesFound = 0
  let facesDetected = 0
  let matchCount = 0
  const incidents: IncidentRecord[] = []

  try {
    // Step 1: Update scan status to 'processing'
    console.log(`[Pipeline] Starting scan ${scanId} (type: ${scanType})`)
    await supabase
      .from("scans")
      .update({
        status: "processing",
        started_at: new Date().toISOString(),
      })
      .eq("id", scanId)

    // Step 2: Gather images to analyze
    const imagesToAnalyze: Array<{
      buffer: Buffer
      sourceUrl: string | null
    }> = []

    if (scanType === "url" && targetUrl) {
      console.log(`[Pipeline] Fetching URL: ${targetUrl}`)
      const fetchResult = await fetchUrl(targetUrl)

      if (fetchResult.imageBuffer) {
        // Direct image URL
        console.log("[Pipeline] URL returned a direct image")
        imagesToAnalyze.push({
          buffer: fetchResult.imageBuffer,
          sourceUrl: fetchResult.finalUrl,
        })
      } else if (fetchResult.html) {
        // HTML page - extract image URLs
        console.log("[Pipeline] URL returned HTML, extracting images...")
        const imageUrls = extractImageUrls(
          fetchResult.html,
          fetchResult.finalUrl
        )
        console.log(`[Pipeline] Found ${imageUrls.length} image URLs`)

        // Download each image (limit to 20)
        for (const imageUrl of imageUrls) {
          const downloaded = await downloadImage(imageUrl)
          if (downloaded) {
            imagesToAnalyze.push({
              buffer: downloaded.buffer,
              sourceUrl: imageUrl,
            })
          }
        }
      }
    } else if (scanType === "image_upload" && uploadedImageBuffer) {
      console.log("[Pipeline] Using uploaded image directly")
      imagesToAnalyze.push({
        buffer: uploadedImageBuffer,
        sourceUrl: null,
      })
    }

    imagesFound = imagesToAnalyze.length
    console.log(`[Pipeline] Total images to analyze: ${imagesFound}`)

    // Step 3-4: Process each image
    for (let i = 0; i < imagesToAnalyze.length; i++) {
      const { buffer, sourceUrl } = imagesToAnalyze[i]
      console.log(
        `[Pipeline] Processing image ${i + 1}/${imagesFound}: ${sourceUrl ?? "uploaded"}`
      )

      // Detect faces in the image
      const faces = await detectFaces(buffer)
      facesDetected += faces.length

      if (faces.length === 0) {
        console.log(`[Pipeline] No faces detected in image ${i + 1}`)
        continue
      }

      console.log(
        `[Pipeline] Detected ${faces.length} face(s) in image ${i + 1}`
      )

      // Compare against reference images
      const comparison = await compareAgainstReference(
        buffer,
        referenceBuffers
      )

      if (comparison.matched) {
        matchCount++
        console.log(
          `[Pipeline] MATCH found! Similarity: ${comparison.bestSimilarity.toFixed(2)}%`
        )

        // Step 5: Determine platform and upload evidence
        const platform = sourceUrl ? detectPlatform(sourceUrl) : null
        let matchedImagePath: string | null = null

        // Upload the matched image as evidence
        try {
          const evidenceFileName = `evidence/${creatorId}/${scanId}/${Date.now()}-match-${i}.jpg`
          const { error: uploadError } = await supabase.storage
            .from("evidence")
            .upload(evidenceFileName, buffer, {
              contentType: "image/jpeg",
              upsert: false,
            })

          if (!uploadError) {
            matchedImagePath = evidenceFileName
          } else {
            console.error("[Pipeline] Evidence upload error:", uploadError.message)
          }
        } catch (uploadErr) {
          console.error("[Pipeline] Evidence upload failed:", uploadErr)
        }

        // Create incident record
        const { data: incident, error: incidentError } = await supabase
          .from("incidents")
          .insert({
            scan_id: scanId,
            creator_id: creatorId,
            source_url: sourceUrl ?? targetUrl ?? null,
            platform,
            match_confidence: Math.round(comparison.bestSimilarity * 100) / 100,
            matched_image_path: matchedImagePath,
            evidence_timestamp: new Date().toISOString(),
            status: "new",
            metadata: {
              faces_detected: faces.length,
              matched_reference_index: comparison.matchedReferenceIndex,
            },
          })
          .select("id, source_url, platform, match_confidence, status")
          .single()

        if (incidentError) {
          console.error("[Pipeline] Failed to create incident:", incidentError.message)
        } else if (incident) {
          incidents.push(incident)
          console.log(`[Pipeline] Created incident: ${incident.id}`)
        }
      } else {
        console.log(
          `[Pipeline] No match in image ${i + 1} (best similarity: ${comparison.bestSimilarity.toFixed(2)}%)`
        )
      }
    }

    // Step 6: Update scan with final counts and status
    await supabase
      .from("scans")
      .update({
        status: "completed",
        total_images_found: imagesFound,
        total_faces_detected: facesDetected,
        total_matches: matchCount,
        completed_at: new Date().toISOString(),
      })
      .eq("id", scanId)

    console.log(
      `[Pipeline] Scan ${scanId} completed. Images: ${imagesFound}, Faces: ${facesDetected}, Matches: ${matchCount}`
    )

    return { incidents, imagesFound, facesDetected, matches: matchCount }
  } catch (error) {
    // On any error: update scan status to 'failed'
    const errorMessage =
      error instanceof Error ? error.message : "Unknown pipeline error"

    console.error(`[Pipeline] Scan ${scanId} failed:`, errorMessage)

    await supabase
      .from("scans")
      .update({
        status: "failed",
        error_message: errorMessage,
        completed_at: new Date().toISOString(),
      })
      .eq("id", scanId)

    return { incidents, imagesFound, facesDetected, matches: matchCount }
  }
}
