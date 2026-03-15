import { createAdminClient } from "@/lib/supabase/admin"
import { fetchUrl } from "./url-fetcher"
import { extractImageUrls, downloadImage } from "./image-extractor"
import { detectFaces } from "@/lib/aws/rekognition"
import { compareAgainstReference } from "./face-comparator"
import { checkWhitelist } from "./whitelist"
import { createLogger, generateOperationId } from "@/lib/utils/logger"

const log = createLogger("Detection.Pipeline")

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
  referenceAssetIds?: string[]
}

/**
 * Progress update sent during the pipeline.
 */
export interface PipelineProgress {
  phase: "fetching" | "downloading" | "analyzing" | "complete" | "error"
  current: number
  total: number
  matches: number
  message: string
}

/**
 * Summary returned after the pipeline completes.
 */
export interface PipelineSummary {
  incidents: IncidentRecord[]
  imagesFound: number
  facesDetected: number
  matches: number
  whitelistedSkips: number
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

/** Process a batch of items with a concurrency limit */
async function parallelMap<T, R>(
  items: T[],
  fn: (item: T, index: number) => Promise<R>,
  concurrency: number
): Promise<R[]> {
  const results: R[] = []
  let nextIndex = 0

  async function worker() {
    while (nextIndex < items.length) {
      const i = nextIndex++
      results[i] = await fn(items[i], i)
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => worker()
  )
  await Promise.all(workers)
  return results
}

/**
 * Runs the full detection pipeline for a scan.
 *
 * Pipeline steps:
 * 1. Update scan status to 'processing'
 * 2. Gather images (from URL or direct upload)
 * 3. Detect faces in each image (3 at a time)
 * 4. Compare faces against creator's reference images (early-exit)
 * 5. Check whitelist before creating incident
 * 6. Create incident records for matches (non-whitelisted)
 * 7. Update scan with final counts and status
 */
export async function runDetectionPipeline(
  params: PipelineParams,
  onProgress?: (progress: PipelineProgress) => void
): Promise<PipelineSummary> {
  const { scanId, creatorId, scanType, targetUrl, uploadedImageBuffer, referenceBuffers, referenceAssetIds } =
    params
  const supabase = createAdminClient()
  const opId = generateOperationId()

  let imagesFound = 0
  let facesDetected = 0
  let matchCount = 0
  let whitelistedSkips = 0
  const incidents: IncidentRecord[] = []

  const sendProgress = (p: Omit<PipelineProgress, "matches">) => {
    onProgress?.({ ...p, matches: matchCount })
  }

  try {
    // Step 1: Update scan status to 'processing'
    log.info(`Starting scan ${scanId}`, { scanType, creatorId, targetUrl }, opId)
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
      sendProgress({
        phase: "fetching",
        current: 0,
        total: 0,
        message: "Fetching webpage...",
      })
      log.info(`Fetching URL: ${targetUrl}`, undefined, opId)

      const fetchResult = await log.timed(
        "URL fetch",
        () => fetchUrl(targetUrl),
        { url: targetUrl },
        opId
      )

      if (fetchResult.imageBuffer) {
        log.info("URL returned a direct image", { finalUrl: fetchResult.finalUrl }, opId)
        imagesToAnalyze.push({
          buffer: fetchResult.imageBuffer,
          sourceUrl: fetchResult.finalUrl,
        })
      } else if (fetchResult.html) {
        log.info("URL returned HTML, extracting images", undefined, opId)
        const imageUrls = extractImageUrls(
          fetchResult.html,
          fetchResult.finalUrl
        )
        log.info(`Found ${imageUrls.length} image URLs in HTML`, undefined, opId)

        sendProgress({
          phase: "downloading",
          current: 0,
          total: imageUrls.length,
          message: `Downloading ${imageUrls.length} images...`,
        })

        // Download images in parallel (5 at a time)
        const downloaded = await parallelMap(
          imageUrls,
          async (imageUrl, idx) => {
            const result = await downloadImage(imageUrl)
            sendProgress({
              phase: "downloading",
              current: idx + 1,
              total: imageUrls.length,
              message: `Downloaded ${idx + 1}/${imageUrls.length} images`,
            })
            return result ? { buffer: result.buffer, sourceUrl: imageUrl } : null
          },
          5
        )

        for (const img of downloaded) {
          if (img) imagesToAnalyze.push(img)
        }
      }
    } else if (scanType === "image_upload" && uploadedImageBuffer) {
      log.info("Using uploaded image directly", { size: uploadedImageBuffer.length }, opId)
      imagesToAnalyze.push({
        buffer: uploadedImageBuffer,
        sourceUrl: null,
      })
    }

    imagesFound = imagesToAnalyze.length
    log.info(`Total images to analyze: ${imagesFound}`, undefined, opId)

    // Step 3-6: Process images with concurrency of 3
    let analyzedCount = 0

    await parallelMap(
      imagesToAnalyze,
      async ({ buffer, sourceUrl }, i) => {
        log.debug(`Processing image ${i + 1}/${imagesFound}`, {
          sourceUrl: sourceUrl ?? "uploaded",
          bufferSize: buffer.length,
        }, opId)

        // Detect faces in the image
        const faces = await detectFaces(buffer)
        facesDetected += faces.length

        analyzedCount++
        sendProgress({
          phase: "analyzing",
          current: analyzedCount,
          total: imagesFound,
          message: `Analyzing image ${analyzedCount}/${imagesFound}...`,
        })

        if (faces.length === 0) {
          log.debug(`No faces detected in image ${i + 1}`, undefined, opId)
          return
        }

        log.info(`Detected ${faces.length} face(s) in image ${i + 1}`, undefined, opId)

        // Compare against reference images
        const comparison = await compareAgainstReference(
          buffer,
          referenceBuffers
        )

        if (comparison.matched) {
          matchCount++
          log.info(`MATCH found in image ${i + 1}`, {
            similarity: comparison.bestSimilarity,
            referenceIndex: comparison.matchedReferenceIndex,
            sourceUrl,
          }, opId)

          sendProgress({
            phase: "analyzing",
            current: analyzedCount,
            total: imagesFound,
            message: `Match found! Analyzing ${analyzedCount}/${imagesFound}...`,
          })

          // Step 5: Check whitelist before creating incident
          const sourceToCheck = sourceUrl ?? targetUrl
          if (sourceToCheck) {
            const whitelistResult = await checkWhitelist(creatorId, sourceToCheck)
            if (whitelistResult.isWhitelisted) {
              whitelistedSkips++
              log.info("Match skipped — source is whitelisted", {
                sourceUrl: sourceToCheck,
                rule: whitelistResult.matchedRule?.label ?? whitelistResult.matchedRule?.sourceValue,
              }, opId)
              return
            }
          }

          // Determine platform
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
              log.debug("Evidence uploaded", { path: evidenceFileName }, opId)
            } else {
              log.warn("Evidence upload error", { error: uploadError.message }, opId)
            }
          } catch (uploadErr) {
            log.error("Evidence upload failed", uploadErr, undefined, opId)
          }

          // Step 6: Create incident record
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
                reference_asset_id: referenceAssetIds?.[comparison.matchedReferenceIndex] ?? null,
                detection_method: "aws_rekognition_face_compare",
              },
            })
            .select("id, source_url, platform, match_confidence, status")
            .single()

