import { z } from "zod"

/**
 * Validation schema for URL-based scans.
 */
export const urlScanSchema = z.object({
  targetUrl: z
    .string()
    .url("Please enter a valid URL")
    .refine(
      (url) => {
        try {
          const parsed = new URL(url)
          return parsed.protocol === "http:" || parsed.protocol === "https:"
        } catch {
          return false
        }
      },
      { message: "URL must use http or https protocol" }
    ),
})

/**
 * Validation schema for image upload scans.
 * Validates that a file exists and is an acceptable image type.
 */
export const imageScanSchema = z.object({
  file: z
    .instanceof(File, { message: "Please select an image file" })
    .refine((file) => file.size > 0, { message: "File cannot be empty" })
    .refine((file) => file.size <= 10 * 1024 * 1024, {
      message: "File must be less than 10MB",
    })
    .refine(
      (file) =>
        ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(
          file.type
        ),
      { message: "File must be a JPEG, PNG, WebP, or GIF image" }
    ),
})

/**
 * Validation schema for updating an incident's status or action.
 */
export const incidentUpdateSchema = z.object({
  status: z
    .enum(["new", "reviewing", "confirmed", "dismissed", "actioned"])
    .optional(),
  actionTaken: z.enum(["takedown", "license"]).nullable().optional(),
})

export type UrlScanValues = z.infer<typeof urlScanSchema>
export type ImageScanValues = z.infer<typeof imageScanSchema>
export type IncidentUpdateValues = z.infer<typeof incidentUpdateSchema>
