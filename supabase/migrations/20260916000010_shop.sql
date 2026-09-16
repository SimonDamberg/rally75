-- Butiken: the black market.
--
-- Until now RM only ever flowed one way. You won it, lost it or borrowed it, and at the end of the
-- night the number on the Topplista was all it had ever been worth. This lets guests spend it:
-- physical things Simon actually hands over at the party (a beer, a shot, the right to pick the
-- next song) and digital nonsense that exists only as a receipt.
--
-- Two deliberate non-features:
--
-- 1. No fulfilment state machine. A purchase is a receipt, not an order with a status. The guest
--    shows the phone, Simon hands over the beer. The control phone sees a live feed and can undo a
--    purchase with gm_refund_purchase; nothing has to be kept in sync with reality.
-- 2. Buying never changes your rank. players.spent grows by exactly what balance loses, and
--    netWorth (src/shared/game/economy.ts) adds spent back, so a round of beers cannot cost you a
--    place on the Topplista, the same way repay_debt cannot buy you one. Spending shows up on its
--    own list ("Kvällens största slösare"), which ranks on spent.
--
-- Digital items are jokes or cosmetics only: an item may set players.title or players.badge, and
-- that is the whole of what an item can do. Nothing here touches odds, bets or the welcome bonus.
--
-- gm_reset_night needs no change: it deletes players, and purchases cascades off them. Shop items
-- survive the reset the way kuskar do, so the catalogue is set up once and reused.

-- Players -----------------------------------------------------------------------------------

alter table public.players
  add column spent int not null default 0 check (spent >= 0),
  add column title text not null default '',
  add column badge text not null default '';

-- Shop --------------------------------------------------------------------------------------

create table public.shop_items (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) > 0),
  blurb text not null default '',
  price int not null check (price >= 0),
  -- null = obegränsat. A number counts down and the item reads "Slutsålt" at 0.
  stock int check (stock is null or stock >= 0),
  kind text not null default 'physical' check (kind in ('physical', 'digital')),
  -- What buying it grants, beyond the receipt. Never anything that touches the game.
  effect text not null default 'none' check (effect in ('none', 'title', 'badge')),
  effect_value text not null default '',
  sort int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.purchases (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players (id) on delete cascade,
  item_id uuid references public.shop_items (id) on delete set null,
  -- Snapshots: the receipt has to survive the GM renaming, repricing or deleting the item.
  item_name text not null,
  kind text not null,
  price int not null check (price >= 0),
  created_at timestamptz not null default now()
);
create index purchases_player_id_idx on public.purchases (player_id);
create index purchases_created_at_idx on public.purchases (created_at desc);

-- RLS and grants ----------------------------------------------------------------------------

alter table public.shop_items enable row level security;
alter table public.purchases enable row level security;

revoke all on public.shop_items, public.purchases from public, anon, authenticated;

grant select on public.shop_items, public.purchases to anon, authenticated;

create policy "public read" on public.shop_items for select to anon, authenticated using (true);
create policy "public read" on public.purchases for select to anon, authenticated using (true);

-- Realtime ----------------------------------------------------------------------------------

-- shop_items so stock drops on every phone at once, purchases so the control phone's feed and the
-- display iPad's toasts fill themselves.
alter publication supabase_realtime add table public.shop_items, public.purchases;

-- Guest RPC ---------------------------------------------------------------------------------

create function public.buy_item(p_player_id uuid, p_token uuid, p_item_id uuid)
returns public.purchases
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item public.shop_items;
  v_balance int;
  v_purchase public.purchases;
