/**
 * App-wide constants for the Whair platform.
 */

export const APP_NAME = "Whair" as const;
export const APP_DESCRIPTION = "Digital likeness protection platform" as const;
export const APP_VERSION = "1.0.0-beta" as const;

/**
 * Supported social media platforms for detection and enforcement.
 */
export const SUPPORTED_PLATFORMS = [
  "youtube",
  "instagram",
  "tiktok",
  "x",
] as const;

export type SupportedPlatform = (typeof SUPPORTED_PLATFORMS)[number];

/**
 * File upload limits and constraints.
 */
export const FILE_LIMITS = {
  /** Maximum file size in bytes (10MB) */
  MAX_FILE_SIZE: 10 * 1024 * 1024,
  /** Maximum file size in megabytes for display */
  MAX_FILE_SIZE_MB: 10,
  /** Allowed image MIME types */
  ALLOWED_IMAGE_TYPES: [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
  ] as const,
  /** Allowed video MIME types */
  ALLOWED_VIDEO_TYPES: [
    "video/mp4",
    "video/quicktime",
    "video/webm",
  ] as const,
  /** Allowed audio MIME types */
  ALLOWED_AUDIO_TYPES: [
    "audio/mpeg",
    "audio/wav",
    "audio/ogg",
    "audio/mp4",
  ] as const,
  /** All allowed MIME types combined */
  get ALLOWED_MIME_TYPES() {
    return [
      ...this.ALLOWED_IMAGE_TYPES,
      ...this.ALLOWED_VIDEO_TYPES,
      ...this.ALLOWED_AUDIO_TYPES,
    ] as const;
  },
} as const;

/**
 * Rate limiting configurations for API routes.
 */
export const RATE_LIMITS = {
  /** General API rate limit */
  API: {
    /** Maximum requests per window */
    limit: 100,
    /** Window duration in milliseconds (1 minute) */
    windowMs: 60 * 1000,
  },
  /** Authentication rate limit (more restrictive) */
  AUTH: {
    limit: 10,
    windowMs: 60 * 1000,
  },
  /** File upload rate limit */
  UPLOAD: {
    limit: 20,
    windowMs: 60 * 1000,
  },
  /** Scan/detection rate limit */
  SCAN: {
    limit: 30,
    windowMs: 60 * 1000,
  },
  /** Webhook rate limit (more generous) */
  WEBHOOK: {
    limit: 200,
    windowMs: 60 * 1000,
  },
} as const;

/**
 * Pagination defaults.
 */
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

/**
 * Identity enrollment constraints.
 */
export const ENROLLMENT = {
  /** Minimum number of reference photos for face enrollment */
  MIN_PHOTOS: 5,
  /** Maximum number of reference photos for face enrollment */
  MAX_PHOTOS: 20,
  /** Minimum face match confidence threshold (0-100) */
  MIN_MATCH_CONFIDENCE: 80,
} as const;

/**
 * Supported asset types for the platform.
 */
export const ASSET_TYPES = [
  "image",
  "video",
  "audio",
] as const;

export type AssetType = (typeof ASSET_TYPES)[number];

/**
 * Incident status values.
 */
export const INCIDENT_STATUSES = [
  "detected",
  "reviewing",
  "confirmed",
  "takedown_sent",
  "takedown_acknowledged",
  "removed",
  "dismissed",
  "licensed",
] as const;

export type IncidentStatus = (typeof INCIDENT_STATUSES)[number];

/**
 * Case status values.
 */
export const CASE_STATUSES = [
  "open",
  "in_progress",
  "pending_response",
  "resolved",
  "closed",
] as const;

export type CaseStatus = (typeof CASE_STATUSES)[number];

/**
 * License status values.
 */
export const LICENSE_STATUSES = [
  "pending",
  "active",
  "expired",
  "revoked",
] as const;

export type LicenseStatus = (typeof LICENSE_STATUSES)[number];

/**
 * Audit log action types.
 */
export const AUDIT_ACTIONS = [
  "identity.enroll",
  "identity.update",
  "identity.delete",
  "asset.upload",
  "asset.sign",
  "asset.delete",
  "scan.initiate",
  "scan.complete",
  "incident.create",
  "incident.update",
  "incident.dismiss",
  "case.create",
  "case.update",
  "case.close",
  "license.create",
  "license.revoke",
  "enforcement.takedown_sent",
  "enforcement.takedown_resolved",
  "monetization.payment_received",
  "auth.login",
  "auth.logout",
  "auth.signup",
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];
