-- ============================================================================
-- Laxmi Designers — Row Level Security (RLS) setup
-- ============================================================================
-- Run this ONCE in Supabase → SQL Editor → New query → Run.
--
--  ⚠️  BEFORE YOU RUN: replace the email on the next line with the email of the
--      admin account you created in Supabase → Authentication → Users.
-- ----------------------------------------------------------------------------
--      There are TWO required steps. Doing only one leaves you exposed:
--
--   STEP A (dashboard): Authentication → Providers → Email →
--                       turn OFF "Enable sign ups".
--        Why: the anon key is public in the browser bundle. With signups on,
--        ANYONE could create their own account and would then satisfy the
--        `authenticated` role — gaining access to every customer's phone
--        number and email. Role alone is NOT proof of being the admin.
--
--   STEP B (this script): policies below are scoped to your specific admin
--        email, so even if an account is somehow created it still has no
--        access to customer data.
-- ============================================================================

-- >>> EDIT THIS <<<
create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select coalesce(auth.jwt() ->> 'email', '') = 'REPLACE_WITH_YOUR_ADMIN_EMAIL@example.com';
$$;

-- ---------------------------------------------------------------------------
-- 1. Turn RLS on for every table
-- ---------------------------------------------------------------------------
alter table products           enable row level security;
alter table categories         enable row level security;
alter table subcategories      enable row level security;
alter table homepage_banners   enable row level security;
alter table collections        enable row level security;
alter table videos             enable row level security;
alter table testimonials       enable row level security;
alter table site_content       enable row level security;
alter table settings           enable row level security;
alter table bookings           enable row level security;
alter table orders             enable row level security;

-- ---------------------------------------------------------------------------
-- 2. Drop any pre-existing policies so we start from a known state
-- ---------------------------------------------------------------------------
do $$
declare r record;
begin
  for r in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('products','categories','subcategories','homepage_banners',
                        'collections','videos','testimonials','site_content','settings','bookings','orders')
  loop
    execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 3. PUBLIC (visitors) — read-only catalog. No login, nothing changes for them.
-- ---------------------------------------------------------------------------
create policy "public read products"    on products         for select to anon, authenticated using ( true );
create policy "public read categories"  on categories       for select to anon, authenticated using ( true );
create policy "public read subcats"     on subcategories    for select to anon, authenticated using ( true );
create policy "public read banners"     on homepage_banners for select to anon, authenticated using ( true );
create policy "public read collections" on collections      for select to anon, authenticated using ( true );
create policy "public read videos"      on videos           for select to anon, authenticated using ( true );
create policy "public read settings"    on settings         for select to anon, authenticated using ( true );
create policy "public read testimonials" on testimonials    for select to anon, authenticated using ( true );
create policy "public read site_content" on site_content    for select to anon, authenticated using ( true );

-- Visitors may SUBMIT an enquiry but may NEVER read any enquiry.
-- The length caps blunt junk/spam payloads.
create policy "public submit booking" on bookings
  for insert to anon, authenticated
  with check (
    length(coalesce(name, ''))  between 1 and 120
    and length(coalesce(phone, '')) between 1 and 40
    and length(coalesce(email, '')) <= 200
    and length(coalesce(notes, '')) <= 2000
    and coalesce(status, 'New') = 'New'
  );

-- ---------------------------------------------------------------------------
-- 4. ADMIN — full control, scoped to YOUR email (not merely "authenticated")
-- ---------------------------------------------------------------------------
create policy "admin all products"    on products         for all to authenticated using ( public.is_admin() ) with check ( public.is_admin() );
create policy "admin all categories"  on categories       for all to authenticated using ( public.is_admin() ) with check ( public.is_admin() );
create policy "admin all subcats"     on subcategories    for all to authenticated using ( public.is_admin() ) with check ( public.is_admin() );
create policy "admin all banners"     on homepage_banners for all to authenticated using ( public.is_admin() ) with check ( public.is_admin() );
create policy "admin all collections" on collections      for all to authenticated using ( public.is_admin() ) with check ( public.is_admin() );
create policy "admin all videos"      on videos           for all to authenticated using ( public.is_admin() ) with check ( public.is_admin() );
create policy "admin all settings"    on settings         for all to authenticated using ( public.is_admin() ) with check ( public.is_admin() );
create policy "admin all testimonials" on testimonials    for all to authenticated using ( public.is_admin() ) with check ( public.is_admin() );
create policy "admin all site_content" on site_content    for all to authenticated using ( public.is_admin() ) with check ( public.is_admin() );
create policy "admin all bookings"    on bookings         for all to authenticated using ( public.is_admin() ) with check ( public.is_admin() );
create policy "admin all orders"      on orders           for all to authenticated using ( public.is_admin() ) with check ( public.is_admin() );

-- ---------------------------------------------------------------------------
-- 5. Storage: the "videos" bucket
--    Anyone can watch; only the admin can upload / replace / delete.
-- ---------------------------------------------------------------------------
drop policy if exists "Public read videos"      on storage.objects;
drop policy if exists "Public upload videos"    on storage.objects;
drop policy if exists "Public update videos"    on storage.objects;
drop policy if exists "Public delete videos"    on storage.objects;
drop policy if exists "anyone can watch videos" on storage.objects;
drop policy if exists "admin upload videos"     on storage.objects;
drop policy if exists "admin update videos"     on storage.objects;
drop policy if exists "admin delete videos"     on storage.objects;

create policy "anyone can watch videos" on storage.objects
  for select to anon, authenticated using ( bucket_id = 'videos' );

create policy "admin upload videos" on storage.objects
  for insert to authenticated with check ( bucket_id = 'videos' and public.is_admin() );

create policy "admin update videos" on storage.objects
  for update to authenticated
  using ( bucket_id = 'videos' and public.is_admin() )
  with check ( bucket_id = 'videos' and public.is_admin() );

create policy "admin delete videos" on storage.objects
  for delete to authenticated using ( bucket_id = 'videos' and public.is_admin() );

-- ---------------------------------------------------------------------------
-- 6. Keep PII out of the realtime firehose
--    The app subscribes only to catalog tables, but make it impossible at the
--    source: bookings/orders must not be published over realtime.
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin execute 'alter publication supabase_realtime drop table bookings'; exception when others then null; end;
    begin execute 'alter publication supabase_realtime drop table orders';   exception when others then null; end;
  end if;
end $$;

-- ============================================================================
-- VERIFY
--   select tablename, policyname, roles, cmd from pg_policies
--   where schemaname = 'public' order by tablename;
--
-- SMOKE TEST (do this in a private browser window, logged out):
--   * the catalog loads                        -> expected
--   * submitting an enquiry works              -> expected
--   * /admin will not open without login       -> expected
-- ============================================================================
