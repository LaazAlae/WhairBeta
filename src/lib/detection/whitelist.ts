/**
 * Authorized source (whitelist) checker.
 *
 * Before creating an incident, the detection pipeline checks if the
 * source URL/domain/account is on the creator's whitelist. If so,
 * the match is logged but auto-dismissed.
 */

import { createAdminClient } from "@/lib/supabase/admin"
import { createLogger } from "@/lib/utils/logger"

const log = createLogger("Detection.Whitelist")

export interface WhitelistCheckResult {
  isWhitelisted: boolean
  matchedRule: {
    id: string
    sourceType: string
    sourceValue: string
    label: string | null
  } | null
}

/**
 * Checks if a given URL is whitelisted by the creator.
 *
 * Checks against:
 * 1. Exact URL match
 * 2. Domain match (e.g., "example.com" matches "https://example.com/page")
 * 3. Account match (e.g., "@username" on a platform)
 *
 * @param creatorId - The creator's ID
 * @param sourceUrl - The URL to check
 * @returns Whether the URL is whitelisted and which rule matched
 */
export async function checkWhitelist(
  creatorId: string,
  sourceUrl: string
): Promise<WhitelistCheckResult> {
  try {
    const supabase = createAdminClient()

    // Get all active whitelist entries for this creator
    const { data: entries, error } = await supabase
      .from("authorized_sources")
      .select("id, source_type, source_value, label")
      .eq("creator_id", creatorId)
      .eq("is_active", true)

    if (error) {
      log.error("Failed to fetch whitelist entries", error, { creatorId })
      return { isWhitelisted: false, matchedRule: null }
    }

    if (!entries || entries.length === 0) {
      return { isWhitelisted: false, matchedRule: null }
    }

    // Parse the source URL for matching
    let parsedUrl: URL | null = null
    try {
      parsedUrl = new URL(sourceUrl)
    } catch {
      log.warn("Could not parse source URL for whitelist check", { sourceUrl })
    }

    for (const entry of entries) {
      let matched = false

      switch (entry.source_type) {
        case "url":
          // Exact URL match (normalize trailing slashes)
          matched = normalizeUrl(sourceUrl) === normalizeUrl(entry.source_value)
          break

        case "domain":
          // Domain match — check if the URL's hostname matches or is a subdomain
          if (parsedUrl) {
            const hostname = parsedUrl.hostname.toLowerCase()
            const domain = entry.source_value.toLowerCase().replace(/^www\./, "")
            matched =
              hostname === domain ||
              hostname === `www.${domain}` ||
              hostname.endsWith(`.${domain}`)
          }
          break

        case "account":
          // Account handle match — check if the URL contains the account handle
          if (parsedUrl) {
            const handle = entry.source_value.toLowerCase().replace(/^@/, "")
            const pathLower = parsedUrl.pathname.toLowerCase()
            matched = pathLower.includes(`/${handle}`) || pathLower.includes(`/@${handle}`)
          }
          break

        case "platform":
          // Platform-wide whitelist — matches any URL on that platform
          if (parsedUrl) {
            const hostname = parsedUrl.hostname.toLowerCase()
            const platform = entry.source_value.toLowerCase()
            matched = hostname.includes(platform)
          }
          break
      }

      if (matched) {
        log.info("URL matched whitelist entry", {
          sourceUrl,
          ruleId: entry.id,
          ruleType: entry.source_type,
          ruleValue: entry.source_value,
        })
        return {
          isWhitelisted: true,
          matchedRule: {
            id: entry.id,
            sourceType: entry.source_type,
            sourceValue: entry.source_value,
            label: entry.label,
          },
        }
      }
    }

    return { isWhitelisted: false, matchedRule: null }
  } catch (error) {
    log.error("Whitelist check failed", error, { creatorId, sourceUrl })
    return { isWhitelisted: false, matchedRule: null }
  }
}

function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url)
    return `${parsed.protocol}//${parsed.hostname}${parsed.pathname.replace(/\/+$/, "")}${parsed.search}`
  } catch {
    return url.toLowerCase().replace(/\/+$/, "")
  }
}
