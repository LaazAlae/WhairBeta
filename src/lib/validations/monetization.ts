import { z } from "zod"

/**
 * Schema for creating a new license.
 */
export const createLicenseSchema = z.object({
  incidentId: z.string().uuid("Invalid incident ID"),
  priceCents: z
    .number()
    .int("Price must be a whole number of cents")
    .min(100, "Minimum license price is $1.00"),
  licenseType: z.enum(["single_use", "time_limited", "perpetual"], {
    message: "License type is required",
  }),
  expiresAt: z
    .string()
    .datetime({ message: "Invalid date format" })
    .optional(),
  licenseeEmail: z
    .string()
    .email("Invalid email address")
    .optional()
    .or(z.literal("")),
  licenseeName: z.string().optional().or(z.literal("")),
})

/**
 * Schema for updating a license status (revoke or cancel).
 */
export const updateLicenseSchema = z.object({
  status: z.enum(["revoked", "cancelled"], {
    message: "Status must be 'revoked' or 'cancelled'",
  }),
})

export type CreateLicenseValues = z.infer<typeof createLicenseSchema>
export type UpdateLicenseValues = z.infer<typeof updateLicenseSchema>
