-- The Mystery Box gets its picture: a CS-style case (public/butik/box.png, transparent background).
update public.shop_items set image = 'box.png' where kind = 'box' and image in ('', 'box.jpg');
