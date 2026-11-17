-- PostgREST computed field. The customer's order query requests the boolean only.
CREATE OR REPLACE FUNCTION public.has_label(public.orders)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT nullif($1.dhl_label_url, '') IS NOT NULL;
$$;

REVOKE ALL ON FUNCTION public.has_label(public.orders) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_label(public.orders) TO authenticated, service_role;
