import { z } from "zod"

/**
 * Validation schema for creating a new enforcement case.
 */
export const createCaseSchema = z.object({
  incidentId: z
    .string()
    .uuid("Incident ID must be a valid UUID"),
})

/**
 * Validation schema for updating an existing enforcement case.
 */
export const updateCaseSchema = z.object({
  status: z.enum(
    [
      "draft",
      "submitted",
      "acknowledged",
      "in_review",
      "removed",
      "denied",
      "appealed",
      "closed",
    ],
    { message: "Invalid case status" }
  ),
  resolutionNotes: z
    .string()
    .max(2000, "Resolution notes must be 2000 characters or fewer")
    .optional(),
})

/**
 * Validation schema for initiating a takedown request.
 */
export const takedownRequestSchema = z.object({
  incidentId: z
    .string()
    .uuid("Incident ID must be a valid UUID"),
})

export type CreateCaseValues = z.infer<typeof createCaseSchema>
export type UpdateCaseValues = z.infer<typeof updateCaseSchema>
export type TakedownRequestValues = z.infer<typeof takedownRequestSchema>

/**
 * Valid case status values as a const array for use in components.
 */
export const ENFORCEMENT_CASE_STATUSES = [
  "draft",
  "submitted",
  "acknowledged",
  "in_review",
  "removed",
  "denied",
  "appealed",
  "closed",
] as const

export type EnforcementCaseStatus = (typeof ENFORCEMENT_CASE_STATUSES)[number]
