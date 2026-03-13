import {
  RekognitionClient,
  DetectFacesCommand,
  CompareFacesCommand,
  type BoundingBox,
  type FaceDetail,
} from "@aws-sdk/client-rekognition"
import { AWS_REGION, isAWSConfigured } from "./config"

/**
 * Simplified face detection result.
 */
export interface DetectedFace {
  boundingBox: BoundingBox | undefined
  confidence: number
  attributes: {
    ageRange?: { low: number; high: number }
    gender?: string
    smile?: boolean
  }
}

/**
 * Face comparison result.
 */
export interface ComparisonResult {
  matched: boolean
  similarity: number
  boundingBox: BoundingBox | undefined
}

/**
 * Singleton Rekognition client instance.
 */
let clientInstance: RekognitionClient | null = null

function getClient(): RekognitionClient {
  if (!clientInstance) {
    clientInstance = new RekognitionClient({ region: AWS_REGION })
  }
  return clientInstance
}

/**
 * Detects faces in an image buffer using AWS Rekognition.
 *
 * @param imageBuffer - The image data as a Buffer
 * @returns Array of detected faces with bounding boxes, confidence, and basic attributes
 */
export async function detectFaces(
  imageBuffer: Buffer
): Promise<DetectedFace[]> {
  if (!isAWSConfigured()) {
    console.warn("[Rekognition] AWS credentials not configured. Returning empty face detection result.")
    return []
  }

  try {
    const client = getClient()
    const command = new DetectFacesCommand({
      Image: { Bytes: imageBuffer },
      Attributes: ["DEFAULT"],
    })

    const response = await client.send(command)
    const faceDetails: FaceDetail[] = response.FaceDetails ?? []

    return faceDetails.map((face) => ({
      boundingBox: face.BoundingBox,
      confidence: face.Confidence ?? 0,
      attributes: {
        ageRange: face.AgeRange
          ? { low: face.AgeRange.Low ?? 0, high: face.AgeRange.High ?? 0 }
          : undefined,
        gender: face.Gender?.Value,
        smile: face.Smile?.Value,
      },
    }))
  } catch (error) {
    console.error("[Rekognition] detectFaces error:", error)
    return []
  }
}

/**
 * Compares faces between a source and target image using AWS Rekognition.
 *
 * @param sourceBuffer - The source (reference) image as a Buffer
 * @param targetBuffer - The target image to compare against
 * @param threshold - Minimum similarity threshold (0-100), defaults to 80
 * @returns The best match result with similarity score
 */
export async function compareFaces(
  sourceBuffer: Buffer,
  targetBuffer: Buffer,
  threshold: number = 80
): Promise<ComparisonResult> {
  if (!isAWSConfigured()) {
    console.warn("[Rekognition] AWS credentials not configured. Returning no-match result.")
    return { matched: false, similarity: 0, boundingBox: undefined }
  }

  try {
    const client = getClient()
    const command = new CompareFacesCommand({
      SourceImage: { Bytes: sourceBuffer },
      TargetImage: { Bytes: targetBuffer },
      SimilarityThreshold: threshold,
    })

    const response = await client.send(command)
    const matches = response.FaceMatches ?? []

    if (matches.length === 0) {
      return { matched: false, similarity: 0, boundingBox: undefined }
    }

    // Return the best match (highest similarity)
    const bestMatch = matches.reduce((best, current) => {
      const currentSimilarity = current.Similarity ?? 0
      const bestSimilarity = best.Similarity ?? 0
      return currentSimilarity > bestSimilarity ? current : best
    }, matches[0])

    const similarity = bestMatch.Similarity ?? 0

    return {
      matched: similarity >= threshold,
      similarity,
      boundingBox: bestMatch.Face?.BoundingBox,
    }
  } catch (error) {
    // Handle expected errors (e.g., no face detected in source/target)
    const message = error instanceof Error ? error.message : String(error)

    if (
      message.includes("no faces") ||
      message.includes("InvalidParameterException")
    ) {
      console.log("[Rekognition] No face detected in one of the images:", message)
      return { matched: false, similarity: 0, boundingBox: undefined }
    }

    console.error("[Rekognition] compareFaces error:", error)
    return { matched: false, similarity: 0, boundingBox: undefined }
  }
}
