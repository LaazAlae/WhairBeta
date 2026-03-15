-- ============================================================================
-- Whair Migration 002: Monitoring Schedules, Whitelist, Voice Prints
-- ============================================================================
-- Adds tables for:
--   1. monitoring_schedules — automated recurring scans
--   2. authorized_sources — whitelist of known-good URLs/accounts
--   3. voice_prints — voice enrollment for audio detection
-- ============================================================================


-- ============================================================================
-- 1. MONITORING SCHEDULES TABLE
-- ============================================================================
-- Allows creators to set up automated, recurring scans of specific URLs
-- or platforms. The system runs these on a cron-like schedule.

CREATE TABLE public.monitoring_schedules (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id        UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  target_type       TEXT NOT NULL CHECK (target_type IN ('url', 'platform', 'keyword')),
  target_value      TEXT NOT NULL,             -- URL, platform name, or search keyword
  frequency         TEXT NOT NULL DEFAULT 'daily'
                    CHECK (frequency IN ('hourly', 'daily', 'weekly')),
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  last_run_at       TIMESTAMPTZ,
  next_run_at       TIMESTAMPTZ,
  last_run_status   TEXT CHECK (last_run_status IN ('success', 'failed', 'no_matches', 'matches_found')),
  last_run_matches  INTEGER DEFAULT 0,
  total_runs        INTEGER DEFAULT 0,
  total_matches     INTEGER DEFAULT 0,
  metadata          JSONB DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_monitoring_schedules_updated_at
  BEFORE UPDATE ON public.monitoring_schedules
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Indexes
CREATE INDEX idx_monitoring_schedules_creator ON public.monitoring_schedules(creator_id);
CREATE INDEX idx_monitoring_schedules_next_run ON public.monitoring_schedules(next_run_at)
  WHERE is_active = TRUE;
CREATE INDEX idx_monitoring_schedules_active ON public.monitoring_schedules(is_active, next_run_at);

-- RLS
ALTER TABLE public.monitoring_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY monitoring_schedules_select ON public.monitoring_schedules
  FOR SELECT USING (
    creator_id IN (SELECT id FROM public.creators WHERE user_id = auth.uid())
  );

CREATE POLICY monitoring_schedules_insert ON public.monitoring_schedules
  FOR INSERT WITH CHECK (
    creator_id IN (SELECT id FROM public.creators WHERE user_id = auth.uid())
  );

CREATE POLICY monitoring_schedules_update ON public.monitoring_schedules
  FOR UPDATE USING (
    creator_id IN (SELECT id FROM public.creators WHERE user_id = auth.uid())
  );

CREATE POLICY monitoring_schedules_delete ON public.monitoring_schedules
  FOR DELETE USING (
    creator_id IN (SELECT id FROM public.creators WHERE user_id = auth.uid())
  );

COMMENT ON TABLE public.monitoring_schedules IS 'Scheduled automated scans that run periodically to detect new likeness usage.';


-- ============================================================================
-- 2. AUTHORIZED SOURCES TABLE
-- ============================================================================
-- Creators can whitelist specific URLs, domains, or social accounts
-- so that detected matches from these sources are auto-dismissed.

CREATE TABLE public.authorized_sources (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id        UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  source_type       TEXT NOT NULL CHECK (source_type IN ('url', 'domain', 'account', 'platform')),
  source_value      TEXT NOT NULL,             -- e.g. "https://example.com/my-page" or "instagram.com" or "@myaccount"
  label             TEXT,                       -- friendly name for the source
  notes             TEXT,                       -- reason for whitelisting
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT authorized_sources_unique UNIQUE (creator_id, source_type, source_value)
);

CREATE TRIGGER set_authorized_sources_updated_at
  BEFORE UPDATE ON public.authorized_sources
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Indexes
CREATE INDEX idx_authorized_sources_creator ON public.authorized_sources(creator_id);
CREATE INDEX idx_authorized_sources_lookup ON public.authorized_sources(creator_id, source_type, source_value)
  WHERE is_active = TRUE;

-- RLS
ALTER TABLE public.authorized_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY authorized_sources_select ON public.authorized_sources
  FOR SELECT USING (
    creator_id IN (SELECT id FROM public.creators WHERE user_id = auth.uid())
  );

CREATE POLICY authorized_sources_insert ON public.authorized_sources
  FOR INSERT WITH CHECK (
    creator_id IN (SELECT id FROM public.creators WHERE user_id = auth.uid())
  );

CREATE POLICY authorized_sources_update ON public.authorized_sources
  FOR UPDATE USING (
    creator_id IN (SELECT id FROM public.creators WHERE user_id = auth.uid())
  );

CREATE POLICY authorized_sources_delete ON public.authorized_sources
  FOR DELETE USING (
    creator_id IN (SELECT id FROM public.creators WHERE user_id = auth.uid())
  );

COMMENT ON TABLE public.authorized_sources IS 'Whitelisted URLs, domains, and accounts that should not trigger incidents.';


-- ============================================================================
-- 3. VOICE PRINTS TABLE
-- ============================================================================
-- Stores voice enrollment data for audio-based likeness detection.
-- Each creator can upload multiple voice samples for comparison.

CREATE TABLE public.voice_prints (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id        UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  asset_id          UUID REFERENCES public.assets(id) ON DELETE SET NULL,
  sample_name       TEXT NOT NULL,              -- e.g. "Speaking sample 1"
  duration_seconds  DECIMAL(10,2),
  storage_path      TEXT NOT NULL,
  storage_bucket    TEXT NOT NULL DEFAULT 'assets',
  sha256_hash       TEXT,
  fingerprint_data  JSONB,                      -- extracted audio features (MFCC, embeddings, etc.)
  status            TEXT NOT NULL DEFAULT 'processing'
                    CHECK (status IN ('processing', 'ready', 'failed', 'archived')),
  error_message     TEXT,
  metadata          JSONB DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_voice_prints_updated_at
  BEFORE UPDATE ON public.voice_prints
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Indexes
CREATE INDEX idx_voice_prints_creator ON public.voice_prints(creator_id);
CREATE INDEX idx_voice_prints_status ON public.voice_prints(creator_id, status);

-- RLS
ALTER TABLE public.voice_prints ENABLE ROW LEVEL SECURITY;

CREATE POLICY voice_prints_select ON public.voice_prints
  FOR SELECT USING (
    creator_id IN (SELECT id FROM public.creators WHERE user_id = auth.uid())
  );

CREATE POLICY voice_prints_insert ON public.voice_prints
  FOR INSERT WITH CHECK (
    creator_id IN (SELECT id FROM public.creators WHERE user_id = auth.uid())
  );

CREATE POLICY voice_prints_update ON public.voice_prints
  FOR UPDATE USING (
    creator_id IN (SELECT id FROM public.creators WHERE user_id = auth.uid())
  );

CREATE POLICY voice_prints_delete ON public.voice_prints
  FOR DELETE USING (
    creator_id IN (SELECT id FROM public.creators WHERE user_id = auth.uid())
  );

COMMENT ON TABLE public.voice_prints IS 'Voice samples uploaded by creators for audio likeness detection.';


-- ============================================================================
-- 4. ADD NEW AUDIT ACTIONS
-- ============================================================================
-- No schema change needed — audit_log.action is TEXT, not an enum.
-- But let's add a comment documenting the new action types:
--   monitoring.create, monitoring.update, monitoring.delete, monitoring.run
--   whitelist.create, whitelist.update, whitelist.delete
--   voice.enroll, voice.delete


-- ============================================================================
-- 5. ADD scan_type 'scheduled' AND 'web_detection' TO SCANS METADATA
-- ============================================================================
-- The scans table already supports scan_type TEXT, so 'scheduled' and
-- 'web_detection' are valid values. No schema change needed.
-- The 'web_detection' type is for Google Cloud Vision Web Detection results.


-- ============================================================================
-- 6. ADD monitoring_schedule_id TO SCANS (optional FK for scheduled scans)
-- ============================================================================

ALTER TABLE public.scans
  ADD COLUMN IF NOT EXISTS monitoring_schedule_id UUID REFERENCES public.monitoring_schedules(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_scans_monitoring ON public.scans(monitoring_schedule_id)
  WHERE monitoring_schedule_id IS NOT NULL;
