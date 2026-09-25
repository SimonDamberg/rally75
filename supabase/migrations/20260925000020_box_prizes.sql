-- The real Mystery Box: Simon's 14 prizes (17 pieces, the knife comes in four) replace the
-- placeholders from *_mystery_box.sql. Photos live in public/butik/.
--
-- A prize may also carry a video (box_prizes.video, a file name under public/butik/): the guest's
-- reveal pop-up loops it, muted, in place of the photo. Only the knife has one. It is display only,
-- so the GM RPCs leave it alone and an edit on the control phone keeps it.

alter table public.box_prizes add column video text not null default '';

-- Only the seeded placeholders: anything added on the control phone stays. Receipts keep their
-- snapshotted prize names (purchases.prize_id is "on delete set null").
delete from public.box_prizes where name in (
  'Klistermärke med grodan', 'Nyckelring', 'Solglasögon från macken', 'En flaska bubbel',
  'Mr Green-keps', 'Guldkniven'
);

insert into public.box_prizes (name, blurb, image, video, rarity, stock, sort) values
  ('Glasskål (blå)', 'Skål och sked i ett. Glassen ingår inte.', 'glassbla.jpg', '', 'lila', 1, 10),
  ('Matlåda (blå)', 'Rymmer exakt en portion ånger.', 'blalada.jpg', '', 'bla', 1, 20),
  ('Barbie', 'Med två extra klänningar. Hon har bättre garderob än du.', 'barbie.jpg', '', 'rosa', 1, 30),
  ('Burgir', 'Gelé, inte kött. Vi frågar inte vad du trodde.', 'burgir.jpg', '', 'bla', 1, 40),
  ('Helikopter', '36 bitar. Byggs på fyllan, flyger aldrig.', 'helikopter.jpg', '', 'rosa', 1, 50),
  ('Äggpingvinen', 'Skiljer gulan från vitan. Och dig från din värdighet.', 'egg.jpg', '', 'bla', 1, 60),
  ('Glasskål (rosa)', 'Samma skål, finare färg.', 'glasspink.jpg', '', 'lila', 1, 70),
  ('Bomull', 'Åttio rondeller. Räcker hela kvällen, och sen lite till.', 'bomull.jpg', '', 'bla', 1, 80),
  ('Kniiiiiv', 'Legendarisk. Skär smör, om smöret ger med sig.', 'kniv.jpg', 'kniv.mp4', 'guld', 4, 90),
  ('Pengar', 'En hel bunt femtiolappar. Riksbanken vet inte om det.', 'pengar.jpg', '', 'rod', 1, 100),
  ('Ryggkliaren', 'Når där ingen annan vill. Skohorn på köpet.', 'rygg.jpg', '', 'rod', 1, 110),
  ('Matlåda (orange)', 'För resterna av din bankrulle.', 'orange.jpg', '', 'bla', 1, 120),
  ('Labyrintspelet', 'Tjugo hål, en kula, noll chans.', 'labyrint.jpg', '', 'rosa', 1, 130),
  ('Glasögonservetter', 'Tjugo stycken. Se dina förluster i skarpt fokus.', 'serv.jpg', '', 'bla', 1, 140);
