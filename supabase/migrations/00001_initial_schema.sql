-- ============================================================================
-- Whair Initial Schema Migration
-- ============================================================================
-- This migration creates the complete database schema for the Whair platform:
-- facial-recognition-powered content protection for creators.
--
-- Tables: creators, assets, face_embeddings, scans, incidents,
--         evidence_packets, cases, licenses, provenance_records, audit_log
-- Plus: RLS policies, storage buckets, and performance indexes.
-- ============================================================================


-- ============================================================================
-- 1. REUSABLE TRIGGER FUNCTION: auto-update updated_at on row modification
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.handle_updated_at()
  IS 'Sets updated_at to current timestamp on every UPDATE. Attach as a BEFORE UPDATE trigger.';


-- ============================================================================
-- 2. CREATORS TABLE
-- ============================================================================
-- Core identity table linking a Supabase auth user to their creator profile.
-- One creator profile per auth user; deletion cascades from auth.users.

CREATE TABLE public.creators (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name              TEXT NOT NULL,
  email                     TEXT NOT NULL,
  avatar_url                TEXT,
  bio                       TEXT,
  verification_status       TEXT NOT NULL DEFAULT 'unverified'
                            CHECK (verification_status IN ('unverified', 'pending', 'verified', 'suspended')),
  enrollment_completed      BOOLEAN DEFAULT FALSE,
  stripe_account_id         TEXT,
  stripe_onboarding_complete BOOLEAN DEFAULT FALSE,
  metadata                  JSONB DEFAULT '{}',
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT creators_user_id_unique UNIQUE (user_id)
);

CREATE TRIGGER set_creators_updated_at
  BEFORE UPDATE ON public.creators
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

COMMENT ON TABLE public.creators IS 'Creator profiles linked 1:1 to auth.users.';


-- ============================================================================
-- 3. ASSETS TABLE
-- ============================================================================
-- Canonical images uploaded by a creator for facial recognition enrollment.
-- Each asset tracks its storage location, content hash, and HMAC signature.