begin
  perform private.check_player(p_player_id, p_token);

  -- Lock order everywhere: the item, then players (place_bet locks the race, then players).
  select * into v_item from public.shop_items i where i.id = p_item_id for update;
  if not found then
    raise exception 'item_not_found';
  end if;
  if not v_item.active then
    raise exception 'item_inactive';
  end if;
  if v_item.stock is not null and v_item.stock < 1 then
    raise exception 'out_of_stock';
  end if;

  select p.balance into v_balance from public.players p where p.id = p_player_id for update;
  if v_balance < v_item.price then
    raise exception 'insufficient_balance';
  end if;

  if v_item.stock is not null then
    update public.shop_items set stock = stock - 1 where id = v_item.id;
  end if;

  update public.players
  set balance = balance - v_item.price,
      spent = spent + v_item.price,
      title = case when v_item.effect = 'title' then v_item.effect_value else title end,
      badge = case when v_item.effect = 'badge' then v_item.effect_value else badge end
  where id = p_player_id;

  insert into public.purchases (player_id, item_id, item_name, kind, price)
  values (p_player_id, v_item.id, v_item.name, v_item.kind, v_item.price)
  returning * into v_purchase;

  return v_purchase;
end
$$;

-- GM RPCs -----------------------------------------------------------------------------------

-- p_id null inserts a new item. p_stock null means obegränsat, not "leave it alone".
create function public.gm_upsert_shop_item(
  p_password text, p_id uuid, p_name text, p_blurb text, p_price int, p_stock int,
  p_kind text, p_effect text, p_effect_value text, p_sort int, p_active boolean
)
returns public.shop_items
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item public.shop_items;
  v_name text := btrim(coalesce(p_name, ''));
  v_kind text := coalesce(p_kind, 'physical');
  v_effect text := coalesce(p_effect, 'none');
begin
  perform private.check_gm(p_password);

  if char_length(v_name) = 0 then
    raise exception 'name_empty';
  end if;
  if p_price is null or p_price < 0 then
    raise exception 'bad_price';
  end if;
  if p_stock is not null and p_stock < 0 then
    raise exception 'bad_stock';
  end if;
  if v_kind not in ('physical', 'digital') then
    raise exception 'bad_kind';
  end if;
  if v_effect not in ('none', 'title', 'badge') then
    raise exception 'bad_effect';
  end if;

  if p_id is null then
    insert into public.shop_items (name, blurb, price, stock, kind, effect, effect_value, sort, active)
    values (
      v_name, btrim(coalesce(p_blurb, '')), p_price, p_stock, v_kind, v_effect,
      btrim(coalesce(p_effect_value, '')), coalesce(p_sort, 0), coalesce(p_active, true)
    )
    returning * into v_item;
  else
    update public.shop_items
    set name = v_name,
        blurb = btrim(coalesce(p_blurb, '')),
        price = p_price,
        stock = p_stock,
        kind = v_kind,
        effect = v_effect,
        effect_value = btrim(coalesce(p_effect_value, '')),
        sort = coalesce(p_sort, 0),
        active = coalesce(p_active, true)
    where id = p_id
    returning * into v_item;
    if not found then
      raise exception 'item_not_found';
    end if;
  end if;

  return v_item;
end
$$;

