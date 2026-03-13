import { z } from "zod"
import { FILE_LIMITS, ENROLLMENT } from "@/lib/utils/constants"

/**
 * Schema for identity enrollment form data.
 */
export const enrollmentSchema = z.object({
  displayName: z
    .string()
    .min(2, "Display name must be at least 2 characters")
    .max(100, "Display name must be at most 100 characters"),
})

/**
 * Schema for asset upload validation constraints.
 * Note: File validation is handled separately since files
 * come through FormData rather than JSON.
 */
export const assetUploadSchema = z.object({
  fileName: z.string().min(1, "File name is required"),
  fileType: z.string().refine(
    (type) =>
      FILE_LIMITS.ALLOWED_IMAGE_TYPES.includes(
        type as (typeof FILE_LIMITS.ALLOWED_IMAGE_TYPES)[number]
      ),
    { message: "File must be a JPEG, PNG, or WebP image" }
  ),
  fileSize: z
    .number()
    .max(FILE_LIMITS.MAX_FILE_SIZE, `File must be under ${FILE_LIMITS.MAX_FILE_SIZE_MB}MB`),
})

/**
 * Validates an array of files for enrollment requirements.
 */
export function validateEnrollmentFiles(files: File[]): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (files.length < ENROLLMENT.MIN_PHOTOS) {
    errors.push(`At least ${ENROLLMENT.MIN_PHOTOS} photos are required`)
  }

  if (files.length > ENROLLMENT.MAX_PHOTOS) {
    errors.push(`Maximum ${ENROLLMENT.MAX_PHOTOS} photos allowed`)
  }

  const allowedTypes = ["image/jpeg", "image/png", "image/webp"]

  for (const file of files) {
    if (!allowedTypes.includes(file.type)) {
      errors.push(`${file.name}: Only JPEG, PNG, and WebP images are accepted`)
    }
    if (file.size > FILE_LIMITS.MAX_FILE_SIZE) {
      errors.push(`${file.name}: File exceeds ${FILE_LIMITS.MAX_FILE_SIZE_MB}MB limit`)
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

export type EnrollmentValues = z.infer<typeof enrollmentSchema>
export type AssetUploadValues = z.infer<typeof assetUploadSchema>