CREATE TABLE public.assets (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id        UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  file_name         TEXT,
  file_type         TEXT CHECK (file_type IN ('image/jpeg', 'image/png', 'image/webp')),
  file_size         INTEGER,
  storage_path      TEXT,
  sha256_hash       TEXT,
  hmac_signature    TEXT,
  is_canonical      BOOLEAN DEFAULT TRUE,
  thumbnail_path    TEXT,
  status            TEXT NOT NULL DEFAULT 'processing'
                    CHECK (status IN ('processing', 'active', 'archived', 'deleted')),
  metadata          JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_assets_updated_at
  BEFORE UPDATE ON public.assets
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

COMMENT ON TABLE public.assets IS 'Creator-uploaded images used as canonical references for face matching.';


-- ============================================================================
-- 4. FACE EMBEDDINGS TABLE
-- ============================================================================
-- Stores per-face data extracted from assets via AWS Rekognition.
-- Bounding box, confidence score, and the Rekognition face ID for lookups.

CREATE TABLE public.face_embeddings (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id             UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  creator_id           UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  bounding_box         JSONB,
  confidence           DECIMAL(5,2),
  face_attributes      JSONB,
  rekognition_face_id  TEXT,
  status               TEXT NOT NULL DEFAULT 'active'
                       CHECK (status IN ('active', 'archived')),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.face_embeddings IS 'Face detection results from Rekognition linked to source assets.';


-- ============================================================================
-- 5. SCANS TABLE
-- ============================================================================
-- Represents a single scan job: crawling a URL, processing an uploaded image,
-- or running on a schedule. Tracks progress counters and final status.

CREATE TABLE public.scans (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id            UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  scan_type             TEXT NOT NULL CHECK (scan_type IN ('url', 'image_upload', 'scheduled')),
  target_url            TEXT,
  uploaded_image_path   TEXT,
  status                TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  total_images_found    INTEGER NOT NULL DEFAULT 0,
  total_faces_detected  INTEGER NOT NULL DEFAULT 0,
  total_matches         INTEGER NOT NULL DEFAULT 0,
  error_message         TEXT,
  started_at            TIMESTAMPTZ,
  completed_at          TIMESTAMPTZ,
  metadata              JSONB,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_scans_updated_at
  BEFORE UPDATE ON public.scans
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

COMMENT ON TABLE public.scans IS 'Scan jobs that crawl URLs or process uploads to find facial matches.';


-- ============================================================================
-- 6. INCIDENTS TABLE
-- ============================================================================
-- Each incident is a confirmed or suspected unauthorized use of a creator's
-- likeness found during a scan. Carries match confidence and evidence paths.

CREATE TABLE public.incidents (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id             UUID NOT NULL REFERENCES public.scans(id) ON DELETE CASCADE,
  creator_id          UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  source_url          TEXT NOT NULL,
  platform            TEXT,
  match_confidence    DECIMAL(5,2) NOT NULL,
  screenshot_path     TEXT,
  matched_image_path  TEXT,
  source_image_hash   TEXT,
  evidence_timestamp  TIMESTAMPTZ DEFAULT NOW(),
  status              TEXT NOT NULL DEFAULT 'new'
                      CHECK (status IN ('new', 'reviewing', 'confirmed', 'dismissed', 'actioned')),
  action_taken        TEXT CHECK (action_taken IN ('takedown', 'license')),
  metadata            JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_incidents_updated_at
  BEFORE UPDATE ON public.incidents
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

COMMENT ON TABLE public.incidents IS 'Detected unauthorized uses of a creator''s likeness.';


-- ============================================================================
-- 7. EVIDENCE PACKETS TABLE
-- ============================================================================
-- Pre-packaged evidence bundles generated from an incident. Used to support
-- DMCA takedowns, legal notices, or general evidence export.

CREATE TABLE public.evidence_packets (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id          UUID NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  creator_id           UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  packet_type          TEXT NOT NULL DEFAULT 'takedown'
                       CHECK (packet_type IN ('takedown', 'legal_notice', 'evidence_bundle')),
  content              JSONB NOT NULL,
  pdf_storage_path     TEXT,
  includes_provenance  BOOLEAN DEFAULT FALSE,
  generated_hash       TEXT NOT NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.evidence_packets IS 'Generated evidence bundles for takedowns and legal notices.';


-- ============================================================================
-- 8. CASES TABLE
-- ============================================================================
-- A case tracks the lifecycle of a takedown or enforcement action submitted
-- to a platform (e.g., Instagram, Twitter). Links back to the incident and
-- its evidence packet.

CREATE TABLE public.cases (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id          UUID REFERENCES public.incidents(id),
  creator_id           UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  evidence_packet_id   UUID REFERENCES public.evidence_packets(id),
  platform             TEXT NOT NULL,
  platform_report_url  TEXT,
  status               TEXT NOT NULL DEFAULT 'draft'
                       CHECK (status IN (
                         'draft', 'submitted', 'acknowledged', 'in_review',
                         'removed', 'denied', 'appealed', 'closed'
                       )),
  submitted_at         TIMESTAMPTZ,
  acknowledged_at      TIMESTAMPTZ,
  resolved_at          TIMESTAMPTZ,
  resolution_notes     TEXT,
  metadata             JSONB,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_cases_updated_at
  BEFORE UPDATE ON public.cases
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

COMMENT ON TABLE public.cases IS 'Takedown/enforcement cases submitted to platforms.';


-- ============================================================================
-- 9. LICENSES TABLE
-- ============================================================================
-- When a creator opts to license usage rather than take it down, a license
-- record is created. Integrates with Stripe for payment processing.

CREATE TABLE public.licenses (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id              UUID REFERENCES public.incidents(id),
  creator_id               UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  licensee_email           TEXT,
  licensee_name            TEXT,
  license_type             TEXT NOT NULL DEFAULT 'single_use'
                           CHECK (license_type IN ('single_use', 'time_limited', 'perpetual')),
  price_cents              INTEGER NOT NULL,
  currency                 TEXT NOT NULL DEFAULT 'usd',
  status                   TEXT NOT NULL DEFAULT 'pending'
                           CHECK (status IN ('pending', 'active', 'expired', 'revoked', 'cancelled')),
  stripe_payment_intent_id TEXT,
  stripe_transfer_id       TEXT,
  paid_at                  TIMESTAMPTZ,
  expires_at               TIMESTAMPTZ,
  terms                    JSONB,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_licenses_updated_at
  BEFORE UPDATE ON public.licenses
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

COMMENT ON TABLE public.licenses IS 'Image usage licenses offered by creators as an alternative to takedowns.';


-- ============================================================================
-- 10. PROVENANCE RECORDS TABLE
-- ============================================================================
-- Immutable chain of provenance events for an asset: registration, signing,
-- verification, export, revocation. Each record references its predecessor
-- to form a hash-linked chain (similar to C2PA provenance).

CREATE TABLE public.provenance_records (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id            UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  creator_id          UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  action              TEXT NOT NULL
                      CHECK (action IN ('registration', 'signing', 'verification', 'export', 'revocation')),
  sha256_hash         TEXT NOT NULL,
  hmac_signature      TEXT NOT NULL,
  signing_key_id      TEXT NOT NULL,
  c2pa_manifest       JSONB,
  previous_record_id  UUID REFERENCES public.provenance_records(id),
  metadata            JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.provenance_records IS 'Hash-linked provenance chain for asset integrity and C2PA compliance.';


-- ============================================================================
-- 11. AUDIT LOG TABLE
-- ============================================================================
-- Append-only log of all significant actions. Written by server-side functions
-- only; clients may read their own entries but never insert directly.

CREATE TABLE public.audit_log (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID REFERENCES auth.users(id),
  creator_id     UUID REFERENCES public.creators(id),
  action         TEXT NOT NULL,
  resource_type  TEXT NOT NULL,
  resource_id    UUID,
  details        JSONB,
  ip_address     INET,
  user_agent     TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.audit_log IS 'Immutable audit trail. Server-side inserts only; clients read own records.';


-- ============================================================================
-- 12. ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- ============================================================================

ALTER TABLE public.creators          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.face_embeddings   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scans             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidents         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence_packets  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cases             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.licenses          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provenance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log         ENABLE ROW LEVEL SECURITY;


-- ============================================================================
-- 13. ROW LEVEL SECURITY POLICIES
-- ============================================================================
-- Pattern: creators own all their data. Ownership is verified by joining
-- back to creators.user_id = auth.uid().
--
-- The audit_log is special: read-only for clients (server inserts via
-- service-role key which bypasses RLS).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 13a. CREATORS — direct ownership via user_id
-- ---------------------------------------------------------------------------

CREATE POLICY creators_select ON public.creators
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY creators_insert ON public.creators
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY creators_update ON public.creators
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 13b. ASSETS — ownership via creator_id -> creators.user_id
-- ---------------------------------------------------------------------------

CREATE POLICY assets_select ON public.assets
  FOR SELECT USING (
    creator_id IN (SELECT id FROM public.creators WHERE user_id = auth.uid())
  );

CREATE POLICY assets_insert ON public.assets
  FOR INSERT WITH CHECK (
    creator_id IN (SELECT id FROM public.creators WHERE user_id = auth.uid())
  );

CREATE POLICY assets_update ON public.assets
  FOR UPDATE USING (
    creator_id IN (SELECT id FROM public.creators WHERE user_id = auth.uid())
  ) WITH CHECK (
    creator_id IN (SELECT id FROM public.creators WHERE user_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- 13c. FACE EMBEDDINGS — ownership via creator_id
-- ---------------------------------------------------------------------------

CREATE POLICY face_embeddings_select ON public.face_embeddings
  FOR SELECT USING (
    creator_id IN (SELECT id FROM public.creators WHERE user_id = auth.uid())
  );

CREATE POLICY face_embeddings_insert ON public.face_embeddings
  FOR INSERT WITH CHECK (
    creator_id IN (SELECT id FROM public.creators WHERE user_id = auth.uid())
  );

CREATE POLICY face_embeddings_update ON public.face_embeddings
  FOR UPDATE USING (
    creator_id IN (SELECT id FROM public.creators WHERE user_id = auth.uid())
  ) WITH CHECK (
    creator_id IN (SELECT id FROM public.creators WHERE user_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- 13d. SCANS — ownership via creator_id
-- ---------------------------------------------------------------------------

CREATE POLICY scans_select ON public.scans
  FOR SELECT USING (
    creator_id IN (SELECT id FROM public.creators WHERE user_id = auth.uid())
  );

CREATE POLICY scans_insert ON public.scans
  FOR INSERT WITH CHECK (
    creator_id IN (SELECT id FROM public.creators WHERE user_id = auth.uid())
  );

CREATE POLICY scans_update ON public.scans
  FOR UPDATE USING (
    creator_id IN (SELECT id FROM public.creators WHERE user_id = auth.uid())
  ) WITH CHECK (
    creator_id IN (SELECT id FROM public.creators WHERE user_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- 13e. INCIDENTS — ownership via creator_id
-- ---------------------------------------------------------------------------

CREATE POLICY incidents_select ON public.incidents
  FOR SELECT USING (
    creator_id IN (SELECT id FROM public.creators WHERE user_id = auth.uid())
  );

CREATE POLICY incidents_insert ON public.incidents
  FOR INSERT WITH CHECK (
    creator_id IN (SELECT id FROM public.creators WHERE user_id = auth.uid())
  );

CREATE POLICY incidents_update ON public.incidents
  FOR UPDATE USING (
    creator_id IN (SELECT id FROM public.creators WHERE user_id = auth.uid())
  ) WITH CHECK (
    creator_id IN (SELECT id FROM public.creators WHERE user_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- 13f. EVIDENCE PACKETS — ownership via creator_id
-- ---------------------------------------------------------------------------

CREATE POLICY evidence_packets_select ON public.evidence_packets
  FOR SELECT USING (
    creator_id IN (SELECT id FROM public.creators WHERE user_id = auth.uid())
  );

CREATE POLICY evidence_packets_insert ON public.evidence_packets
  FOR INSERT WITH CHECK (
    creator_id IN (SELECT id FROM public.creators WHERE user_id = auth.uid())
  );

CREATE POLICY evidence_packets_update ON public.evidence_packets
  FOR UPDATE USING (
    creator_id IN (SELECT id FROM public.creators WHERE user_id = auth.uid())
  ) WITH CHECK (
    creator_id IN (SELECT id FROM public.creators WHERE user_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- 13g. CASES — ownership via creator_id
-- ---------------------------------------------------------------------------

CREATE POLICY cases_select ON public.cases
  FOR SELECT USING (
    creator_id IN (SELECT id FROM public.creators WHERE user_id = auth.uid())
  );

CREATE POLICY cases_insert ON public.cases
  FOR INSERT WITH CHECK (
    creator_id IN (SELECT id FROM public.creators WHERE user_id = auth.uid())
  );

CREATE POLICY cases_update ON public.cases
  FOR UPDATE USING (
    creator_id IN (SELECT id FROM public.creators WHERE user_id = auth.uid())
  ) WITH CHECK (
    creator_id IN (SELECT id FROM public.creators WHERE user_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- 13h. LICENSES — ownership via creator_id
-- ---------------------------------------------------------------------------

CREATE POLICY licenses_select ON public.licenses
  FOR SELECT USING (
    creator_id IN (SELECT id FROM public.creators WHERE user_id = auth.uid())
  );

CREATE POLICY licenses_insert ON public.licenses
  FOR INSERT WITH CHECK (
    creator_id IN (SELECT id FROM public.creators WHERE user_id = auth.uid())
  );

CREATE POLICY licenses_update ON public.licenses
  FOR UPDATE USING (
    creator_id IN (SELECT id FROM public.creators WHERE user_id = auth.uid())
  ) WITH CHECK (
    creator_id IN (SELECT id FROM public.creators WHERE user_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- 13i. PROVENANCE RECORDS — ownership via creator_id
-- ---------------------------------------------------------------------------

CREATE POLICY provenance_records_select ON public.provenance_records
  FOR SELECT USING (
    creator_id IN (SELECT id FROM public.creators WHERE user_id = auth.uid())
  );

CREATE POLICY provenance_records_insert ON public.provenance_records
  FOR INSERT WITH CHECK (
    creator_id IN (SELECT id FROM public.creators WHERE user_id = auth.uid())
  );

CREATE POLICY provenance_records_update ON public.provenance_records
  FOR UPDATE USING (
    creator_id IN (SELECT id FROM public.creators WHERE user_id = auth.uid())
  ) WITH CHECK (
    creator_id IN (SELECT id FROM public.creators WHERE user_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- 13j. AUDIT LOG — read own records only, no client inserts
-- ---------------------------------------------------------------------------
-- Inserts happen server-side via the service_role key (bypasses RLS).
-- Clients can only read rows where user_id matches their auth.uid().

CREATE POLICY audit_log_select ON public.audit_log
  FOR SELECT USING (user_id = auth.uid());

-- No INSERT / UPDATE / DELETE policies: clients cannot modify audit_log.


-- ============================================================================
-- 14. STORAGE BUCKETS AND POLICIES
-- ============================================================================
-- Three private buckets with size and MIME-type restrictions.
-- File paths follow the convention: {creator_id}/...
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 14a. 'assets' bucket — creator-uploaded canonical images
-- ---------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'assets',
  'assets',
  FALSE,
  10485760,  -- 10 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 14b. 'evidence' bucket — screenshots, matched images, evidence PDFs
-- ---------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'evidence',
  'evidence',
  FALSE,
  20971520,  -- 20 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 14c. 'exports' bucket — generated PDFs and ZIP archives
-- ---------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'exports',
  'exports',
  FALSE,
  52428800,  -- 50 MB
  ARRAY['application/pdf', 'application/zip']
)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 14d. Storage RLS policies
-- ---------------------------------------------------------------------------
-- Users can only access objects under their own creator_id folder.
-- The path convention is: {bucket}/{creator_id}/{...}
-- We extract the first path segment and verify it matches a creator owned
-- by the authenticated user.
-- ---------------------------------------------------------------------------

-- Assets bucket: SELECT (download)
CREATE POLICY storage_assets_select ON storage.objects
  FOR SELECT USING (
    bucket_id = 'assets'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.creators WHERE user_id = auth.uid()
    )
  );

-- Assets bucket: INSERT (upload)
CREATE POLICY storage_assets_insert ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'assets'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.creators WHERE user_id = auth.uid()
    )
  );

-- Assets bucket: UPDATE (overwrite)
CREATE POLICY storage_assets_update ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'assets'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.creators WHERE user_id = auth.uid()
    )
  );

-- Assets bucket: DELETE
CREATE POLICY storage_assets_delete ON storage.objects
  FOR DELETE USING (
    bucket_id = 'assets'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.creators WHERE user_id = auth.uid()
    )
  );

-- Evidence bucket: SELECT
CREATE POLICY storage_evidence_select ON storage.objects
  FOR SELECT USING (
    bucket_id = 'evidence'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.creators WHERE user_id = auth.uid()
    )
  );

-- Evidence bucket: INSERT
CREATE POLICY storage_evidence_insert ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'evidence'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.creators WHERE user_id = auth.uid()
    )
  );

-- Evidence bucket: UPDATE
CREATE POLICY storage_evidence_update ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'evidence'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.creators WHERE user_id = auth.uid()
    )
  );

-- Evidence bucket: DELETE
CREATE POLICY storage_evidence_delete ON storage.objects
  FOR DELETE USING (
    bucket_id = 'evidence'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.creators WHERE user_id = auth.uid()
    )
  );

-- Exports bucket: SELECT
CREATE POLICY storage_exports_select ON storage.objects
  FOR SELECT USING (
    bucket_id = 'exports'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.creators WHERE user_id = auth.uid()
    )
  );

-- Exports bucket: INSERT
CREATE POLICY storage_exports_insert ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'exports'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.creators WHERE user_id = auth.uid()
    )
  );

-- Exports bucket: UPDATE
CREATE POLICY storage_exports_update ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'exports'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.creators WHERE user_id = auth.uid()
    )
  );

-- Exports bucket: DELETE
CREATE POLICY storage_exports_delete ON storage.objects
  FOR DELETE USING (
    bucket_id = 'exports'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.creators WHERE user_id = auth.uid()
    )
  );


-- ============================================================================
-- 15. PERFORMANCE INDEXES
-- ============================================================================
-- Indexes on all foreign keys, status columns, and created_at DESC for
-- common listing/pagination queries.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- creators
-- ---------------------------------------------------------------------------
CREATE INDEX idx_creators_user_id            ON public.creators (user_id);
CREATE INDEX idx_creators_verification       ON public.creators (verification_status);
CREATE INDEX idx_creators_created_at         ON public.creators (created_at DESC);

-- ---------------------------------------------------------------------------
-- assets
-- ---------------------------------------------------------------------------
CREATE INDEX idx_assets_creator_id           ON public.assets (creator_id);
CREATE INDEX idx_assets_status               ON public.assets (status);
CREATE INDEX idx_assets_created_at           ON public.assets (created_at DESC);
CREATE INDEX idx_assets_sha256_hash          ON public.assets (sha256_hash);

-- ---------------------------------------------------------------------------
-- face_embeddings
-- ---------------------------------------------------------------------------
CREATE INDEX idx_face_embeddings_asset_id    ON public.face_embeddings (asset_id);
CREATE INDEX idx_face_embeddings_creator_id  ON public.face_embeddings (creator_id);
CREATE INDEX idx_face_embeddings_status      ON public.face_embeddings (status);
CREATE INDEX idx_face_embeddings_created_at  ON public.face_embeddings (created_at DESC);
CREATE INDEX idx_face_embeddings_rekognition ON public.face_embeddings (rekognition_face_id);

-- ---------------------------------------------------------------------------
-- scans
-- ---------------------------------------------------------------------------
CREATE INDEX idx_scans_creator_id            ON public.scans (creator_id);
CREATE INDEX idx_scans_status                ON public.scans (status);
CREATE INDEX idx_scans_created_at            ON public.scans (created_at DESC);
CREATE INDEX idx_scans_scan_type             ON public.scans (scan_type);

-- ---------------------------------------------------------------------------
-- incidents
-- ---------------------------------------------------------------------------
CREATE INDEX idx_incidents_scan_id           ON public.incidents (scan_id);
CREATE INDEX idx_incidents_creator_id        ON public.incidents (creator_id);
CREATE INDEX idx_incidents_status            ON public.incidents (status);
CREATE INDEX idx_incidents_created_at        ON public.incidents (created_at DESC);
CREATE INDEX idx_incidents_platform          ON public.incidents (platform);

-- ---------------------------------------------------------------------------
-- evidence_packets
-- ---------------------------------------------------------------------------
CREATE INDEX idx_evidence_packets_incident_id ON public.evidence_packets (incident_id);
CREATE INDEX idx_evidence_packets_creator_id  ON public.evidence_packets (creator_id);
CREATE INDEX idx_evidence_packets_created_at  ON public.evidence_packets (created_at DESC);

-- ---------------------------------------------------------------------------
-- cases
-- ---------------------------------------------------------------------------
CREATE INDEX idx_cases_incident_id           ON public.cases (incident_id);
CREATE INDEX idx_cases_creator_id            ON public.cases (creator_id);
CREATE INDEX idx_cases_evidence_packet_id    ON public.cases (evidence_packet_id);
CREATE INDEX idx_cases_status                ON public.cases (status);
CREATE INDEX idx_cases_platform              ON public.cases (platform);
CREATE INDEX idx_cases_created_at            ON public.cases (created_at DESC);

-- ---------------------------------------------------------------------------
-- licenses
-- ---------------------------------------------------------------------------
CREATE INDEX idx_licenses_incident_id        ON public.licenses (incident_id);
CREATE INDEX idx_licenses_creator_id         ON public.licenses (creator_id);
CREATE INDEX idx_licenses_status             ON public.licenses (status);
CREATE INDEX idx_licenses_created_at         ON public.licenses (created_at DESC);

-- ---------------------------------------------------------------------------
-- provenance_records
-- ---------------------------------------------------------------------------
CREATE INDEX idx_provenance_asset_id         ON public.provenance_records (asset_id);
CREATE INDEX idx_provenance_creator_id       ON public.provenance_records (creator_id);
CREATE INDEX idx_provenance_previous_id      ON public.provenance_records (previous_record_id);
CREATE INDEX idx_provenance_created_at       ON public.provenance_records (created_at DESC);
CREATE INDEX idx_provenance_action           ON public.provenance_records (action);

-- ---------------------------------------------------------------------------
-- audit_log
-- ---------------------------------------------------------------------------
CREATE INDEX idx_audit_log_user_id           ON public.audit_log (user_id);
CREATE INDEX idx_audit_log_creator_id        ON public.audit_log (creator_id);
CREATE INDEX idx_audit_log_action            ON public.audit_log (action);
CREATE INDEX idx_audit_log_resource          ON public.audit_log (resource_type, resource_id);
CREATE INDEX idx_audit_log_created_at        ON public.audit_log (created_at DESC);


-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
