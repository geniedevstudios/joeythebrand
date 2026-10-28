-- ============================================================
-- JOEY THE BRAND — 00002: Catalog, Content, Events, Carts & Subscribers
-- ============================================================

-- 1. COLLECTIONS
CREATE TABLE IF NOT EXISTS public.collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  brief_description text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  image text,
  image2 text,
  image3 text,
  gallery_urls text[] NOT NULL DEFAULT '{}'::text[],
  detail_writeup text NOT NULL DEFAULT '',
  detail_video_url text NOT NULL DEFAULT '',
  detail_video_poster_url text NOT NULL DEFAULT '',
  detail_gallery_urls text[] NOT NULL DEFAULT '{}'::text[],
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "collections_public_read" ON public.collections;
DROP POLICY IF EXISTS "collections_admin_insert" ON public.collections;
DROP POLICY IF EXISTS "collections_admin_update" ON public.collections;
DROP POLICY IF EXISTS "collections_admin_delete" ON public.collections;

CREATE POLICY "collections_public_read" ON public.collections FOR SELECT USING (true);
CREATE POLICY "collections_admin_insert" ON public.collections FOR INSERT TO authenticated WITH CHECK (public.is_admin_dashboard_user());
CREATE POLICY "collections_admin_update" ON public.collections FOR UPDATE TO authenticated USING (public.is_admin_dashboard_user());
CREATE POLICY "collections_admin_delete" ON public.collections FOR DELETE TO authenticated USING (public.is_admin_dashboard_user());

