import { z } from "zod";
import { FILE_LIMITS, PAGINATION } from "@/lib/utils/constants";

/**
 * Shared Zod validation schemas used across the Whair platform.
 */

/**
 * UUID validation schema.
 * Uses Zod v4's built-in UUID format validator.
 */
export const uuidSchema = z.uuid("Invalid UUID format");

/**
 * URL validation schema — only allows http and https protocols.
 * Uses Zod v4's built-in httpUrl validator which restricts to http/https.
 */
export const urlSchema = z.httpUrl("URL must use http or https protocol");

/**
 * Email validation schema.
 * Uses Zod v4's built-in email format validator.
 */
export const emailSchema = z.email("Invalid email address");

/**
 * Pagination query parameters schema with defaults.
 */
export const paginationSchema = z.object({
  page: z
    .number()
    .int()
    .min(1, "Page must be at least 1")
    .default(PAGINATION.DEFAULT_PAGE),
  limit: z
    .number()
    .int()
    .min(1, "Limit must be at least 1")
    .max(PAGINATION.MAX_LIMIT, `Limit must not exceed ${PAGINATION.MAX_LIMIT}`)
    .default(PAGINATION.DEFAULT_LIMIT),
});

/**
 * Pagination schema that accepts string inputs (from query params)
 * and coerces them to numbers.
 */
export const paginationQuerySchema = z.object({
  page: z.coerce
    .number()
    .int()
    .min(1)
    .default(PAGINATION.DEFAULT_PAGE),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(PAGINATION.MAX_LIMIT)
    .default(PAGINATION.DEFAULT_LIMIT),
});

/**
 * File validation schema.
 * Validates MIME type and file size constraints.
 */
export const fileSchema = z.object({
  type: z.string().refine(
    (val) =>
      (FILE_LIMITS.ALLOWED_IMAGE_TYPES as readonly string[]).includes(val) ||
      (FILE_LIMITS.ALLOWED_VIDEO_TYPES as readonly string[]).includes(val) ||
      (FILE_LIMITS.ALLOWED_AUDIO_TYPES as readonly string[]).includes(val),
    {
      message: `File type must be one of: ${[
        ...FILE_LIMITS.ALLOWED_IMAGE_TYPES,
        ...FILE_LIMITS.ALLOWED_VIDEO_TYPES,
        ...FILE_LIMITS.ALLOWED_AUDIO_TYPES,
      ].join(", ")}`,
    }
  ),
  size: z
    .number()
    .int()
    .min(1, "File size must be greater than 0")
    .max(
      FILE_LIMITS.MAX_FILE_SIZE,
      `File size must not exceed ${FILE_LIMITS.MAX_FILE_SIZE_MB}MB`
    ),
  name: z.string().min(1, "Filename is required"),
});

/**
 * Image-only file validation schema.
 */
export const imageFileSchema = z.object({
  type: z.string().refine(
    (val) => (FILE_LIMITS.ALLOWED_IMAGE_TYPES as readonly string[]).includes(val),
    {
      message: `Image type must be one of: ${FILE_LIMITS.ALLOWED_IMAGE_TYPES.join(", ")}`,
    }
  ),
  size: z
    .number()
    .int()
    .min(1, "File size must be greater than 0")
    .max(
      FILE_LIMITS.MAX_FILE_SIZE,
      `File size must not exceed ${FILE_LIMITS.MAX_FILE_SIZE_MB}MB`
    ),
  name: z.string().min(1, "Filename is required"),
});
