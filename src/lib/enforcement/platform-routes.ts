import { platforms, type Platform } from "@/config/platforms"

/**
 * Returns the correct reporting URL for a given platform and report type.
 * Falls back to the first available report URL if the exact type is not found.
 */
export function getPlatformReportUrl(
  platform: string,
  reportType: "copyright" | "impersonation"
): string | null {
  const config = platforms[platform.toLowerCase()]
  if (!config) return null

  // Try exact match first
  if (config.reportUrls[reportType]) {
    return config.reportUrls[reportType]
  }

  // Fall back to first available report URL
  const urls = Object.values(config.reportUrls)
  return urls.length > 0 ? urls[0] : null
}

/**
 * Returns all available report URLs for a platform as an object.
 */
export function getPlatformReportUrls(
  platform: string
): Record<string, string> {
  const config = platforms[platform.toLowerCase()]
  if (!config) return {}
  return config.reportUrls
}

/**
 * Matches a domain against known platform domains and returns the platform ID.
 * Returns 'other' if no known platform matches.
 */
export function getPlatformFromDomain(domain: string): string {
  const normalizedDomain = domain.toLowerCase().replace(/^www\./, "")

  for (const [id, config] of Object.entries(platforms)) {
    if (
      config.domains.some(
        (d) => normalizedDomain === d || normalizedDomain.endsWith(`.${d}`)
      )
    ) {
      return id
    }
  }

  return "other"
}

/**
 * Retrieves the full platform configuration by ID.
 * Returns undefined if not found.
 */
export function getPlatformConfig(platform: string): Platform | undefined {
  return platforms[platform.toLowerCase()]
}

/**
 * Returns a human-readable label for a report type.
 */
export function getReportTypeLabel(reportType: string): string {
  const labels: Record<string, string> = {
    copyright: "Copyright Infringement",
    impersonation: "Impersonation / Identity Misuse",
    aiContent: "AI-Generated Content",
    rules: "Platform Rules Violation",
  }
  return labels[reportType] ?? reportType.replace(/([A-Z])/g, " $1").trim()
}
