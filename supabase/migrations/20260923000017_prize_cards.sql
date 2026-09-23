-- Vinstkort: reusable prize cards, scanned inside the Mr Green app.
--
-- Next to the one-time kuponger (which stay exactly as they are), each friend running a physical
-- game carries one printed card worth 100, 500 or 1 000 RM and flashes it at whoever just won. The
-- winner scans it with the scanner inside the guest app, and the RM lands. A card is never used up:
-- the same card pays the next winner, and the one after that.
--
-- The security model, stated honestly:
--
-- 1. The server cannot tell a real camera scan from a replayed string. The in-app scanner is
--    friction, not a lock: the QR holds "MRG1:<code>" rather than a URL, so a phone's camera app
--    does nothing useful with it, and the app never shows the decoded code.
-- 2. The code never reaches a browser through the database. Plaintext lives in prize_card_secrets,
--    which has no grants and no policies (the coupon_secrets pattern) and is not in the Realtime
--    publication. public.prize_cards carries tier, amount, label and the on/off switch only.
-- 3. A guest can claim at most once every five seconds, across all cards (PRIZE_CARD_COOLDOWN_S 5.).
--    That stops a double scan of one flash; it does not stop farming by someone who photographed a
--    card.
-- 4. For that there is the GM: every card can be switched off, or given a new code (which kills
--    every photo of the old one), and every claim can be taken back with Ångra. The GM feed shows
--    claims per guest, so a farmer is visible.
--
-- The value is fixed by the tier (100 / 500 / 1 000), not sent by the GM page, so no card can be
-- minted for more. Mirrored in src/shared/game/economy.ts: PRIZE_CARD_TIERS, PRIZE_CARD_COOLDOWN_S.
--
-- Like a kupong, a claim is *not* rank neutral: the RM lands in players.balance alone.
--
-- gm_reset_night needs no change: claims cascade off the deleted players, and the cards survive the
-- way kuponger, the Butik catalogue and the kuskar do (they are physical objects in the room).

-- Tables ------------------------------------------------------------------------------------

create table public.prize_cards (
  id uuid primary key default gen_random_uuid(),
  -- 1 = 100, 2 = 500, 3 = 1 000. The pair is checked here so no row can drift from the table.
  tier int not null check (tier between 1 and 3),
  amount int not null,
  -- Which game carries it ("Dart"), printed on the card and shown in the GM feed.
  label text not null default '' check (char_length(label) <= 24),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  check ((tier, amount) in ((1, 100), (2, 500), (3, 1000)))
);

-- No grants, no policies: see point 2 of the header.
create table public.prize_card_secrets (
  code text primary key,
  card_id uuid not null unique references public.prize_cards (id) on delete cascade
);

create table public.prize_claims (
  id uuid primary key default gen_random_uuid(),
  -- set null, not cascade: deleting a card must not erase tonight's payouts from the GM feed.
  card_id uuid references public.prize_cards (id) on delete set null,
  player_id uuid not null references public.players (id) on delete cascade,
  -- Snapshots, so the feed and the iPad toast still read right after the card is deleted.
  tier int not null,
  amount int not null,
  label text not null,
  created_at timestamptz not null default now()
);
create index prize_claims_player_idx on public.prize_claims (player_id, created_at desc);
create index prize_claims_created_idx on public.prize_claims (created_at desc);
create index prize_claims_card_idx on public.prize_claims (card_id);

-- RLS and grants ----------------------------------------------------------------------------

alter table public.prize_cards enable row level security;
alter table public.prize_card_secrets enable row level security;
alter table public.prize_claims enable row level security;

revoke all on public.prize_cards, public.prize_card_secrets, public.prize_claims
from public, anon, authenticated;

grant select on public.prize_cards, public.prize_claims to anon, authenticated;

create policy "public read" on public.prize_cards for select to anon, authenticated using (true);
create policy "public read" on public.prize_claims for select to anon, authenticated using (true);

-- Realtime ----------------------------------------------------------------------------------

-- The iPad toasts each claim and the GM page keeps its counts live. Never the secrets table.
alter publication supabase_realtime add table public.prize_cards, public.prize_claims;

-- Helpers -----------------------------------------------------------------------------------

create function private.prize_card_amount(p_tier int)
returns int
language sql
immutable
set search_path = ''
as $$
  select case p_tier when 1 then 100 when 2 then 500 when 3 then 1000 end;
$$;

-- A fresh code nobody has, the same alphabet and draw as a kupong code.
create function private.new_prize_card_code()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_alphabet constant text := '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  v_bytes bytea;
  v_try text;
begin
  for attempt in 1..20 loop
    -- One byte per character. 256 is a multiple of 32, so the modulo is unbiased.
    v_bytes := extensions.gen_random_bytes(8);
    v_try := '';
    for b in 0..7 loop
      v_try := v_try || substr(v_alphabet, (get_byte(v_bytes, b) % 32) + 1, 1);
    end loop;
    if not exists (select 1 from public.prize_card_secrets s where s.code = v_try) then
      return v_try;
    end if;
  end loop;
  raise exception 'card_code_failed';
end
$$;

-- Guest RPC ---------------------------------------------------------------------------------

create function public.claim_prize_card(p_player_id uuid, p_token uuid, p_code text)
returns public.prize_claims
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code text;
  v_card public.prize_cards;
  v_claim public.prize_claims;
