-- The party runs in the daytime: the seeded Butik copy said "kväll" and "natt".
-- Renames the title item (and anyone already wearing the title) and the badge blurb.
-- Only touches rows that still carry the seeded text, so a GM edit is left alone.

update public.shop_items
set name = 'Titeln Dagens Kusk', effect_value = 'Dagens Kusk'
where name = 'Titeln Kvällens Kusk' and effect = 'title' and effect_value = 'Kvällens Kusk';

update public.players set title = 'Dagens Kusk' where title = 'Kvällens Kusk';

update public.shop_items
set blurb = 'Brinner på topplistan hela dagen.'
where blurb = 'Brinner på topplistan hela natten.';
