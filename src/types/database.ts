/**
 * TypeScript types for all database tables.
 * Matches the Supabase/PostgreSQL schema exactly.
 */

/**
 * Creator profile — the registered user who owns digital likeness rights.
 * Table: creators
 */
export interface Creator {
  id: string; // UUID, primary key
  user_id: string; // UUID, references auth.users
  full_name: string; // TEXT
  display_name: string | null; // TEXT, nullable
  email: string; // TEXT
  avatar_url: string | null; // TEXT, nullable
  bio: string | null; // TEXT, nullable
  enrolled: boolean; // BOOLEAN, default false
  enrollment_date: Date | string | null; // TIMESTAMPTZ, nullable
  stripe_account_id: string | null; // TEXT, nullable (Stripe Connect)
  stripe_onboarding_complete: boolean; // BOOLEAN, default false
  metadata: Record<string, unknown> | null; // JSONB, nullable
  created_at: Date | string; // TIMESTAMPTZ, default now()
  updated_at: Date | string; // TIMESTAMPTZ, default now()
}

/**
 * Digital asset owned by a creator (images, videos, audio).
 * Table: assets
 */
export interface Asset {
  id: string; // UUID, primary key
  creator_id: string; // UUID, references creators
  type: "image" | "video" | "audio"; // TEXT, constrained
  filename: string; // TEXT
  original_filename: string; // TEXT
  mime_type: string; // TEXT
  file_size: number; // INTEGER, bytes
  storage_path: string; // TEXT, Supabase Storage path
  storage_bucket: string; // TEXT
  width: number | null; // INTEGER, nullable (images/video)
  height: number | null; // INTEGER, nullable (images/video)
  duration: number | null; // DECIMAL, nullable (video/audio, seconds)
  hash_sha256: string | null; // TEXT, nullable
  c2pa_manifest: Record<string, unknown> | null; // JSONB, nullable
  is_reference: boolean; // BOOLEAN, default false (identity reference asset)
  metadata: Record<string, unknown> | null; // JSONB, nullable
  created_at: Date | string; // TIMESTAMPTZ, default now()
  updated_at: Date | string; // TIMESTAMPTZ, default now()
}

/**
 * Face embedding vector for facial recognition matching.
 * Table: face_embeddings
 */
export interface FaceEmbedding {
  id: string; // UUID, primary key
  creator_id: string; // UUID, references creators
  asset_id: string; // UUID, references assets
  embedding_vector: number[]; // FLOAT8[] or VECTOR
  bounding_box: Record<string, unknown> | null; // JSONB, nullable {x, y, width, height}
  confidence: number; // DECIMAL, 0-100
  provider: string; // TEXT, e.g. "aws_rekognition"
  external_face_id: string | null; // TEXT, nullable (provider's face ID)
  external_collection_id: string | null; // TEXT, nullable (provider's collection ID)
  metadata: Record<string, unknown> | null; // JSONB, nullable
  created_at: Date | string; // TIMESTAMPTZ, default now()
}

/**
 * A scan job — either URL-based or image upload-based detection.
 * Table: scans
 */
export interface Scan {
  id: string; // UUID, primary key
  creator_id: string; // UUID, references creators
  type: "url" | "image_upload" | "scheduled"; // TEXT, constrained
  status: "pending" | "processing" | "completed" | "failed"; // TEXT, constrained
  target_url: string | null; // TEXT, nullable
  target_platform: string | null; // TEXT, nullable
  uploaded_image_path: string | null; // TEXT, nullable
  results_count: number; // INTEGER, default 0
  error_message: string | null; // TEXT, nullable
  started_at: Date | string | null; // TIMESTAMPTZ, nullable
  completed_at: Date | string | null; // TIMESTAMPTZ, nullable
  metadata: Record<string, unknown> | null; // JSONB, nullable
  created_at: Date | string; // TIMESTAMPTZ, default now()
  updated_at: Date | string; // TIMESTAMPTZ, default now()
}

/**
 * A detected incident of potential likeness misuse.
 * Table: incidents
 */
export interface Incident {
  id: string; // UUID, primary key
  creator_id: string; // UUID, references creators
  scan_id: string | null; // UUID, nullable, references scans
  platform: string; // TEXT
  source_url: string; // TEXT
  content_type: "image" | "video" | "audio" | "profile" | "other"; // TEXT
  match_confidence: number; // DECIMAL, 0-100
  status:
    | "detected"
    | "reviewing"
    | "confirmed"
    | "takedown_sent"
    | "takedown_acknowledged"
    | "removed"
    | "dismissed"
    | "licensed"; // TEXT
  screenshot_path: string | null; // TEXT, nullable
  screenshot_hash: string | null; // TEXT, nullable
  content_hash: string | null; // TEXT, nullable
  detected_at: Date | string; // TIMESTAMPTZ
  resolved_at: Date | string | null; // TIMESTAMPTZ, nullable
  resolution_notes: string | null; // TEXT, nullable
  metadata: Record<string, unknown> | null; // JSONB, nullable
  created_at: Date | string; // TIMESTAMPTZ, default now()
  updated_at: Date | string; // TIMESTAMPTZ, default now()
}

/**
 * An evidence packet for enforcement actions (takedowns, disputes).
 * Table: evidence_packets
 */