-- 2. PRODUCTS
CREATE TABLE IF NOT EXISTS public.products (
  id text PRIMARY KEY,
  slug text UNIQUE,
  name text NOT NULL,
  category text NOT NULL,
  category_name text NOT NULL,
  price numeric NOT NULL,
  original_price numeric,
  image text NOT NULL DEFAULT '',
  hover_image text,
  images text[] NOT NULL DEFAULT '{}',
  description text NOT NULL DEFAULT '',
  details text[] NOT NULL DEFAULT '{}',
  sizes jsonb NOT NULL DEFAULT '[]',
  variants jsonb DEFAULT '[]'::jsonb,
  wear_tag text NOT NULL DEFAULT 'unisex',
  quantity integer NOT NULL DEFAULT 0,
  is_out_of_stock boolean NOT NULL DEFAULT false,
  is_limited boolean NOT NULL DEFAULT false,
  is_best_seller boolean NOT NULL DEFAULT false,
  featured boolean NOT NULL DEFAULT false,
  bespoke_available boolean DEFAULT false,
  bespoke_lead_days integer DEFAULT 14,
  weight_kg numeric,
  hs_code text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "products_public_read" ON public.products;
DROP POLICY IF EXISTS "products_admin_insert" ON public.products;
DROP POLICY IF EXISTS "products_admin_update" ON public.products;
DROP POLICY IF EXISTS "products_admin_delete" ON public.products;

CREATE POLICY "products_public_read" ON public.products FOR SELECT USING (true);
CREATE POLICY "products_admin_insert" ON public.products FOR INSERT TO authenticated WITH CHECK (public.is_admin_dashboard_user());
CREATE POLICY "products_admin_update" ON public.products FOR UPDATE TO authenticated USING (public.is_admin_dashboard_user());
CREATE POLICY "products_admin_delete" ON public.products FOR DELETE TO authenticated USING (public.is_admin_dashboard_user());

-- 3. PROMOTION CODES
CREATE TABLE IF NOT EXISTS public.promotion_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  percentage integer NOT NULL,
  active boolean NOT NULL DEFAULT true,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.promotion_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "promos_public_read" ON public.promotion_codes;
DROP POLICY IF EXISTS "promos_admin_insert" ON public.promotion_codes;
DROP POLICY IF EXISTS "promos_admin_update" ON public.promotion_codes;
DROP POLICY IF EXISTS "promos_admin_delete" ON public.promotion_codes;

CREATE POLICY "promos_public_read" ON public.promotion_codes FOR SELECT USING (true);
CREATE POLICY "promos_admin_insert" ON public.promotion_codes FOR INSERT TO authenticated WITH CHECK (public.is_admin_dashboard_user());
CREATE POLICY "promos_admin_update" ON public.promotion_codes FOR UPDATE TO authenticated USING (public.is_admin_dashboard_user());
CREATE POLICY "promos_admin_delete" ON public.promotion_codes FOR DELETE TO authenticated USING (public.is_admin_dashboard_user());

-- 4. SITE CONTENT
CREATE TABLE IF NOT EXISTS public.site_content (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  hero_image text NOT NULL DEFAULT '',
  hero_title text NOT NULL DEFAULT 'JOEY THE BRAND',
  hero_subtitle text NOT NULL DEFAULT 'Contemporary fashion redefining modern silhouettes',
  about_image text NOT NULL DEFAULT '',
  about_text text NOT NULL DEFAULT 'JOEY THE BRAND is a contemporary fashion house redefining modern silhouettes through structure, symbolism, and unapologetic identity.',
  featured_product_ids text[] NOT NULL DEFAULT '{}',
  page_heroes jsonb NOT NULL DEFAULT '{}'::jsonb,
  founder_video_url text NOT NULL DEFAULT '',
  founder_video_poster_url text NOT NULL DEFAULT '',
  founder_kicker text NOT NULL DEFAULT 'BEHIND THE PATTERN',
  founder_headline text NOT NULL DEFAULT 'An intimate look at the craft behind every design.',
  founder_cta_label text NOT NULL DEFAULT 'DISCOVER THE STORY',
  founder_cta_href text NOT NULL DEFAULT '/story',
  news_spotlights jsonb NOT NULL DEFAULT '[]'::jsonb,
  promotion_popup jsonb NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE public.site_content REPLICA IDENTITY FULL;
ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "site_content_public_read" ON public.site_content;
DROP POLICY IF EXISTS "site_content_admin_insert" ON public.site_content;
DROP POLICY IF EXISTS "site_content_admin_update" ON public.site_content;

CREATE POLICY "site_content_public_read" ON public.site_content FOR SELECT USING (true);
CREATE POLICY "site_content_admin_insert" ON public.site_content FOR INSERT TO authenticated WITH CHECK (public.is_admin_dashboard_user());
CREATE POLICY "site_content_admin_update" ON public.site_content FOR UPDATE TO authenticated USING (public.is_admin_dashboard_user());

-- 5. EVENTS PAGE & EVENTS
CREATE TABLE IF NOT EXISTS public.events_page (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  heading text NOT NULL DEFAULT 'Events',
  subheading text,
  body text,
  top_video_url text,
  top_video_poster_url text,
  top_video_tablet_url text,
  top_video_tablet_poster_url text,
  top_video_mobile_url text,
  top_video_mobile_poster_url text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.events_page ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "events_page_public_read" ON public.events_page;
DROP POLICY IF EXISTS "events_page_admin_insert" ON public.events_page;
DROP POLICY IF EXISTS "events_page_admin_update" ON public.events_page;

CREATE POLICY "events_page_public_read" ON public.events_page FOR SELECT USING (true);
CREATE POLICY "events_page_admin_insert" ON public.events_page FOR INSERT TO authenticated WITH CHECK (public.is_admin_dashboard_user());
CREATE POLICY "events_page_admin_update" ON public.events_page FOR UPDATE TO authenticated USING (public.is_admin_dashboard_user());

CREATE TABLE IF NOT EXISTS public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  category text NOT NULL DEFAULT 'fashion_shows',
  status text NOT NULL DEFAULT 'upcoming',
  location text,
  start_at timestamptz,
  date_label text,
  description text,
  details text,
  details_ready boolean NOT NULL DEFAULT false,
  main_video_url text,
  main_video_poster_url text,
  flyer_url text,
  gallery_urls text[] NOT NULL DEFAULT '{}'::text[],
  recap_youtube_url text,
  pixieset_url text,
  collection_slugs text[] NOT NULL DEFAULT '{}'::text[],
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "events_public_read" ON public.events;
DROP POLICY IF EXISTS "events_admin_insert" ON public.events;
DROP POLICY IF EXISTS "events_admin_update" ON public.events;
DROP POLICY IF EXISTS "events_admin_delete" ON public.events;

CREATE POLICY "events_public_read" ON public.events FOR SELECT USING (true);
CREATE POLICY "events_admin_insert" ON public.events FOR INSERT TO authenticated WITH CHECK (public.is_admin_dashboard_user());
CREATE POLICY "events_admin_update" ON public.events FOR UPDATE TO authenticated USING (public.is_admin_dashboard_user());
CREATE POLICY "events_admin_delete" ON public.events FOR DELETE TO authenticated USING (public.is_admin_dashboard_user());

-- 6. CARTS
CREATE TABLE IF NOT EXISTS public.carts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own cart." ON public.carts;
DROP POLICY IF EXISTS "Users can insert their own cart." ON public.carts;
DROP POLICY IF EXISTS "Users can update their own cart." ON public.carts;

CREATE POLICY "Users can view their own cart." ON public.carts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own cart." ON public.carts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own cart." ON public.carts FOR UPDATE USING (auth.uid() = user_id);

-- 7. SUBSCRIBERS
CREATE TABLE IF NOT EXISTS public.subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS subscribers_email_idx ON public.subscribers (lower(email));
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.subscribers FROM public;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscribers TO service_role;
