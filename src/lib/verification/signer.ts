import { createHmac, timingSafeEqual } from "crypto"

function getSigningSecret(): string {
  const secret = process.env.WHAIR_SIGNING_SECRET
  if (!secret) {
    throw new Error("WHAIR_SIGNING_SECRET environment variable is not set")
  }
  return secret
}

function getSigningKeyId(): string {
  const keyId = process.env.WHAIR_SIGNING_KEY_ID
  if (!keyId) {
    throw new Error("WHAIR_SIGNING_KEY_ID environment variable is not set")
  }
  return keyId
}

/**
 * Creates an HMAC-SHA256 signature of the provided data string.
 * Returns the hex-encoded signature, the key ID, and an ISO timestamp.
 */
export function signData(data: string): {
  signature: string
  keyId: string
  signedAt: string
} {
  const secret = getSigningSecret()
  const keyId = getSigningKeyId()

  const hmac = createHmac("sha256", secret)
  hmac.update(data)
  const signature = hmac.digest("hex")

  return {
    signature,
    keyId,
    signedAt: new Date().toISOString(),
  }
}

/**
 * Verifies an HMAC-SHA256 signature by recomputing the HMAC
 * and comparing using timingSafeEqual to prevent timing attacks.
 */
export function verifySignature(data: string, signature: string): boolean {
  try {
    const secret = getSigningSecret()

    const hmac = createHmac("sha256", secret)
    hmac.update(data)
    const expected = hmac.digest("hex")

    // Both must be the same length for timingSafeEqual
    const expectedBuffer = Buffer.from(expected, "hex")
    const signatureBuffer = Buffer.from(signature, "hex")

    if (expectedBuffer.length !== signatureBuffer.length) {
      return false
    }

    return timingSafeEqual(expectedBuffer, signatureBuffer)
  } catch {
    return false
  }
}

/**
 * Creates the canonical payload string used for signing provenance records.
 * Concatenates hash + creatorId + timestamp to form the data to sign.
 */
export function createProvenancePayload(
  hash: string,
  creatorId: string,
  timestamp: string
): string {
  return `${hash}:${creatorId}:${timestamp}`
}
