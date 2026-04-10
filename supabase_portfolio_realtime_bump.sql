-- Create the bump table with a single row
CREATE TABLE IF NOT EXISTS public.portfolio_realtime_bumps (
  id int PRIMARY KEY DEFAULT 1,
  last_updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.portfolio_realtime_bumps (id) VALUES (1) ON CONFLICT DO NOTHING;

-- Secure it: Only public read. Admin/Trigger can write since it runs SECURITY DEFINER.
ALTER TABLE public.portfolio_realtime_bumps ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bumps_public_read" ON public.portfolio_realtime_bumps;
CREATE POLICY "bumps_public_read" ON public.portfolio_realtime_bumps FOR SELECT USING (true);

-- Create the trigger function
CREATE OR REPLACE FUNCTION public.bump_portfolio_realtime()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.portfolio_realtime_bumps SET last_updated_at = now() WHERE id = 1;
  RETURN NULL;
END;
$$;

-- Attach trigger to the bookings table. (Use FOR EACH STATEMENT for efficiency)
DROP TRIGGER IF EXISTS bump_portfolio_trigger ON public.consultation_bookings;
CREATE TRIGGER bump_portfolio_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.consultation_bookings
  FOR EACH STATEMENT
  EXECUTE PROCEDURE public.bump_portfolio_realtime();
  
-- Ensure it is broadcasted!
ALTER PUBLICATION supabase_realtime ADD TABLE public.portfolio_realtime_bumps;
