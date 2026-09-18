-- Kuponger: printed QR tickets that pay out RM.
--
-- Some of the guests run physical games at the party (dart, beer pong, whatever the evening
-- produces). Winning one of those should pay in the currency the rest of the night runs on, so the
-- room and the site are one economy. A ticket is a small printed card with a QR code pointing at
-- /k/<code>; the guest scans it, taps once, and the RM lands on the account.
--
-- The security model, since these are printed days in advance and left in a friend's pocket:
--
-- 1. One-time use is enforced here, not in the browser. redeem_coupon locks the row "for update"
--    and refuses anything already stamped, so scanning the same ticket twice fails even if two
--    phones scan in the same millisecond.
-- 2. Codes are unguessable: 8 characters of Crockford base32 from gen_random_bytes, i.e. 2^40
--    possibilities for the hundred-odd tickets that exist. There is no sequence to increment.
-- 3. The codes never reach a browser. Plaintext lives in coupon_secrets, which has no grants and no
--    policies, exactly like player_secrets and race_secrets, and is readable only inside these
--    SECURITY DEFINER functions. public.coupons carries value, tier, label and redemption state so
--    the iPad can toast a redemption and the GM page can count what is left, but never the code.
--    coupon_secrets must therefore never be granted or added to the Realtime publication.
--
-- One deliberate difference from the Butik: a coupon is *not* rank neutral. The RM lands in
-- players.balance and nowhere else, so it lifts you on Toppen and on nightNet. Winning at dart is
-- meant to be worth something. That also makes this the only way the GM can mint RM at will, which
-- is why both the value and the batch size are capped server-side.
-- Mirrored in src/shared/game/economy.ts: COUPON_MAX_AMOUNT 5000, COUPON_MAX_BATCH 200.
--
-- gm_reset_night needs no change. Coupons are physical objects in the room, so they survive a reset
-- the way the Butik catalogue and the kuskar do: redeemed_by goes null with the deleted players
-- while redeemed_at keeps the ticket spent. To reuse tickets after a rehearsal, delete that batch
-- with gm_delete_coupon_batch and print a fresh one.

-- Tables ------------------------------------------------------------------------------------

create table public.coupons (
  id uuid primary key default gen_random_uuid(),
  -- 1 brons, 2 silver, 3 guld. Only for grouping and for what the printed ticket says.
  tier int not null check (tier between 1 and 3),
  amount int not null check (amount > 0 and amount <= 5000),
  -- Which game handed it out ("Dart"), printed on the ticket and shown in the GM feed.
  label text not null default '' check (char_length(label) <= 24),
  -- One print run, so a lost sheet can be reprinted and a rehearsal batch thrown away.
  batch uuid not null,
  created_at timestamptz not null default now(),
  -- on delete set null, so deleting a player does not hand a spent ticket back to the room:
  -- redeemed_at is the authority on whether a coupon is used, redeemed_by only on who used it.
  redeemed_by uuid references public.players (id) on delete set null,
  redeemed_at timestamptz
);
create index coupons_batch_idx on public.coupons (batch);
create index coupons_redeemed_at_idx on public.coupons (redeemed_at desc);

-- No grants, no policies: this table is the whole security model. See the header.
create table public.coupon_secrets (
  code text primary key,
  coupon_id uuid not null references public.coupons (id) on delete cascade
);
create index coupon_secrets_coupon_id_idx on public.coupon_secrets (coupon_id);

-- RLS and grants ----------------------------------------------------------------------------

alter table public.coupons enable row level security;
alter table public.coupon_secrets enable row level security;

revoke all on public.coupons, public.coupon_secrets from public, anon, authenticated;

grant select on public.coupons to anon, authenticated;

create policy "public read" on public.coupons for select to anon, authenticated using (true);

-- Realtime ----------------------------------------------------------------------------------

-- coupons only: the display iPad announces every redemption to the room, and the GM page keeps its
-- counts current while Simon is looking at something else.
alter publication supabase_realtime add table public.coupons;

-- Guest RPC ---------------------------------------------------------------------------------

-- Forgiving about what the guest typed: Crockford base32 leaves out I, L, O and U, so I and L read
-- as 1 and O as 0, and anything else (spaces, the dash the ticket prints) is dropped.
create function private.clean_coupon_code(p_code text)
returns text
language sql
immutable
set search_path = ''
as $$
  select regexp_replace(
    translate(upper(coalesce(p_code, '')), 'ILO', '110'),
    '[^0-9ABCDEFGHJKMNPQRSTVWXYZ]', '', 'g'
  );
$$;

create function public.redeem_coupon(p_player_id uuid, p_token uuid, p_code text)
returns public.coupons
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code text;
  v_id uuid;
  v_coupon public.coupons;
begin
  perform private.check_player(p_player_id, p_token);

  v_code := private.clean_coupon_code(p_code);
  if char_length(v_code) = 0 then
    raise exception 'coupon_not_found';
  end if;

  select s.coupon_id into v_id from public.coupon_secrets s where s.code = v_code;
  if not found then
    raise exception 'coupon_not_found';
  end if;

  -- Lock order: the coupon, then players (buy_item locks the item, then players).
  select * into v_coupon from public.coupons c where c.id = v_id for update;
  if v_coupon.redeemed_at is not null then
    raise exception 'coupon_used';
  end if;

  -- The "redeemed_at is null" guard is belt and braces next to the lock above: two phones scanning
  -- the same ticket at once serialise here, and the loser raises coupon_used.
  update public.coupons
  set redeemed_by = p_player_id, redeemed_at = now()
  where id = v_coupon.id and redeemed_at is null
  returning * into v_coupon;
  if not found then
    raise exception 'coupon_used';
  end if;

  update public.players set balance = balance + v_coupon.amount where id = p_player_id;

  return v_coupon;