create function public.gm_delete_shop_item(p_password text, p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.check_gm(p_password);

  -- purchases.item_id is "on delete set null", so old receipts keep their snapshotted name.
  delete from public.shop_items where id = p_id;
  if not found then
    raise exception 'item_not_found';
  end if;
end
$$;

-- Ångra: the beer ran out, the tap broke, the guest tapped twice. Gives the RM back, takes it off
-- spent so the slösare list stays honest, and puts one back on the shelf if the item counts stock.
-- A title or badge the purchase granted is deliberately left alone: once given, it stays.
create function public.gm_refund_purchase(p_password text, p_id uuid)
returns public.purchases
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_purchase public.purchases;
begin
  perform private.check_gm(p_password);

  select * into v_purchase from public.purchases p where p.id = p_id for update;
  if not found then
    raise exception 'purchase_not_found';
  end if;

  if v_purchase.item_id is not null then
    update public.shop_items
    set stock = stock + 1
    where id = v_purchase.item_id and stock is not null;
  end if;

  update public.players
  set balance = balance + v_purchase.price,
      spent = greatest(spent - v_purchase.price, 0)
  where id = v_purchase.player_id;

  delete from public.purchases where id = p_id;

  return v_purchase;
end
$$;

-- Seed ---------------------------------------------------------------------------------------

-- A catalogue to edit, not a decision. Everything here is editable from the Butik tab on the
-- control phone, and prices should be set against what the fridge actually holds.
insert into public.shop_items (name, blurb, price, stock, kind, effect, effect_value, sort) values
  ('En kall öl', 'Hämtas i baren. Kvitto visas upp, inga frågor ställs.', 500, 24, 'physical', 'none', '', 10),
  ('Cider för den kräsna', 'Smakar semester. Kostar som semester.', 500, 12, 'physical', 'none', '', 20),
  ('Shot av oklar härkomst', 'Ingen etikett, inget ansvar, ingen återbetalning.', 750, 20, 'physical', 'none', '', 30),
  ('Alkoholfritt, ingen dömer högt', 'Vi dömer tyst, som proffs.', 250, 12, 'physical', 'none', '', 40),
  ('Egen skål chips', 'Din egen. Ingen annan får ta.', 400, 8, 'physical', 'none', '', 50),
  ('Vitlöksbröd ur ugnen', 'Varmt, fett och värt varenda mynt.', 600, 6, 'physical', 'none', '', 60),
  ('Välj nästa låt', 'Makten korrumperar. Använd den.', 1000, null, 'physical', 'none', '', 70),
  ('Simon tar en shot på din order', 'Spelledaren lyder marknaden.', 2500, 5, 'physical', 'none', '', 80),
  ('Tio minuter i Simons fåtölj', 'Den fina. Tiden räknas av hovpersonalen.', 2000, 3, 'physical', 'none', '', 90),
  ('Sista ölen i kylen', 'Finns i ett (1) exemplar. Auktionsläge råder.', 4000, 1, 'physical', 'none', '', 100),
  ('Certifikat: Ansvarsfullt Spelande', 'Utfärdat av oss, till dig, utan täckning.', 100, null, 'digital', 'none', '', 200),
  ('Ett (1) ursäktande mejl från Rally Holdings', 'Skickas aldrig. Känslan är ändå värd något.', 150, null, 'digital', 'none', '', 210),
  ('Leffes säkra tips', 'Levereras direkt efter loppet, garanterat korrekt.', 500, null, 'digital', 'none', '', 220),
  ('Elden bredvid namnet', 'Brinner på topplistan hela natten.', 1000, null, 'digital', 'badge', '🔥', 230),
  ('Titeln Kvällens Kusk', 'Ingen har valt dig. Du köpte den. Ingen behöver veta.', 1500, null, 'digital', 'title', 'Kvällens Kusk', 240),
  ('Guldkronan bredvid namnet', 'Tyngre än den ser ut. Syns på topplistan.', 2000, null, 'digital', 'badge', '👑', 250),
  ('NFT av en häst du inte äger', 'Du äger länken till bilden på hästen. Ungefär.', 3000, null, 'digital', 'none', '', 260),
  ('Titeln VIP Platinum Diamant Elit', 'Högsta nivån. Det finns inga förmåner.', 3000, null, 'digital', 'title', 'VIP Platinum Diamant Elit', 270),
  ('Vår uppriktiga respekt', 'Den enda varan vi faktiskt menar.', 9999, null, 'digital', 'none', '', 280);

-- Grants -------------------------------------------------------------------------------------

revoke execute on function
  public.buy_item(uuid, uuid, uuid),
  public.gm_upsert_shop_item(text, uuid, text, text, int, int, text, text, text, int, boolean),
  public.gm_delete_shop_item(text, uuid),
  public.gm_refund_purchase(text, uuid)
from public, anon, authenticated;

grant execute on function
  public.buy_item(uuid, uuid, uuid),
  public.gm_upsert_shop_item(text, uuid, text, text, int, int, text, text, text, int, boolean),
  public.gm_delete_shop_item(text, uuid),
  public.gm_refund_purchase(text, uuid)
to anon, authenticated;
