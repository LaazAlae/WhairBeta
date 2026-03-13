/**
 * API request/response types for the Whair platform.
 */

import type {
  Asset,
  Case,
  Creator,
  Incident,
  License,
  ProvenanceRecord,
  Scan,
} from "./database";

// ---------------------------------------------------------------------------
// Generic API Types
// ---------------------------------------------------------------------------

/**
 * Standard API error shape returned in error responses.
 */
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Standard success response wrapper.
 */
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

/**
 * Standard error response wrapper.
 */
export interface ApiErrorResponse {
  success: false;
  error: ApiError;
}

/**
 * Paginated response with metadata.
 */
export interface PaginatedResponse<T> {
  success: true;
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

// ---------------------------------------------------------------------------
// Identity / Enrollment
// ---------------------------------------------------------------------------

/**
 * Request to enroll a creator's identity.
 */
export interface EnrollRequest {
  full_name: string;
  display_name?: string;
  email: string;
  bio?: string;
  /** Base64-encoded reference photos or storage paths */
  reference_photos: string[];
}

/**
 * Response after successful identity enrollment.
 */
export interface EnrollResponse {
  creator: Creator;
  assets: Asset[];
  face_count: number;
  enrollment_complete: boolean;
}

// ---------------------------------------------------------------------------
// Scanning / Detection
// ---------------------------------------------------------------------------

/**
 * Request to initiate a scan for likeness detection.
 * Either url OR image_upload should be provided, not both.
 */
export interface ScanRequest {
  /** URL to scan for likeness matches */
  url?: string;
  /** Base64-encoded image to scan */
  image_upload?: string;
  /** Target platform hint (youtube, instagram, tiktok, x) */
  platform?: string;
}

/**
 * Response after a scan is initiated or completed.
 */
export interface ScanResponse {
  scan: Scan;
  incidents: Incident[];
  total_matches: number;
}

// ---------------------------------------------------------------------------
// Verification / Content Signing
// ---------------------------------------------------------------------------

/**
 * Request to sign an asset with C2PA provenance metadata.
 */
export interface SignAssetRequest {
  /** The asset ID to sign */
  asset_id: string;
  /** Optional assertions to include in the C2PA manifest */
  assertions?: Record<string, unknown>[];
  /** Optional custom claim generator identifier */
  claim_generator?: string;
}

/**
 * Response after signing an asset.
 */
export interface SignAssetResponse {
  asset: Asset;
  provenance_record: ProvenanceRecord;
  signed_file_url: string;
}

/**
 * Response from verifying a file's provenance.
 */
export interface VerifyFileResponse {
  is_verified: boolean;
  has_provenance: boolean;
  provenance_record: ProvenanceRecord | null;
  validation_errors: string[];
  signer_info: Record<string, unknown> | null;
  asset_match: Asset | null;
}

// ---------------------------------------------------------------------------
// Enforcement / Cases
// ---------------------------------------------------------------------------

/**
 * Request to create an enforcement case.
 */
export interface CreateCaseRequest {
  title: string;
  description?: string;
  platform?: string;
  priority?: "low" | "medium" | "high" | "critical";
  incident_ids: string[];
}

/**
 * Response after creating an enforcement case.
 */
export interface CreateCaseResponse {
  case: Case;
  incidents: Incident[];
  evidence_packet_id: string | null;
}

// ---------------------------------------------------------------------------
// Monetization / Licensing
// ---------------------------------------------------------------------------

/**
 * Request to create a licensing agreement.
 */
export interface CreateLicenseRequest {
  licensee_name: string;
  licensee_email: string;
  licensee_company?: string;
  asset_ids: string[];
  license_type: "exclusive" | "non_exclusive" | "limited";
  scope: string;
  price_cents: number;
  currency?: string;
  starts_at: string; // ISO 8601
  expires_at?: string; // ISO 8601
  terms?: Record<string, unknown>;
}

/**
 * Response after creating a license.
 */
export interface CreateLicenseResponse {
  license: License;
  stripe_checkout_url: string | null;
}

// ---------------------------------------------------------------------------
// Pagination Request Params
// ---------------------------------------------------------------------------

/**
 * Pagination query parameters.
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
}

// ---------------------------------------------------------------------------
// File Upload
// ---------------------------------------------------------------------------

/**
 * Validated file metadata before upload.
 */
export interface FileUploadMeta {
  filename: string;
  mime_type: string;
  file_size: number;
  type: "image" | "video" | "audio";
}