end
$$;

-- GM RPCs -----------------------------------------------------------------------------------

-- Mints one print run and hands back the plaintext codes. This is the only time they are readable
-- outside gm_batch_codes, so the page that calls it is also the page that prints them.
create function public.gm_create_coupons(
  p_password text, p_tier int, p_amount int, p_label text, p_count int
)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_alphabet constant text := '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  v_label text := left(btrim(coalesce(p_label, '')), 24);
  v_batch uuid := gen_random_uuid();
  v_out jsonb := '[]'::jsonb;
  v_bytes bytea;
  v_try text;
  v_code text;
  v_id uuid;
begin
  perform private.check_gm(p_password);

  if p_tier is null or p_tier not between 1 and 3 then
    raise exception 'bad_tier';
  end if;
  if p_amount is null or p_amount < 1 or p_amount > 5000 then
    raise exception 'coupon_amount';
  end if;
  if p_count is null or p_count < 1 or p_count > 200 then
    raise exception 'bad_count';
  end if;

  for i in 1..p_count loop
    insert into public.coupons (tier, amount, label, batch)
    values (p_tier, p_amount, v_label, v_batch)
    returning id into v_id;

    v_code := null;
    for attempt in 1..20 loop
      -- One byte per character. 256 is a multiple of 32, so the modulo is unbiased.
      v_bytes := extensions.gen_random_bytes(8);
      v_try := '';
      for b in 0..7 loop
        v_try := v_try || substr(v_alphabet, (get_byte(v_bytes, b) % 32) + 1, 1);
      end loop;
      -- A collision is a lottery win at this scale, but an unhandled one would abort a print run.
      if not exists (select 1 from public.coupon_secrets s where s.code = v_try) then
        v_code := v_try;
        exit;
      end if;
    end loop;
    if v_code is null then
      raise exception 'coupon_code_failed';
    end if;

    insert into public.coupon_secrets (code, coupon_id) values (v_code, v_id);
    v_out := v_out || jsonb_build_object('id', v_id, 'code', v_code);
  end loop;

  return (jsonb_build_object('batch', v_batch, 'coupons', v_out))::json;
end
$$;

-- Reprints a sheet that was closed, lost or printed crooked. Same shape as gm_create_coupons.
create function public.gm_batch_codes(p_password text, p_batch uuid)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_out jsonb;
begin
  perform private.check_gm(p_password);

  select jsonb_agg(jsonb_build_object('id', c.id, 'code', s.code) order by s.code)
  into v_out
  from public.coupons c
  join public.coupon_secrets s on s.coupon_id = c.id
  where c.batch = p_batch;

  if v_out is null then
    raise exception 'coupon_batch_not_found';
  end if;

  return (jsonb_build_object('batch', p_batch, 'coupons', v_out))::json;
end
$$;

-- Ångra: the wrong guest scanned it, or someone scanned a ticket they had not won. Takes the RM
-- back and frees the ticket so the right guest can still claim it.
create function public.gm_void_claim(p_password text, p_id uuid)
returns public.coupons
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_coupon public.coupons;
begin
  perform private.check_gm(p_password);

  select * into v_coupon from public.coupons c where c.id = p_id for update;
  if not found then
    raise exception 'coupon_not_found';
  end if;
  if v_coupon.redeemed_at is null then
    raise exception 'coupon_not_redeemed';
  end if;

  if v_coupon.redeemed_by is not null then
    -- greatest(): the RM may already be on a horse or in the Butik, and a negative balance would
    -- break the checks in place_bet and buy_item. Getting the rest back is Simon's job, not the
    -- database's.
    update public.players
    set balance = greatest(balance - v_coupon.amount, 0)
    where id = v_coupon.redeemed_by;
  end if;

  update public.coupons
  set redeemed_by = null, redeemed_at = null
  where id = p_id
  returning * into v_coupon;

  return v_coupon;
end
$$;

-- Throws away a whole print run, codes and all. For clearing out a rehearsal batch before the
-- party, so nobody walks in holding a ticket that was only ever a test.
create function public.gm_delete_coupon_batch(p_password text, p_batch uuid)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count int;
begin
  perform private.check_gm(p_password);

  -- coupon_secrets cascades off the coupons.
  delete from public.coupons where batch = p_batch;
  get diagnostics v_count = row_count;
  if v_count = 0 then
    raise exception 'coupon_batch_not_found';
  end if;

  return v_count;
end
$$;

-- Grants -------------------------------------------------------------------------------------

revoke execute on function private.clean_coupon_code(text) from public, anon, authenticated;

revoke execute on function
  public.redeem_coupon(uuid, uuid, text),
  public.gm_create_coupons(text, int, int, text, int),
  public.gm_batch_codes(text, uuid),
  public.gm_void_claim(text, uuid),
  public.gm_delete_coupon_batch(text, uuid)
from public, anon, authenticated;

grant execute on function
  public.redeem_coupon(uuid, uuid, text),
  public.gm_create_coupons(text, int, int, text, int),
  public.gm_batch_codes(text, uuid),
  public.gm_void_claim(text, uuid),
  public.gm_delete_coupon_batch(text, uuid)
to anon, authenticated;
