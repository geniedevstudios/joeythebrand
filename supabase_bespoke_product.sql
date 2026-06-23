-- Bespoke / Made-to-Order product support
-- Run this in the Supabase SQL Editor.

ALTER TABLE products ADD COLUMN IF NOT EXISTS bespoke_available BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS bespoke_lead_days INTEGER DEFAULT 14;
