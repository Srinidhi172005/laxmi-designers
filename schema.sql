-- DDL for Laxmi Designers Boutique Management Database Schema (Supabase PostgreSQL)

-- 1. Categories Table
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Subcategories Table (to support category hierarchy)
CREATE TABLE IF NOT EXISTS subcategories (
  id TEXT PRIMARY KEY,
  category_id TEXT REFERENCES categories(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. Products Table
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
  subcategory_id TEXT REFERENCES subcategories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(12, 2) NOT NULL,
  discount_price NUMERIC(12, 2),
  stock INT DEFAULT 5,
  sku TEXT,
  fabric TEXT,
  color TEXT,
  size TEXT DEFAULT 'S, M, L, Custom Measure',
  image_urls TEXT[] DEFAULT '{}',
  video_url TEXT,
  is_featured BOOLEAN DEFAULT FALSE,
  is_new_arrival BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  details TEXT[] DEFAULT '{}',
  signature_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. Homepage Banners Table
CREATE TABLE IF NOT EXISTS homepage_banners (
  id TEXT PRIMARY KEY,
  title TEXT,
  image_url TEXT,
  video_url TEXT,
  button_text TEXT,
  button_link TEXT,
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 5. Collections Table
CREATE TABLE IF NOT EXISTS collections (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  video_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 6. Videos Table
-- Videos are optimized in the browser (MP4/H.264/AAC, <=1080p, <=30fps) and a
-- WebP poster is generated automatically — see src/utils/videoOptimizer.ts.
-- Only the optimized file's public URL is stored, never the original.
CREATE TABLE IF NOT EXISTS videos (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  section TEXT NOT NULL, -- 'featured' | 'hero' | 'about' | 'gallery'
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,    -- auto-generated WebP poster (ImgBB)
  duration INT,          -- seconds
  file_size BIGINT,      -- bytes, after optimization
  resolution TEXT,       -- e.g. '1920x1080'
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- If the videos table already exists, add the optimization metadata columns:
-- ALTER TABLE videos ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
-- ALTER TABLE videos ADD COLUMN IF NOT EXISTS duration INT;
-- ALTER TABLE videos ADD COLUMN IF NOT EXISTS file_size BIGINT;
-- ALTER TABLE videos ADD COLUMN IF NOT EXISTS resolution TEXT;
-- ALTER TABLE videos ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE
--   DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL;

-- 6b. Testimonials Table ("What Our Customers Say", managed in Admin → Reviews)
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

-- 6c. Site Content Table (editable website copy, Admin -> Site Editor)
CREATE TABLE IF NOT EXISTS site_content (
  id TEXT PRIMARY KEY DEFAULT 'site',
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 7. Settings Table (Key-Value store or single row configuration)
CREATE TABLE IF NOT EXISTS settings (
  id TEXT PRIMARY KEY DEFAULT 'boutique_config',
  boutique_name TEXT NOT NULL DEFAULT 'Laxmi Designers',
  logo TEXT,
  contact_number TEXT,
  whatsapp_number TEXT,
  email TEXT,
  address TEXT,
  google_maps_link TEXT,
  instagram_url TEXT,
  facebook_url TEXT,
  footer_text TEXT,
  business_hours TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 8. Bookings/Enquiries Table (for the consultation requests)
CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT NOT NULL,
  date TEXT NOT NULL,
  time_slot TEXT NOT NULL,
  consultation_type TEXT NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'New', -- New | Contacted | Confirmed | Completed | Cancelled
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- If the bookings table already exists, add the status column:
-- ALTER TABLE bookings ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'New';

-- 9. Orders Table (for client checkout bookings)
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  customer_name TEXT NOT NULL,
  email TEXT,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip_code TEXT NOT NULL,
  country TEXT DEFAULT 'India',
  cart_items JSONB NOT NULL DEFAULT '[]',
  subtotal NUMERIC(12, 2) NOT NULL,
  shipping_cost NUMERIC(12, 2) DEFAULT 0,
  total NUMERIC(12, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 10. Storage setup for video uploads (banner videos + featured videos)
-- One-time: create a bucket named exactly "videos" (Storage → New bucket,
-- tick "Public bucket"), then run these policies so the app can upload to it.
--
-- NOTE: these allow anyone holding the public anon key to write to the bucket.
-- That is how the current client-side admin works. To lock it down, move the
-- admin behind Supabase Auth and change `to public` -> `to authenticated`.
--
-- create policy "Public read videos" on storage.objects
--   for select to public using ( bucket_id = 'videos' );
--
-- create policy "Public upload videos" on storage.objects
--   for insert to public with check ( bucket_id = 'videos' );
--
-- create policy "Public update videos" on storage.objects
--   for update to public using ( bucket_id = 'videos' )
--   with check ( bucket_id = 'videos' );
--
-- create policy "Public delete videos" on storage.objects
--   for delete to public using ( bucket_id = 'videos' );