begin
  perform private.check_player(p_player_id, p_token);

  -- The same forgiving clean-up as a kupong code, so a hand-typed code would work too.
  v_code := private.clean_coupon_code(p_code);
  if char_length(v_code) = 0 then
    raise exception 'card_not_found';
  end if;

  select c.* into v_card
  from public.prize_card_secrets s
  join public.prize_cards c on c.id = s.card_id
  where s.code = v_code;
  if not found then
    raise exception 'card_not_found';
  end if;
  if not v_card.active then
    raise exception 'card_inactive';
  end if;

  -- Lock the player first: two scans from the same phone in the same instant serialise here, and
  -- the second one sees the first one's claim below.
  perform 1 from public.players p where p.id = p_player_id for update;

  if exists (
    select 1 from public.prize_claims pc
    where pc.player_id = p_player_id and pc.created_at > now() - interval '5 seconds'
  ) then
    raise exception 'card_cooldown';
  end if;

  insert into public.prize_claims (card_id, player_id, tier, amount, label)
  values (v_card.id, p_player_id, v_card.tier, v_card.amount, v_card.label)
  returning * into v_claim;

  update public.players set balance = balance + v_card.amount where id = p_player_id;

  return v_claim;
end
$$;

-- GM RPCs -----------------------------------------------------------------------------------

-- Mints one card and hands back its plaintext code, for printing.
create function public.gm_create_prize_card(p_password text, p_tier int, p_label text)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_code text;
begin
  perform private.check_gm(p_password);

  if p_tier is null or p_tier not between 1 and 3 then
    raise exception 'bad_card_tier';
  end if;

  insert into public.prize_cards (tier, amount, label)
  values (p_tier, private.prize_card_amount(p_tier), left(btrim(coalesce(p_label, '')), 24))
  returning id into v_id;

  v_code := private.new_prize_card_code();
  insert into public.prize_card_secrets (code, card_id) values (v_code, v_id);

  return json_build_object('id', v_id, 'code', v_code);
end
$$;

-- Reads a card's code back out, for reprinting it.
create function public.gm_prize_card_code(p_password text, p_id uuid)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code text;
begin
  perform private.check_gm(p_password);

  select s.code into v_code from public.prize_card_secrets s where s.card_id = p_id;
  if not found then
    raise exception 'card_not_found';
  end if;

  return json_build_object('id', p_id, 'code', v_code);
end
$$;

-- Ny kod: the card leaked (photographed, posted in a chat). The old code stops working at once, and
-- the card has to be printed again.
create function public.gm_rotate_prize_card(p_password text, p_id uuid)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code text;
begin
  perform private.check_gm(p_password);

  perform 1 from public.prize_cards c where c.id = p_id for update;
  if not found then
    raise exception 'card_not_found';
  end if;

  v_code := private.new_prize_card_code();
  update public.prize_card_secrets set code = v_code where card_id = p_id;

  return json_build_object('id', p_id, 'code', v_code);
end
$$;

-- Pausa / Aktivera.
create function public.gm_set_prize_card_active(p_password text, p_id uuid, p_active boolean)
returns public.prize_cards
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_card public.prize_cards;
begin
  perform private.check_gm(p_password);

  update public.prize_cards set active = coalesce(p_active, false)
  where id = p_id
  returning * into v_card;
  if not found then
    raise exception 'card_not_found';
  end if;

  return v_card;
end
$$;

-- Throws a card away, code and all. Its claims stay in the feed with the snapshot label.
create function public.gm_delete_prize_card(p_password text, p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.check_gm(p_password);

  delete from public.prize_cards where id = p_id;
  if not found then
    raise exception 'card_not_found';
  end if;
end
$$;

-- Ångra: the wrong guest scanned, or someone farmed a photo. Takes the RM back and deletes the claim.
create function public.gm_void_prize_claim(p_password text, p_id uuid)
returns public.prize_claims
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_claim public.prize_claims;
begin
  perform private.check_gm(p_password);

  delete from public.prize_claims where id = p_id returning * into v_claim;
  if not found then
    raise exception 'prize_claim_not_found';
  end if;

  -- greatest(): the RM may already be on a horse. Same call as gm_void_claim for kuponger.
  update public.players
  set balance = greatest(balance - v_claim.amount, 0)
  where id = v_claim.player_id;

  return v_claim;
end
$$;

-- Grants -------------------------------------------------------------------------------------

revoke execute on function
  private.prize_card_amount(int),
  private.new_prize_card_code()
from public, anon, authenticated;

revoke execute on function
  public.claim_prize_card(uuid, uuid, text),
  public.gm_create_prize_card(text, int, text),
  public.gm_prize_card_code(text, uuid),
  public.gm_rotate_prize_card(text, uuid),
  public.gm_set_prize_card_active(text, uuid, boolean),
  public.gm_delete_prize_card(text, uuid),
  public.gm_void_prize_claim(text, uuid)
from public, anon, authenticated;

grant execute on function
  public.claim_prize_card(uuid, uuid, text),
  public.gm_create_prize_card(text, int, text),
  public.gm_prize_card_code(text, uuid),
  public.gm_rotate_prize_card(text, uuid),
  public.gm_set_prize_card_active(text, uuid, boolean),
  public.gm_delete_prize_card(text, uuid),
  public.gm_void_prize_claim(text, uuid)
to anon, authenticated;
