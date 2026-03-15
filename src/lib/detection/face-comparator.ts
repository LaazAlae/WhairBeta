import { compareFaces } from "@/lib/aws/rekognition"
import { isAWSConfigured } from "@/lib/aws/config"
import { ENROLLMENT } from "@/lib/utils/constants"

/**
 * Result from comparing a target image against multiple reference images.
 */
export interface ComparisonSummary {
  matched: boolean
  bestSimilarity: number
  matchedReferenceIndex: number
}

/**
 * Compares a target image against multiple reference images to find the best match.
 *
 * Uses AWS Rekognition to compare the target against each reference image.
 * Exits early once a match above threshold is found.
 *
 * @param targetBuffer - The target image to check
 * @param referenceBuffers - Array of reference (enrolled) images to compare against
 * @param threshold - Minimum similarity threshold (0-100), defaults to enrollment min confidence
 * @returns Summary of the best match result
 */
export async function compareAgainstReference(
  targetBuffer: Buffer,
  referenceBuffers: Buffer[],
  threshold: number = ENROLLMENT.MIN_MATCH_CONFIDENCE
): Promise<ComparisonSummary> {
  if (!isAWSConfigured()) {
    console.warn(
      "[FaceComparator] AWS not configured. Skipping face comparison."
    )
    return {
      matched: false,
      bestSimilarity: 0,
      matchedReferenceIndex: -1,
    }
  }

  if (referenceBuffers.length === 0) {
    console.warn("[FaceComparator] No reference images provided.")
    return {
      matched: false,
      bestSimilarity: 0,
      matchedReferenceIndex: -1,
    }
  }

  let bestSimilarity = 0
  let matchedReferenceIndex = -1

  for (let i = 0; i < referenceBuffers.length; i++) {
    try {
      const result = await compareFaces(
        referenceBuffers[i],
        targetBuffer,
        threshold
      )

      if (result.similarity > bestSimilarity) {
        bestSimilarity = result.similarity
        matchedReferenceIndex = i
      }

      // Early exit: if we found a strong match, no need to check more references
      if (result.matched && result.similarity >= threshold) {
        console.log(
          `[FaceComparator] Match found on reference ${i}: ${result.similarity.toFixed(1)}% — skipping remaining`
        )
        break
      }
    } catch (error) {
      console.error(
        `[FaceComparator] Error comparing against reference ${i}:`,
        error instanceof Error ? error.message : error
      )
    }
  }

  return {
    matched: bestSimilarity >= threshold,
    bestSimilarity,
    matchedReferenceIndex,
  }
}
