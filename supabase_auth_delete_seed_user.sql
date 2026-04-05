-- Run in Supabase SQL Editor ONLY if you previously ran the old SQL seed for
-- auth.users and now get HTTP 500 when signing in with email/password.
--
-- Prefer deleting the user in Dashboard → Authentication → Users (safest).
--
-- If you use SQL: adjust the email if yours differs. If DELETE on auth.users fails
-- because public.orders references this user, either delete those rows or:
--   UPDATE public.orders SET user_id = NULL WHERE customer_email = '<same email>';

DELETE FROM auth.identities
WHERE user_id IN (SELECT id FROM auth.users WHERE email = 'joeythebrandonline@gmail.com');

DELETE FROM auth.users
WHERE email = 'joeythebrandonline@gmail.com';

-- Then create the admin again: Dashboard → Authentication → Users → Add user
-- (Auto Confirm User = on). Use the same email as in supabase_orders_rls.sql.
