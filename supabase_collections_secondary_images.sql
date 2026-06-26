-- Rename existing hover_image to image2 to preserve any data
ALTER TABLE public.collections
RENAME COLUMN hover_image TO image2;

-- Add image3 column
ALTER TABLE public.collections
ADD COLUMN IF NOT EXISTS image3 text;