export interface EvidencePacket {
  id: string; // UUID, primary key
  incident_id: string; // UUID, references incidents
  creator_id: string; // UUID, references creators
  packet_type: "takedown" | "dispute" | "legal"; // TEXT
  content_urls: string[]; // TEXT[]
  screenshots: string[]; // TEXT[], storage paths
  content_hashes: string[]; // TEXT[], SHA-256 hashes
  timestamps: Record<string, unknown>; // JSONB, {detected_at, captured_at, etc.}
  statement_of_rights: string | null; // TEXT, nullable
  provenance_records: string[]; // TEXT[], references to provenance record IDs
  additional_evidence: Record<string, unknown> | null; // JSONB, nullable
  generated_at: Date | string; // TIMESTAMPTZ
  metadata: Record<string, unknown> | null; // JSONB, nullable
  created_at: Date | string; // TIMESTAMPTZ, default now()
}

/**
 * An enforcement case grouping related incidents.
 * Table: cases
 */
export interface Case {
  id: string; // UUID, primary key
  creator_id: string; // UUID, references creators
  title: string; // TEXT
  description: string | null; // TEXT, nullable
  status: "open" | "in_progress" | "pending_response" | "resolved" | "closed"; // TEXT
  priority: "low" | "medium" | "high" | "critical"; // TEXT
  platform: string | null; // TEXT, nullable
  incident_ids: string[]; // UUID[], references to incident IDs
  evidence_packet_id: string | null; // UUID, nullable, references evidence_packets
  assigned_to: string | null; // UUID, nullable
  takedown_url: string | null; // TEXT, nullable (platform report URL)
  takedown_reference: string | null; // TEXT, nullable (platform's reference/ticket ID)
  submitted_at: Date | string | null; // TIMESTAMPTZ, nullable
  responded_at: Date | string | null; // TIMESTAMPTZ, nullable
  resolved_at: Date | string | null; // TIMESTAMPTZ, nullable
  resolution_type: "removed" | "denied" | "expired" | "withdrawn" | null; // TEXT, nullable
  notes: string | null; // TEXT, nullable
  metadata: Record<string, unknown> | null; // JSONB, nullable
  created_at: Date | string; // TIMESTAMPTZ, default now()
  updated_at: Date | string; // TIMESTAMPTZ, default now()
}

/**
 * A licensing agreement for authorized use of a creator's likeness.
 * Table: licenses
 */
export interface License {
  id: string; // UUID, primary key
  creator_id: string; // UUID, references creators
  licensee_name: string; // TEXT
  licensee_email: string; // TEXT
  licensee_company: string | null; // TEXT, nullable
  asset_ids: string[]; // UUID[], references to asset IDs
  license_type: "exclusive" | "non_exclusive" | "limited"; // TEXT
  scope: string; // TEXT, description of allowed usage
  price_cents: number; // INTEGER, price in cents
  currency: string; // TEXT, default "usd"
  status: "pending" | "active" | "expired" | "revoked"; // TEXT
  stripe_payment_intent_id: string | null; // TEXT, nullable
  stripe_transfer_id: string | null; // TEXT, nullable
  starts_at: Date | string; // TIMESTAMPTZ
  expires_at: Date | string | null; // TIMESTAMPTZ, nullable
  revoked_at: Date | string | null; // TIMESTAMPTZ, nullable
  revocation_reason: string | null; // TEXT, nullable
  terms: Record<string, unknown> | null; // JSONB, nullable
  metadata: Record<string, unknown> | null; // JSONB, nullable
  created_at: Date | string; // TIMESTAMPTZ, default now()
  updated_at: Date | string; // TIMESTAMPTZ, default now()
}

/**
 * A provenance record proving content origin and integrity (C2PA).
 * Table: provenance_records
 */
export interface ProvenanceRecord {
  id: string; // UUID, primary key
  asset_id: string; // UUID, references assets
  creator_id: string; // UUID, references creators
  manifest_hash: string; // TEXT, hash of the C2PA manifest
  manifest_data: Record<string, unknown>; // JSONB, full C2PA manifest data
  signature: string; // TEXT, cryptographic signature
  signer_info: Record<string, unknown>; // JSONB, {name, org, cert_serial}
  claim_generator: string; // TEXT, e.g. "Whair/1.0.0-beta"
  assertions: Record<string, unknown>[]; // JSONB[], list of C2PA assertions
  is_valid: boolean; // BOOLEAN
  validation_errors: string[] | null; // TEXT[], nullable
  parent_record_id: string | null; // UUID, nullable (for derivative works)
  verified_at: Date | string; // TIMESTAMPTZ
  metadata: Record<string, unknown> | null; // JSONB, nullable
  created_at: Date | string; // TIMESTAMPTZ, default now()
}

/**
 * Audit log entry for tracking all significant actions.
 * Table: audit_log
 */
export interface AuditLog {
  id: string; // UUID, primary key
  user_id: string; // UUID, references auth.users
  creator_id: string | null; // UUID, nullable, references creators
  action: string; // TEXT, e.g. "identity.enroll"
  resource_type: string; // TEXT, e.g. "creator", "asset", "incident"
  resource_id: string | null; // UUID, nullable
  details: Record<string, unknown> | null; // JSONB, nullable
  ip_address: string | null; // TEXT, nullable
  user_agent: string | null; // TEXT, nullable
  created_at: Date | string; // TIMESTAMPTZ, default now()
}

/**
 * Insert types (omit auto-generated fields).
 */
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

/**
 * Update types (all fields optional except id).
 */
export type CreatorUpdate = Partial<Omit<Creator, "id" | "created_at">> & { id: string };
export type AssetUpdate = Partial<Omit<Asset, "id" | "created_at">> & { id: string };
export type ScanUpdate = Partial<Omit<Scan, "id" | "created_at">> & { id: string };
export type IncidentUpdate = Partial<Omit<Incident, "id" | "created_at">> & { id: string };
export type CaseUpdate = Partial<Omit<Case, "id" | "created_at">> & { id: string };
export type LicenseUpdate = Partial<Omit<License, "id" | "created_at">> & { id: string };
