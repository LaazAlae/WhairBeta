-- ============================================================================
-- Whair Migration 003: Add 'web_detection' to scans.scan_type constraint
-- ============================================================================
-- The original constraint only allowed: url, image_upload, scheduled
-- Web Detection (Google Vision) scans need 'web_detection' as a valid type.
-- ============================================================================

ALTER TABLE public.scans
  DROP CONSTRAINT IF EXISTS scans_scan_type_check;

ALTER TABLE public.scans
  ADD CONSTRAINT scans_scan_type_check
  CHECK (scan_type IN ('url', 'image_upload', 'scheduled', 'web_detection'));
