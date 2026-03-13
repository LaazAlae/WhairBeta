const IMAGE_DOWNLOAD_TIMEOUT_MS = 5_000
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024 // 10MB
const MAX_IMAGES = 20

/**
 * Extracts image URLs from HTML content.
 *
 * Parses the following sources:
 * - <img src="..."> tags
 * - <meta property="og:image" content="...">
 * - <video poster="...">
 *
 * Resolves relative URLs to absolute, filters out data: URIs, SVGs, and tracking pixels.
 * Returns at most 20 image URLs.
 *
 * @param html - The raw HTML string to parse
 * @param baseUrl - The base URL used to resolve relative paths
 * @returns Array of absolute image URL strings
 */
export function extractImageUrls(html: string, baseUrl: string): string[] {
  const urls = new Set<string>()

  // Extract <img src="..."> tags
  const imgSrcRegex = /<img[^>]+src\s*=\s*["']([^"']+)["']/gi
  let match: RegExpExecArray | null
  while ((match = imgSrcRegex.exec(html)) !== null) {
    addResolvedUrl(match[1], baseUrl, urls)
  }

  // Extract <meta property="og:image" content="...">
  const ogImageRegex =
    /<meta[^>]+property\s*=\s*["']og:image["'][^>]+content\s*=\s*["']([^"']+)["']/gi
  while ((match = ogImageRegex.exec(html)) !== null) {
    addResolvedUrl(match[1], baseUrl, urls)
  }

  // Also check reversed attribute order for og:image
  const ogImageReversedRegex =
    /<meta[^>]+content\s*=\s*["']([^"']+)["'][^>]+property\s*=\s*["']og:image["']/gi
  while ((match = ogImageReversedRegex.exec(html)) !== null) {
    addResolvedUrl(match[1], baseUrl, urls)
  }

  // Extract <video poster="...">
  const videoPosterRegex =
    /<video[^>]+poster\s*=\s*["']([^"']+)["']/gi
  while ((match = videoPosterRegex.exec(html)) !== null) {
    addResolvedUrl(match[1], baseUrl, urls)
  }

  // Filter and limit results
  const filtered = Array.from(urls).filter((url) => {
    // Skip data: URIs
    if (url.startsWith("data:")) return false

    // Skip SVG files
    if (url.endsWith(".svg") || url.includes(".svg?")) return false

    // Skip common tracking pixels by known patterns
    const lowerUrl = url.toLowerCase()
    if (
      lowerUrl.includes("pixel") ||
      lowerUrl.includes("beacon") ||
      lowerUrl.includes("tracking") ||
      lowerUrl.includes("1x1") ||
      lowerUrl.includes("spacer")
    ) {
      return false
    }

    return true
  })

  return filtered.slice(0, MAX_IMAGES)
}

/**
 * Resolves a potentially relative URL against a base URL and adds it to the set.
 */
function addResolvedUrl(
  rawUrl: string,
  baseUrl: string,
  urlSet: Set<string>
): void {
  try {
    const resolved = new URL(rawUrl, baseUrl).toString()
    urlSet.add(resolved)
  } catch {
    // Skip URLs that cannot be parsed
  }
}

/**
 * Downloads an image from a URL with timeout and size validation.
 *
 * @param url - The image URL to download
 * @returns The image buffer and content type, or null on failure
 */
export async function downloadImage(
  url: string
): Promise<{ buffer: Buffer; contentType: string } | null> {
  const controller = new AbortController()
  const timeoutId = setTimeout(
    () => controller.abort(),
    IMAGE_DOWNLOAD_TIMEOUT_MS
  )

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "image/*",
      },
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      console.log(
        `[ImageExtractor] Failed to download image ${url}: HTTP ${response.status}`
      )
      return null
    }

    const contentType =
      response.headers.get("content-type")?.toLowerCase() ?? ""

    // Validate it is actually an image
    if (!contentType.startsWith("image/")) {
      console.log(
        `[ImageExtractor] URL ${url} is not an image (content-type: ${contentType})`
      )
      return null
    }

    // Check content-length header if available
    const contentLength = response.headers.get("content-length")
    if (contentLength && parseInt(contentLength, 10) > MAX_IMAGE_SIZE_BYTES) {
      console.log(
        `[ImageExtractor] Image ${url} exceeds max size (${contentLength} bytes)`
      )
      return null
    }

    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Validate actual size
    if (buffer.length > MAX_IMAGE_SIZE_BYTES) {
      console.log(
        `[ImageExtractor] Image ${url} exceeds max size (${buffer.length} bytes)`
      )
      return null
    }

    return { buffer, contentType }
  } catch (error) {
    clearTimeout(timeoutId)
    console.log(
      `[ImageExtractor] Error downloading image ${url}:`,
      error instanceof Error ? error.message : error
    )
    return null
  }
}
