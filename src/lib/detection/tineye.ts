/**
 * TinEye reverse image search API client.
 * Gracefully degrades if no TINEYE_API_KEY is configured.
 */

const TINEYE_API_URL = "https://api.tineye.com/rest/search/"

export interface TinEyeMatch {
  url: string
  domain: string
  score: number
  width: number
  height: number
}

/**
 * Searches for an image using the TinEye reverse image search API.
 *
 * If TINEYE_API_KEY is not set, returns an empty array silently.
 *
 * @param imageBuffer - The image data as a Buffer
 * @returns Array of matching results from TinEye
 */
export async function searchByImage(
  imageBuffer: Buffer
): Promise<TinEyeMatch[]> {
  const apiKey = process.env.TINEYE_API_KEY

  if (!apiKey) {
    console.log(
      "[TinEye] TINEYE_API_KEY not configured. Skipping reverse image search."
    )
    return []
  }

  try {
    const formData = new FormData()
    const blob = new Blob([new Uint8Array(imageBuffer)], { type: "image/jpeg" })
    formData.append("image", blob, "search.jpg")

    const response = await fetch(TINEYE_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    })

    if (!response.ok) {
      console.error(
        `[TinEye] API request failed: HTTP ${response.status} ${response.statusText}`
      )
      return []
    }

    const data = await response.json()
    const matches = data.results?.matches ?? []

    return matches.map(
      (match: {
        backlinks?: Array<{ url?: string }>
        domain?: string
        score?: number
        width?: number
        height?: number
      }) => ({
        url: match.backlinks?.[0]?.url ?? "",
        domain: match.domain ?? "",
        score: match.score ?? 0,
        width: match.width ?? 0,
        height: match.height ?? 0,
      })
    )
  } catch (error) {
    console.error(
      "[TinEye] Error during reverse image search:",
      error instanceof Error ? error.message : error
    )
    return []
  }
}
