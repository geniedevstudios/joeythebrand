-- ============================================================
-- JOEY THE BRAND — Inventory Tracking (Product Quantity)
-- ============================================================

-- 1) Add the quantity column to track stock levels.
--    Defaulting to 0 to be safe; admin can update existing products.
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS quantity integer NOT NULL DEFAULT 0;

-- 2) Update is_out_of_stock based on quantity (Optional/Initial Sync)
--    If quantity > 0, set is_out_of_stock to FALSE
UPDATE public.products
SET is_out_of_stock = FALSE
WHERE quantity > 0;

-- 3) If quantity <= 0, set is_out_of_stock to TRUE
UPDATE public.products
SET is_out_of_stock = TRUE
WHERE quantity <= 0;
