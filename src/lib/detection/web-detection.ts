/**
 * Google Cloud Vision Web Detection integration.
 *
 * Uses the Vision API's Web Detection feature to find where an image
 * appears across the internet — pages containing the image, visually
 * similar images, and matching entities.
 *
 * This is fundamentally different from URL-by-URL scanning:
 * - URL scan: "Does this specific page contain my face?"
 * - Web Detection: "Where does this image appear ANYWHERE online?"
 *
 * Requires GOOGLE_CLOUD_API_KEY in environment.
 */

import { createLogger } from "@/lib/utils/logger"

const log = createLogger("Detection.WebDetection")

// ─── Types ──────────────────────────────────────────────────────────

export interface WebDetectionResult {
  /** Pages that contain this exact image or a close match */
  pagesWithMatchingImages: WebPage[]
  /** Full matches — identical image found elsewhere */
  fullMatchingImages: WebImage[]
  /** Partial matches — cropped or modified versions */
  partialMatchingImages: WebImage[]
  /** Visually similar images found online */
  visuallySimilarImages: WebImage[]
  /** Entity labels inferred from the image (e.g., person names) */
  webEntities: WebEntity[]
  /** Best guess labels for the image content */
  bestGuessLabels: string[]
}

export interface WebPage {
  url: string
  pageTitle: string | null
  fullMatchingImages: WebImage[]
  partialMatchingImages: WebImage[]
}

export interface WebImage {
  url: string
  score: number
}

export interface WebEntity {
  entityId: string
  description: string
  score: number
}

// ─── Configuration ──────────────────────────────────────────────────

function getApiKey(): string | null {
  return process.env.GOOGLE_CLOUD_API_KEY ?? null
}

export function isGoogleVisionConfigured(): boolean {
  return !!getApiKey()
}

// ─── Core API ───────────────────────────────────────────────────────

/**
 * Performs a Web Detection query using an image buffer.
 *
 * Sends the image to Google Cloud Vision API and returns all web
 * references, visually similar images, and entity detections.
 *
 * @param imageBuffer - The image data to search for
 * @param maxResults - Maximum number of results per category (default 20)
 * @returns Structured web detection results
 */
export async function detectWebPresence(
  imageBuffer: Buffer,
  maxResults: number = 20
): Promise<WebDetectionResult> {
  const apiKey = getApiKey()
  if (!apiKey) {
    log.warn("Google Cloud Vision API key not configured — skipping web detection")
    return emptyResult()
  }

  const operationId = crypto.randomUUID()
  log.info("Starting web detection", { imageSize: imageBuffer.length, maxResults }, operationId)

  const endpoint = `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`

  const requestBody = {
    requests: [
      {
        image: {
          content: imageBuffer.toString("base64"),
        },
        features: [
          {
            type: "WEB_DETECTION",
            maxResults,
          },
        ],
        imageContext: {
          webDetectionParams: {
            includeGeoResults: false,
          },
        },
      },
    ],
  }

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const errorBody = await response.text()
      log.error("Vision API returned error", new Error(errorBody), {
        status: response.status,
        statusText: response.statusText,
      }, operationId)

      if (response.status === 403) {
        throw new Error(
          "Google Cloud Vision API requires billing to be enabled. Please enable billing in the Google Cloud Console and retry."
        )
      }
      throw new Error(`Google Cloud Vision API error (${response.status}): ${response.statusText}`)
    }

    const data = await response.json()
    const annotation = data.responses?.[0]

    if (annotation?.error) {
      log.error("Vision API annotation error", new Error(annotation.error.message), {
        code: annotation.error.code,
      }, operationId)
      throw new Error(`Vision API error: ${annotation.error.message}`)
    }

    const webDetection = annotation?.webDetection
    if (!webDetection) {
      log.info("No web detection results returned", undefined, operationId)
      return emptyResult()
    }

    const result = parseWebDetection(webDetection)

    log.info("Web detection completed", {
      pagesFound: result.pagesWithMatchingImages.length,
      fullMatches: result.fullMatchingImages.length,
      partialMatches: result.partialMatchingImages.length,
      similarImages: result.visuallySimilarImages.length,
      entities: result.webEntities.length,
      bestGuesses: result.bestGuessLabels.length,
    }, operationId)

    return result
  } catch (error) {
    log.error("Web detection request failed", error, undefined, operationId)
    return emptyResult()
  }
}

/**
 * Performs a Web Detection query using an image URL.
 * More efficient than buffer-based detection when the image is already online.
 */
export async function detectWebPresenceByUrl(
  imageUrl: string,
  maxResults: number = 20
): Promise<WebDetectionResult> {
  const apiKey = getApiKey()
  if (!apiKey) {
    log.warn("Google Cloud Vision API key not configured — skipping web detection")
    return emptyResult()
  }

  const operationId = crypto.randomUUID()
  log.info("Starting web detection by URL", { imageUrl, maxResults }, operationId)

  const endpoint = `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`

  const requestBody = {
    requests: [
      {
        image: {
          source: { imageUri: imageUrl },
        },
        features: [
          {
            type: "WEB_DETECTION",
            maxResults,
          },
        ],
      },
    ],
  }

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const errorBody = await response.text()
      log.error("Vision API returned error", new Error(errorBody), {
        status: response.status,
      }, operationId)
      return emptyResult()
    }

    const data = await response.json()
    const annotation = data.responses?.[0]

    if (annotation?.error) {
      log.error("Vision API annotation error", new Error(annotation.error.message), {
        code: annotation.error.code,
      }, operationId)
      return emptyResult()
    }

    const webDetection = annotation?.webDetection
    if (!webDetection) {
      log.info("No web detection results returned", undefined, operationId)
      return emptyResult()
    }

    return parseWebDetection(webDetection)
  } catch (error) {
    log.error("Web detection by URL failed", error, { imageUrl }, operationId)
    return emptyResult()
  }
}

// ─── Helpers ────────────────────────────────────────────────────────

/* eslint-disable @typescript-eslint/no-explicit-any */
function parseWebDetection(wd: any): WebDetectionResult {
  return {
    pagesWithMatchingImages: (wd.pagesWithMatchingImages ?? []).map((p: any) => ({
      url: p.url ?? "",
      pageTitle: p.pageTitle ?? null,
      fullMatchingImages: (p.fullMatchingImages ?? []).map((img: any) => ({
        url: img.url ?? "",
        score: 0,
      })),
      partialMatchingImages: (p.partialMatchingImages ?? []).map((img: any) => ({
        url: img.url ?? "",
        score: 0,
      })),
    })),
    fullMatchingImages: (wd.fullMatchingImages ?? []).map((img: any) => ({
      url: img.url ?? "",
      score: 0,
    })),
    partialMatchingImages: (wd.partialMatchingImages ?? []).map((img: any) => ({
      url: img.url ?? "",
      score: 0,
    })),
    visuallySimilarImages: (wd.visuallySimilarImages ?? []).map((img: any) => ({
      url: img.url ?? "",
      score: img.score ?? 0,
    })),
    webEntities: (wd.webEntities ?? []).map((e: any) => ({
      entityId: e.entityId ?? "",
      description: e.description ?? "",
      score: e.score ?? 0,
    })),
    bestGuessLabels: (wd.bestGuessLabels ?? []).map(
      (l: any) => l.label ?? ""
    ),
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

function emptyResult(): WebDetectionResult {
  return {
    pagesWithMatchingImages: [],
    fullMatchingImages: [],
    partialMatchingImages: [],
    visuallySimilarImages: [],
    webEntities: [],
    bestGuessLabels: [],
  }
}
