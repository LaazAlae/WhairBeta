/**
 * Platform enforcement configuration.
 * Maps each supported social media platform to its reporting endpoints,
 * visual identity, and domain patterns.
 */

export interface Platform {
  /** Unique platform identifier */
  id: string;
  /** Display name */
  name: string;
  /** Domains associated with the platform (for URL matching) */
  domains: string[];
  /** Reporting URLs for different infringement types */
  reportUrls: Record<string, string>;
  /** Lucide icon name for UI rendering */
  iconName: string;
  /** Brand color hex code */
  color: string;
}

export const platforms: Record<string, Platform> = {
  youtube: {
    id: "youtube",
    name: "YouTube",
    domains: ["youtube.com", "youtu.be"],
    reportUrls: {
      copyright: "https://support.google.com/youtube/answer/2807622",
      aiContent: "https://support.google.com/youtube/answer/13986489",
    },
    iconName: "Youtube",
    color: "#FF0000",
  },
  instagram: {
    id: "instagram",
    name: "Instagram",
    domains: ["instagram.com"],
    reportUrls: {
      copyright: "https://help.instagram.com/contact/552695131608132",
      impersonation: "https://help.instagram.com/contact/636276399721841",
    },
    iconName: "Instagram",
    color: "#E4405F",
  },
  tiktok: {
    id: "tiktok",
    name: "TikTok",
    domains: ["tiktok.com"],
    reportUrls: {
      copyright: "https://www.tiktok.com/legal/report/Copyright",
    },
    iconName: "Music",
    color: "#010101",
  },
  x: {
    id: "x",
    name: "X (Twitter)",
    domains: ["x.com", "twitter.com"],
    reportUrls: {
      rules: "https://help.x.com/en/rules-and-policies/x-rules",
    },
    iconName: "Twitter",
    color: "#000000",
  },
};

/**
 * Finds the matching platform configuration for a given URL.
 * Returns undefined if no platform matches.
 *
 * @example
 * ```ts
 * const platform = getPlatformFromUrl("https://www.youtube.com/watch?v=abc");
 * // Returns platforms.youtube
 * ```
 */
export function getPlatformFromUrl(url: string): Platform | undefined {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    return Object.values(platforms).find((platform) =>
      platform.domains.some(
        (domain) => hostname === domain || hostname.endsWith(`.${domain}`)
      )
    );
  } catch {
    return undefined;
  }
}

/**
 * Returns a list of all supported platform IDs.
 */
export function getSupportedPlatformIds(): string[] {
  return Object.keys(platforms);
}
