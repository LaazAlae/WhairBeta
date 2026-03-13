/**
 * Input sanitization utilities for preventing XSS and path traversal attacks.
 */

/**
 * Strips all HTML tags from a string.
 * This is a simple sanitizer — for rendering user content in React,
 * rely on React's built-in escaping. Use this for server-side
 * sanitization of text that will be stored or processed.
 *
 * @param input - The string to sanitize
 * @returns The string with all HTML tags removed
 *
 * @example
 * ```ts
 * sanitizeHtml("<script>alert('xss')</script>Hello")
 * // Returns: "alert('xss')Hello"
 *
 * sanitizeHtml("<b>Bold</b> <i>Italic</i>")
 * // Returns: "Bold Italic"
 * ```
 */
export function sanitizeHtml(input: string): string {
  // Remove HTML tags
  let sanitized = input.replace(/<[^>]*>/g, "");

  // Decode common HTML entities that could be used for obfuscation
  sanitized = sanitized
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/");

  // Re-strip after decoding (in case decoded entities formed new tags)
  sanitized = sanitized.replace(/<[^>]*>/g, "");

  return sanitized.trim();
}

/**
 * Sanitizes a filename by removing path traversal characters and
 * special characters that could cause issues on various file systems.
 *
 * Keeps only: alphanumeric characters, hyphens, underscores, dots, and spaces.
 * Prevents: directory traversal (../, ..\), null bytes, and other dangerous patterns.
 *
 * @param name - The filename to sanitize
 * @returns A safe filename string
 *
 * @example
 * ```ts
 * sanitizeFilename("../../../etc/passwd")
 * // Returns: "etcpasswd"
 *
 * sanitizeFilename("my photo (2).jpg")
 * // Returns: "my photo 2.jpg"
 *
 * sanitizeFilename("file\x00name.txt")
 * // Returns: "filename.txt"
 * ```
 */
export function sanitizeFilename(name: string): string {
  let sanitized = name;

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, "");

  // Remove path traversal patterns
  sanitized = sanitized.replace(/\.\.\//g, "");
  sanitized = sanitized.replace(/\.\.\\/g, "");
  sanitized = sanitized.replace(/\.\./g, "");

  // Remove absolute path prefixes
  sanitized = sanitized.replace(/^\/+/, "");
  sanitized = sanitized.replace(/^\\+/, "");
  sanitized = sanitized.replace(/^[a-zA-Z]:\\/, "");

  // Remove directory separators
  sanitized = sanitized.replace(/[/\\]/g, "");

  // Keep only safe characters: alphanumeric, hyphens, underscores, dots, spaces
  sanitized = sanitized.replace(/[^a-zA-Z0-9\-_.\s]/g, "");

  // Remove leading/trailing dots and spaces (prevent hidden files, Windows issues)
  sanitized = sanitized.replace(/^[.\s]+/, "");
  sanitized = sanitized.replace(/[.\s]+$/, "");

  // Collapse multiple consecutive dots
  sanitized = sanitized.replace(/\.{2,}/g, ".");

  // Collapse multiple consecutive spaces
  sanitized = sanitized.replace(/\s{2,}/g, " ");

  // If the filename is empty after sanitization, use a default
  if (!sanitized || sanitized.length === 0) {
    sanitized = "unnamed_file";
  }

  return sanitized;
}
