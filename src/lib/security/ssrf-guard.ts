import { lookup } from "dns/promises";

/**
 * SSRF (Server-Side Request Forgery) prevention module.
 * Validates URLs before making server-side requests to ensure they
 * don't target internal infrastructure, cloud metadata endpoints,
 * or other restricted destinations.
 */

interface ValidationResult {
  safe: boolean;
  error?: string;
}

/** Allowed ports for outbound requests */
const ALLOWED_PORTS = new Set([80, 443]);

/** IPv4 private/reserved CIDR ranges */
const PRIVATE_IPV4_RANGES: Array<{ network: number; mask: number; label: string }> = [
  { network: ipToNumber("10.0.0.0"), mask: 0xff000000, label: "10.0.0.0/8 (private)" },
  { network: ipToNumber("172.16.0.0"), mask: 0xfff00000, label: "172.16.0.0/12 (private)" },
  { network: ipToNumber("192.168.0.0"), mask: 0xffff0000, label: "192.168.0.0/16 (private)" },
  { network: ipToNumber("127.0.0.0"), mask: 0xff000000, label: "127.0.0.0/8 (loopback)" },
  { network: ipToNumber("0.0.0.0"), mask: 0xff000000, label: "0.0.0.0/8 (unspecified)" },
  { network: ipToNumber("169.254.0.0"), mask: 0xffff0000, label: "169.254.0.0/16 (link-local)" },
];

/** Blocked IPv6 addresses */
const BLOCKED_IPV6 = ["::1", "::"];

/** Cloud metadata IP */
const CLOUD_METADATA_IP = "169.254.169.254";

/**
 * Converts a dotted-decimal IPv4 string to a 32-bit number.
 */
function ipToNumber(ip: string): number {
  const parts = ip.split(".").map(Number);
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

/**
 * Checks if an IPv4 address falls within any private/reserved range.
 */
function isPrivateIPv4(ip: string): string | null {
  const ipNum = ipToNumber(ip);

  for (const range of PRIVATE_IPV4_RANGES) {
    if ((ipNum & range.mask) === (range.network & range.mask)) {
      return range.label;
    }
  }

  // Check cloud metadata IP explicitly
  if (ip === CLOUD_METADATA_IP) {
    return "169.254.169.254 (cloud metadata)";
  }

  return null;
}

/**
 * Checks if an IPv6 address is private or loopback.
 */
function isPrivateIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase().trim();

  // Loopback
  if (BLOCKED_IPV6.includes(normalized)) {
    return true;
  }

  // fc00::/7 — unique local addresses (fc00:: and fd00::)
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) {
    return true;
  }

  // fe80::/10 — link-local
  if (normalized.startsWith("fe80")) {
    return true;
  }

  return false;
}

/**
 * Validates a URL for SSRF safety.
 *
 * Checks performed:
 * 1. Valid URL format
 * 2. Only http/https protocols allowed
 * 3. No user:password@ credentials in URL
 * 4. Port must be 80, 443, or default
 * 5. Hostname must not resolve to private/reserved IPs
 * 6. No cloud metadata endpoints (169.254.169.254)
 * 7. No IPv6 private/loopback addresses
 *
 * @param url - The URL string to validate
 * @returns Object with `safe` boolean and optional `error` message
 *
 * @example
 * ```ts
 * const result = await validateUrl("https://example.com/image.jpg");
 * if (!result.safe) {
 *   throw new SSRFError(result.error);
 * }
 * ```
 */
export async function validateUrl(url: string): Promise<ValidationResult> {
  // Step 1: Parse the URL
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { safe: false, error: "Invalid URL format" };
  }

  // Step 2: Only allow http and https protocols
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return {
      safe: false,
      error: `Protocol "${parsed.protocol}" is not allowed. Only http and https are permitted.`,
    };
  }

  // Step 3: Block credentials in URL (user:password@host)
  if (parsed.username || parsed.password) {
    return {
      safe: false,
      error: "URLs with embedded credentials (user:password@) are not allowed",
    };
  }

  // Step 4: Validate port
  if (parsed.port) {
    const port = parseInt(parsed.port, 10);
    if (!ALLOWED_PORTS.has(port)) {
      return {
        safe: false,
        error: `Port ${port} is not allowed. Only ports 80 and 443 are permitted.`,
      };
    }
  }

  const hostname = parsed.hostname;

  // Step 5: Check if hostname is already an IP address
  // IPv4 pattern
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (ipv4Regex.test(hostname)) {
    const privateRange = isPrivateIPv4(hostname);
    if (privateRange) {
      return {
        safe: false,
        error: `Direct IP access to ${privateRange} is not allowed`,
      };
    }
  }

  // IPv6 in brackets
  const ipv6BracketRegex = /^\[(.+)\]$/;
  const ipv6Match = hostname.match(ipv6BracketRegex);
  if (ipv6Match) {
    if (isPrivateIPv6(ipv6Match[1])) {
      return {
        safe: false,
        error: "IPv6 private/loopback addresses are not allowed",
      };
    }
  }

  // Step 6: Resolve hostname and check resolved IP
  try {
    const result = await lookup(hostname);

    if (result.family === 4) {
      const privateRange = isPrivateIPv4(result.address);
      if (privateRange) {
        return {
          safe: false,
          error: `Hostname "${hostname}" resolves to ${result.address} (${privateRange}), which is not allowed`,
        };
      }
    }

    if (result.family === 6) {
      if (isPrivateIPv6(result.address)) {
        return {
          safe: false,
          error: `Hostname "${hostname}" resolves to a private/loopback IPv6 address, which is not allowed`,
        };
      }
    }
  } catch {
    return {
      safe: false,
      error: `Unable to resolve hostname "${hostname}"`,
    };
  }

  return { safe: true };
}
