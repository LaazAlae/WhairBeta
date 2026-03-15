/**
 * TypeScript types for all database tables.
 * Matches the Supabase/PostgreSQL schema from migrations 00001 + 00002.
 */

// ─── Migration 001 Tables ───────────────────────────────────────────

/**
 * Creator profile — linked 1:1 to auth.users.
 * Table: creators
 */
export interface Creator {
  id: string;
  user_id: string;
  display_name: string;
  email: string;
  avatar_url: string | null;
  bio: string | null;
  verification_status: "unverified" | "pending" | "verified" | "suspended";
  enrollment_completed: boolean;
  stripe_account_id: string | null;
  stripe_onboarding_complete: boolean;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

/**
 * Creator-uploaded canonical image for face matching.
 * Table: assets
 */
export interface Asset {
  id: string;
  creator_id: string;
  file_name: string | null;
  file_type: "image/jpeg" | "image/png" | "image/webp" | null;
  file_size: number | null;
  storage_path: string | null;
  sha256_hash: string | null;
  hmac_signature: string | null;
  is_canonical: boolean;
  thumbnail_path: string | null;
  status: "processing" | "active" | "archived" | "deleted";
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

/**
 * Face detection results from Rekognition.
 * Table: face_embeddings
 */
export interface FaceEmbedding {
  id: string;
  asset_id: string;
  creator_id: string;
  bounding_box: Record<string, unknown> | null;
  confidence: number | null;
  face_attributes: Record<string, unknown> | null;
  rekognition_face_id: string | null;
  status: "active" | "archived";
  created_at: string;
}

/**
 * A scan job (URL crawl, image upload, scheduled, or web detection).
 * Table: scans
 */
export interface Scan {
  id: string;
  creator_id: string;
  scan_type: "url" | "image_upload" | "scheduled" | "web_detection";
  target_url: string | null;
  uploaded_image_path: string | null;
  status: "pending" | "processing" | "completed" | "failed" | "cancelled";
  total_images_found: number;
  total_faces_detected: number;
  total_matches: number;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  monitoring_schedule_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

/**
 * Detected unauthorized use of a creator's likeness.
 * Table: incidents
 */
export interface Incident {
  id: string;
  scan_id: string;
  creator_id: string;
  source_url: string;
  platform: string | null;
  match_confidence: number;
  screenshot_path: string | null;
  matched_image_path: string | null;
  source_image_hash: string | null;
  evidence_timestamp: string | null;
  status: "new" | "reviewing" | "confirmed" | "dismissed" | "actioned";
  action_taken: "takedown" | "license" | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

/**
 * Pre-packaged evidence bundle for takedowns.
 * Table: evidence_packets
 */
export interface EvidencePacket {
  id: string;
  incident_id: string;
  creator_id: string;
  packet_type: "takedown" | "legal_notice" | "evidence_bundle";
  content: Record<string, unknown>;
  pdf_storage_path: string | null;
  includes_provenance: boolean;
  generated_hash: string;
  created_at: string;
}

/**
 * Enforcement case submitted to a platform.
 * Table: cases
 */
export interface Case {
  id: string;
  incident_id: string | null;
  creator_id: string;
  evidence_packet_id: string | null;
  platform: string;
  platform_report_url: string | null;
  status:
    | "draft"
    | "submitted"
    | "acknowledged"
    | "in_review"
    | "removed"
    | "denied"
    | "appealed"
    | "closed";
  submitted_at: string | null;
  acknowledged_at: string | null;
  resolved_at: string | null;
  resolution_notes: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

/**
 * Image usage license offered by a creator.
 * Table: licenses
 */
export interface License {
  id: string;
  incident_id: string | null;
  creator_id: string;
  licensee_email: string | null;
  licensee_name: string | null;
  license_type: "single_use" | "time_limited" | "perpetual";
  price_cents: number;
  currency: string;
  status: "pending" | "active" | "expired" | "revoked" | "cancelled";
  stripe_payment_intent_id: string | null;
  stripe_transfer_id: string | null;
  paid_at: string | null;
  expires_at: string | null;
  terms: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

/**
 * Provenance record forming a hash-linked chain.
 * Table: provenance_records
 */
export interface ProvenanceRecord {
  id: string;
  asset_id: string;
  creator_id: string;
  action: "registration" | "signing" | "verification" | "export" | "revocation";
  sha256_hash: string;
  hmac_signature: string;
  signing_key_id: string;
  c2pa_manifest: Record<string, unknown> | null;
  previous_record_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

/**
 * Audit log entry (append-only, server-side inserts only).
 * Table: audit_log
 */
export interface AuditLog {
  id: string;
  user_id: string | null;
  creator_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

// ─── Migration 002 Tables ───────────────────────────────────────────

/**
 * Scheduled monitoring scan configuration.
 * Table: monitoring_schedules
 */
export interface MonitoringSchedule {
  id: string;
  creator_id: string;
  name: string;
  target_type: "url" | "platform" | "keyword";
  target_value: string;
  frequency: "hourly" | "daily" | "weekly";
  is_active: boolean;
  last_run_at: string | null;
  next_run_at: string | null;
  last_run_status: "success" | "failed" | "no_matches" | "matches_found" | null;
  last_run_matches: number;
  total_runs: number;
  total_matches: number;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

/**
 * Whitelisted source that should not trigger incidents.
 * Table: authorized_sources
 */
export interface AuthorizedSource {
  id: string;
  creator_id: string;
  source_type: "url" | "domain" | "account" | "platform";
  source_value: string;
  label: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Voice sample for audio likeness detection.
 * Table: voice_prints
 */
export interface VoicePrint {
  id: string;
  creator_id: string;
  asset_id: string | null;
  sample_name: string;
  duration_seconds: number | null;
  storage_path: string;
  storage_bucket: string;
  sha256_hash: string | null;
  fingerprint_data: Record<string, unknown> | null;
  status: "processing" | "ready" | "failed" | "archived";
  error_message: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

// ─── Insert Types ───────────────────────────────────────────────────

export type CreatorInsert = Omit<Creator, "id" | "created_at" | "updated_at">;
export type AssetInsert = Omit<Asset, "id" | "created_at" | "updated_at">;
export type FaceEmbeddingInsert = Omit<FaceEmbedding, "id" | "created_at">;
export type ScanInsert = Omit<Scan, "id" | "created_at" | "updated_at">;
export type IncidentInsert = Omit<Incident, "id" | "created_at" | "updated_at">;
export type EvidencePacketInsert = Omit<EvidencePacket, "id" | "created_at">;
export type CaseInsert = Omit<Case, "id" | "created_at" | "updated_at">;
export type LicenseInsert = Omit<License, "id" | "created_at" | "updated_at">;
export type ProvenanceRecordInsert = Omit<ProvenanceRecord, "id" | "created_at">;
export type AuditLogInsert = Omit<AuditLog, "id" | "created_at">;
export type MonitoringScheduleInsert = Omit<MonitoringSchedule, "id" | "created_at" | "updated_at">;
export type AuthorizedSourceInsert = Omit<AuthorizedSource, "id" | "created_at" | "updated_at">;
export type VoicePrintInsert = Omit<VoicePrint, "id" | "created_at" | "updated_at">;

// ─── Update Types ───────────────────────────────────────────────────

export type CreatorUpdate = Partial<Omit<Creator, "id" | "created_at">> & { id: string };
export type AssetUpdate = Partial<Omit<Asset, "id" | "created_at">> & { id: string };
export type ScanUpdate = Partial<Omit<Scan, "id" | "created_at">> & { id: string };
export type IncidentUpdate = Partial<Omit<Incident, "id" | "created_at">> & { id: string };
export type CaseUpdate = Partial<Omit<Case, "id" | "created_at">> & { id: string };
export type LicenseUpdate = Partial<Omit<License, "id" | "created_at">> & { id: string };
