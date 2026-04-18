-- ============================================================
-- JOEY THE BRAND — Add SEO Slugs to Products
-- Run this in the Supabase SQL Editor
-- ============================================================

-- 1. Temporarily drop constraint if this is a retry
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_slug_key;

-- 2. Add the slug column without a unique constraint first
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS slug text;

-- 3. Backfill existing products. 
-- We immediately append a number (-2, -3) to duplicates using row_number!
WITH name_slugs AS (
  SELECT 
    id, 
    lower(trim(regexp_replace(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'), '^-|-$', '', 'g'))) as base_slug,
    row_number() OVER (
      PARTITION BY lower(trim(regexp_replace(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'), '^-|-$', '', 'g'))) 
      ORDER BY created_at
    ) as r
  FROM public.products
)
UPDATE public.products p
SET slug = 
  CASE 
    WHEN ns.r = 1 THEN ns.base_slug
    ELSE ns.base_slug || '-' || ns.r
  END
FROM name_slugs ns
WHERE p.id = ns.id;

-- 4. Re-apply the UNIQUE constraint now that duplicates are resolved
ALTER TABLE public.products ADD CONSTRAINT products_slug_key UNIQUE (slug);
