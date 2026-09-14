-- Sets (or changes) the game master password. Run once in the Supabase SQL editor.
-- Replace BYT_MIG with the real password first. Do not commit the real password.
insert into public.gm_auth (id, password_hash)
values (true, extensions.crypt('BYT_MIG', extensions.gen_salt('bf')))
on conflict (id) do update set password_hash = excluded.password_hash;
