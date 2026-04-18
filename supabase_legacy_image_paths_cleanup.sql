-- Optional one-time cleanup for databases created before placeholder paths were removed.
-- Clears /hero.png and /lookbook.png from site content and product images so rows
-- behave like fresh installs (empty = unset). Run once in Supabase SQL Editor.

update public.site_content
set hero_image = ''
where id = 1 and hero_image in ('/hero.png', '/lookbook.png');

update public.products
set image = ''
where image in ('/hero.png', '/lookbook.png');
