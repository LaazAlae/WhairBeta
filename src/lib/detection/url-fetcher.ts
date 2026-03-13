import { validateUrl } from "@/lib/security/ssrf-guard"
import { SSRFError, AppError } from "@/lib/utils/errors"

const FETCH_TIMEOUT_MS = 10_000
const MAX_REDIRECTS = 3
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

export interface FetchResult {
  html?: string
  imageBuffer?: Buffer
  contentType: string
  finalUrl: string
}

/**
 * Fetches a URL with SSRF protection, timeout, and redirect handling.
 *
 * @param url - The URL to fetch
 * @returns The fetched content as HTML string or image Buffer
 * @throws SSRFError if the URL or any redirect URL is blocked
 * @throws AppError if the fetch fails for other reasons
 */
export async function fetchUrl(url: string): Promise<FetchResult> {
  // Step 1: Validate the initial URL
  const validation = await validateUrl(url)
  if (!validation.safe) {
    throw new SSRFError(validation.error ?? "URL is not allowed")
  }

  let currentUrl = url
  let redirectCount = 0

  while (redirectCount <= MAX_REDIRECTS) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

    try {
      const response = await fetch(currentUrl, {
        signal: controller.signal,
        redirect: "manual",
        headers: {
          "User-Agent": USER_AGENT,
          Accept:
            "text/html,application/xhtml+xml,image/*,*/*;q=0.8",
        },
      })

      clearTimeout(timeoutId)

      // Handle redirects manually so we can validate each redirect URL
      if (
        response.status >= 300 &&
        response.status < 400 &&
        response.headers.get("location")
      ) {
        redirectCount++
        if (redirectCount > MAX_REDIRECTS) {
          throw new AppError(
            `Too many redirects (max ${MAX_REDIRECTS})`,
            "TOO_MANY_REDIRECTS",
            400
          )
        }

        const redirectUrl = new URL(
          response.headers.get("location")!,
          currentUrl
        ).toString()

        // Re-validate the redirect URL through SSRF guard
        const redirectValidation = await validateUrl(redirectUrl)
        if (!redirectValidation.safe) {
          throw new SSRFError(
            redirectValidation.error ?? "Redirect URL is not allowed"
          )
        }

        currentUrl = redirectUrl
        continue
      }

      if (!response.ok) {
        throw new AppError(
          `Failed to fetch URL: HTTP ${response.status} ${response.statusText}`,
          "FETCH_FAILED",
          502
        )
      }

      const contentType =
        response.headers.get("content-type")?.toLowerCase() ?? ""

      // If response is an image, return the buffer
      if (contentType.startsWith("image/")) {
        const arrayBuffer = await response.arrayBuffer()
        return {
          imageBuffer: Buffer.from(arrayBuffer),
          contentType,
          finalUrl: currentUrl,
        }
      }

      // Otherwise treat as HTML/text
      const html = await response.text()
      return {
        html,
        contentType,
        finalUrl: currentUrl,
      }
    } catch (error) {
      clearTimeout(timeoutId)

      if (error instanceof SSRFError || error instanceof AppError) {
        throw error
      }

      if (error instanceof DOMException && error.name === "AbortError") {
        throw new AppError(
          `Request timed out after ${FETCH_TIMEOUT_MS}ms`,
          "FETCH_TIMEOUT",
          504
        )
      }

      throw new AppError(
        `Failed to fetch URL: ${error instanceof Error ? error.message : "Unknown error"}`,
        "FETCH_FAILED",
        502
      )
    }
  }

  throw new AppError(
    `Too many redirects (max ${MAX_REDIRECTS})`,
    "TOO_MANY_REDIRECTS",
    400
  )
}
