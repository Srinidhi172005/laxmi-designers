-- ============================================================================
-- Laxmi Designers — pending migrations
-- ============================================================================
-- Safe to run more than once (every statement is IF NOT EXISTS / idempotent).
-- Run in: Supabase → SQL Editor → New query → Run.
--
-- Run this FIRST, then run security-policies.sql.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Enquiry statuses (Admin → Enquiries: New / Contacted / Confirmed /
--    Completed / Cancelled)
-- ---------------------------------------------------------------------------
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'New';

-- ---------------------------------------------------------------------------
-- 2. Video optimization metadata
--    Populated automatically by the browser-side optimizer on upload.
-- ---------------------------------------------------------------------------
ALTER TABLE videos ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS duration INT;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS file_size BIGINT;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS resolution TEXT;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE
  DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL;

-- ---------------------------------------------------------------------------
-- 3. Products: is_featured drives the homepage "Featured Collection".
--    (Already present in most installs — included for completeness.)
-- ---------------------------------------------------------------------------
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE;

-- ---------------------------------------------------------------------------
-- 4. Customer testimonials ("What Our Customers Say" on the homepage),
--    managed from Admin → Reviews.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS testimonials (
  id TEXT PRIMARY KEY,
  quote TEXT NOT NULL,
  author TEXT NOT NULL,
  location TEXT,
  rating INT DEFAULT 5,
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- RLS for the new table. This reuses public.is_admin(); if that function does
-- not exist yet (you get "function public.is_admin() does not exist"), the
-- block below creates it.
--
--   >>> EDIT THE EMAIL on the marked line to your Supabase admin account. <<<
--
-- If is_admin() already exists it is left untouched, so editing the email here
-- is only needed the first time.
DO $mig$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname = 'is_admin' AND n.nspname = 'public'
  ) THEN
    EXECUTE $fn$
      CREATE FUNCTION public.is_admin() RETURNS boolean LANGUAGE sql STABLE AS $body$
        SELECT coalesce(auth.jwt() ->> 'email', '') = 'REPLACE_WITH_YOUR_ADMIN_EMAIL@example.com'  -- <<< EDIT THIS
      $body$
    $fn$;
  END IF;
END
$mig$;

ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public read testimonials" ON testimonials;
DROP POLICY IF EXISTS "admin all testimonials"   ON testimonials;
CREATE POLICY "public read testimonials" ON testimonials
  FOR SELECT TO anon, authenticated USING ( true );
CREATE POLICY "admin all testimonials" ON testimonials
  FOR ALL TO authenticated USING ( public.is_admin() ) WITH CHECK ( public.is_admin() );

-- ---------------------------------------------------------------------------
-- 5. Editable website content (Admin → Site Editor). One JSON row, id='site'.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS site_content (
  id TEXT PRIMARY KEY DEFAULT 'site',
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);
ALTER TABLE site_content ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public read site_content" ON site_content;
DROP POLICY IF EXISTS "admin all site_content"   ON site_content;
CREATE POLICY "public read site_content" ON site_content
  FOR SELECT TO anon, authenticated USING ( true );
CREATE POLICY "admin all site_content" ON site_content
  FOR ALL TO authenticated USING ( public.is_admin() ) WITH CHECK ( public.is_admin() );

-- ---------------------------------------------------------------------------
-- 6. Enquiry (bookings) follow-up columns: internal notes + read flag.
-- ---------------------------------------------------------------------------
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS admin_notes TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;

-- ============================================================================
-- STORAGE (one-time, via the dashboard — cannot be done in SQL)
--   Storage → New bucket → name it exactly: videos → tick "Public bucket"
--   Then run security-policies.sql, which sets the bucket's access rules.
-- ============================================================================
