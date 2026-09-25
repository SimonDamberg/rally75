-- Five more prizes for the Mystery Box (Simon's second batch). The pirate ship has a video, looped
-- in the winner's reveal pop-up like the knife's. Photos and clips live in public/butik/.

insert into public.box_prizes (name, blurb, image, video, rarity, stock, sort) values
  ('Mikron', 'Värmer mat, tinar hopp. Kabeln följer med.', 'mikro.jpg', '', 'rod', 1, 150),
  ('Xbox 360', 'Rött ljus ingår inte. Förhoppningsvis.', 'xbox.jpg', '', 'rod', 1, 160),
  ('Laptop', 'Windows 7. Fläkten har åsikter.', 'laptop.jpg', '', 'rod', 1, 170),
  ('Gamingtangentbord', 'Klickar högre än dina grannar tål.', 'tangentbord.jpg', '', 'rosa', 1, 180),
  ('Piratskeppet', 'Ett helt skepp. Besättningen har mönstrat av.', 'skepp.jpg', 'skepp.mp4', 'guld', 1, 190);