          if (incidentError) {
            log.error("Failed to create incident", incidentError, { sourceUrl }, opId)
          } else if (incident) {
            incidents.push(incident)
            log.info(`Incident created: ${incident.id}`, {
              confidence: incident.match_confidence,
              platform: incident.platform,
            }, opId)
          }
        } else {
          log.debug(`No match in image ${i + 1}`, {
            bestSimilarity: comparison.bestSimilarity,
          }, opId)
        }
      },
      3 // Process 3 images concurrently
    )

    // Step 7: Update scan with final counts and status
    await supabase
      .from("scans")
      .update({
        status: "completed",
        total_images_found: imagesFound,
        total_faces_detected: facesDetected,
        total_matches: matchCount,
        completed_at: new Date().toISOString(),
        metadata: {
          whitelisted_skips: whitelistedSkips,
          incidents_created: incidents.length,
        },
      })
      .eq("id", scanId)

    sendProgress({
      phase: "complete",
      current: imagesFound,
      total: imagesFound,
      message: `Scan complete — ${matchCount} match${matchCount !== 1 ? "es" : ""} found`,
    })

    log.info(`Scan ${scanId} completed`, {
      imagesFound,
      facesDetected,
      matches: matchCount,
      whitelistedSkips,
      incidents: incidents.length,
    }, opId)

    return { incidents, imagesFound, facesDetected, matches: matchCount, whitelistedSkips }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown pipeline error"

    log.error(`Scan ${scanId} failed`, error, {
      imagesFound,
      facesDetected,
      matchCount,
    }, opId)

    await supabase
      .from("scans")
      .update({
        status: "failed",
        error_message: errorMessage,
        completed_at: new Date().toISOString(),
      })
      .eq("id", scanId)

    sendProgress({
      phase: "error",
      current: 0,
      total: 0,
      message: `Scan failed: ${errorMessage}`,
    })

    return { incidents, imagesFound, facesDetected, matches: matchCount, whitelistedSkips }
  }
}
