import { createHash } from "crypto"

/**
 * Computes a SHA-256 hash of a Buffer.
 * Returns a hex-encoded hash string.
 */
export async function hashFile(buffer: Buffer): Promise<string> {
  const hash = createHash("sha256")
  hash.update(buffer)
  return hash.digest("hex")
}

/**
 * Computes a SHA-256 hash from an ArrayBuffer.
 * Converts the ArrayBuffer to a Buffer, then delegates to hashFile.
 */
export async function hashFileFromArrayBuffer(ab: ArrayBuffer): Promise<string> {
  const buffer = Buffer.from(ab)
  return hashFile(buffer)
}
