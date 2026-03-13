/**
 * Content Security Policy (CSP) header configuration.
 *
 * This CSP is designed for the Whair platform and allows:
 * - Self-hosted resources
 * - Supabase for API/storage/auth
 * - Stripe for payment processing
 * - Inline styles (required by many UI libraries)
 * - Blob and data URIs for images (required for image previews)
 */

/**
 * The Supabase project domain, extracted from the environment variable.
 * Falls back to a wildcard Supabase pattern if not set.
 */
function getSupabaseDomain(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (url) {
    try {
      const parsed = new URL(url);
      return parsed.host;
    } catch {
      // Fall through to default
    }
  }
  return "*.supabase.co";
}

/**
 * Builds the Content Security Policy header string.
 */
export function buildCspHeader(): string {
  const supabaseDomain = getSupabaseDomain();

  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": [
      "'self'",
      "https://js.stripe.com",
    ],
    "style-src": [
      "'self'",
      "'unsafe-inline'",
    ],
    "img-src": [
      "'self'",
      "blob:",
      "data:",
      `https://${supabaseDomain}`,
    ],
    "font-src": [
      "'self'",
      "data:",
    ],
    "connect-src": [
      "'self'",
      `https://${supabaseDomain}`,
      `wss://${supabaseDomain}`,
      "https://api.stripe.com",
    ],
    "frame-src": [
      "'self'",
      "https://js.stripe.com",
    ],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
    "upgrade-insecure-requests": [],
  };

  return Object.entries(directives)
    .map(([key, values]) => {
      if (values.length === 0) {
        return key;
      }
      return `${key} ${values.join(" ")}`;
    })
    .join("; ");
}

/**
 * Pre-built CSP header string for use in middleware and config.
 * Use `buildCspHeader()` if you need a dynamically generated version.
 */
export const CSP_HEADER = buildCspHeader();
