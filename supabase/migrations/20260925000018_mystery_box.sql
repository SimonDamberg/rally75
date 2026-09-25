-- The Butik shrinks to three things: Öl, Cider and a Mystery Box.
--
-- The box opens like a Counter-Strike case. open_box draws the prize on the server in the same
-- transaction that takes the RM and writes the receipt, so the phone only animates a reel that
-- lands on a result it already has (the Plånko pattern). Prizes are real, physical things Simon
-- hands over, each with a count, so a prize leaves the box the moment somebody wins it and the box
-- is sold out when every prize is at 0.
--
-- The draw, mirrored in src/shared/game/box.ts (box.test.ts checks this file by string):
--   1. A rarity tier by fixed weight, over the tiers that still have something left:
--      rarities array['bla', 'lila', 'rosa', 'rod', 'guld'], weights array[60, 25, 10, 4, 1].
--   2. A prize inside that tier, weighted by how many of it are left.
-- When the common tiers run dry the rare ones get likelier. The last box gets whatever is left.
--
-- Still rank neutral: the price moves from balance to spent, exactly like buy_item.
-- gm_reset_night needs no change: prizes survive it like the catalogue (what was won is gone).

-- Catalogue ----------------------------------------------------------------------------------

alter table public.shop_items drop constraint shop_items_kind_check;
alter table public.shop_items
  add constraint shop_items_kind_check check (kind in ('physical', 'digital', 'box')),
  -- A file name under public/butik/. '' draws the fallback tile.
  add column image text not null default '';

create table public.box_prizes (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) > 0),
  blurb text not null default '',
  image text not null default '',
  rarity text not null default 'bla' check (rarity in ('bla', 'lila', 'rosa', 'rod', 'guld')),
  stock int not null default 0 check (stock >= 0),
  sort int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- The receipt snapshots the prize, so it survives the GM renaming or deleting it.
alter table public.purchases
  add column prize_id uuid references public.box_prizes (id) on delete set null,
  add column prize_name text,
  add column prize_rarity text;

alter table public.box_prizes enable row level security;
revoke all on public.box_prizes from public, anon, authenticated;
grant select on public.box_prizes to anon, authenticated;
create policy "public read" on public.box_prizes for select to anon, authenticated using (true);

-- Counts drop on every phone the moment a prize is won.
alter publication supabase_realtime add table public.box_prizes;

-- Randomness ----------------------------------------------------------------------------------

-- Uniform-ish integer in [0, p_n): 32 random bits mod n. The bias is n / 2^32, nothing at party
-- scale.
create function private.random_below(p_n int)
returns int
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_bytes bytea := extensions.gen_random_bytes(4);
begin
  return ((get_byte(v_bytes, 0)::bigint << 24 | get_byte(v_bytes, 1)::bigint << 16
    | get_byte(v_bytes, 2)::bigint << 8 | get_byte(v_bytes, 3)::bigint) % p_n)::int;
end
$$;

-- Guest RPCs ----------------------------------------------------------------------------------

create function public.open_box(p_player_id uuid, p_token uuid, p_item_id uuid)
returns public.purchases
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rarities constant text[] := array['bla', 'lila', 'rosa', 'rod', 'guld'];
  v_weights constant int[] := array[60, 25, 10, 4, 1];
  v_item public.shop_items;
  v_balance int;
  v_left int[] := array[0, 0, 0, 0, 0];
  v_total int := 0;
  v_roll int;
  v_tier text;
  v_prize public.box_prizes;
  v_purchase public.purchases;
begin
  perform private.check_player(p_player_id, p_token);

  -- Lock order: the item, the prizes, then players (the same shape as buy_item).
  select * into v_item from public.shop_items i where i.id = p_item_id for update;
  if not found then
    raise exception 'item_not_found';
  end if;
  if v_item.kind <> 'box' then
    raise exception 'not_a_box';
  end if;
  if not v_item.active then
    raise exception 'item_inactive';
  end if;

  perform 1 from public.box_prizes b where b.active and b.stock > 0 for update;

  for i in 1..5 loop
    v_left[i] := (
      select coalesce(sum(b.stock), 0)::int
      from public.box_prizes b
      where b.active and b.stock > 0 and b.rarity = v_rarities[i]
    );
    if v_left[i] > 0 then
      v_total := v_total + v_weights[i];
    end if;
  end loop;
  if v_total = 0 then
    raise exception 'box_empty';
  end if;

  select p.balance into v_balance from public.players p where p.id = p_player_id for update;
  if v_balance < v_item.price then
    raise exception 'insufficient_balance';
  end if;

  -- 1. The tier, by weight, over the tiers that still have stock.
  v_roll := private.random_below(v_total);
  for i in 1..5 loop
    if v_left[i] > 0 then
      if v_roll < v_weights[i] then
        v_tier := v_rarities[i];
        v_roll := private.random_below(v_left[i]);
        exit;
      end if;
      v_roll := v_roll - v_weights[i];
    end if;
  end loop;

  -- 2. The prize inside the tier, by how many of it are left.
  for v_prize in
    select * from public.box_prizes b
    where b.active and b.stock > 0 and b.rarity = v_tier
    order by b.sort, b.created_at, b.id
  loop
    exit when v_roll < v_prize.stock;
    v_roll := v_roll - v_prize.stock;
  end loop;

  update public.box_prizes set stock = stock - 1 where id = v_prize.id;

  update public.players
  set balance = balance - v_item.price,
      spent = spent + v_item.price
  where id = p_player_id;

  insert into public.purchases (player_id, item_id, item_name, kind, price, prize_id, prize_name, prize_rarity)
  values (p_player_id, v_item.id, v_item.name, v_item.kind, v_item.price, v_prize.id, v_prize.name, v_prize.rarity)
  returning * into v_purchase;

  return v_purchase;
end
$$;

-- buy_item as before, except that a box has to be opened, never bought blind.
create or replace function public.buy_item(p_player_id uuid, p_token uuid, p_item_id uuid)
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

  select * into v_item from public.shop_items i where i.id = p_item_id for update;
  if not found then
    raise exception 'item_not_found';
  end if;
  if v_item.kind = 'box' then
    raise exception 'use_open_box';
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

-- GM RPCs -------------------------------------------------------------------------------------

-- New signature (p_image), so the old one goes rather than living on as an overload.
drop function public.gm_upsert_shop_item(text, uuid, text, text, int, int, text, text, text, int, boolean);

create function public.gm_upsert_shop_item(
  p_password text, p_id uuid, p_name text, p_blurb text, p_price int, p_stock int,
  p_kind text, p_effect text, p_effect_value text, p_sort int, p_active boolean, p_image text
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
  if v_kind not in ('physical', 'digital', 'box') then
    raise exception 'bad_kind';
  end if;
  if v_effect not in ('none', 'title', 'badge') then
    raise exception 'bad_effect';
  end if;

  if p_id is null then
    insert into public.shop_items (name, blurb, price, stock, kind, effect, effect_value, sort, active, image)
    values (
      v_name, btrim(coalesce(p_blurb, '')), p_price, p_stock, v_kind, v_effect,
      btrim(coalesce(p_effect_value, '')), coalesce(p_sort, 0), coalesce(p_active, true),
      btrim(coalesce(p_image, ''))
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
        active = coalesce(p_active, true),
        image = btrim(coalesce(p_image, ''))
    where id = p_id
    returning * into v_item;
    if not found then
      raise exception 'item_not_found';
    end if;
  end if;

  return v_item;
end
$$;

-- p_id null inserts a new prize.
create function public.gm_upsert_box_prize(
  p_password text, p_id uuid, p_name text, p_blurb text, p_image text, p_rarity text,
  p_stock int, p_sort int, p_active boolean
)
returns public.box_prizes
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_prize public.box_prizes;
  v_name text := btrim(coalesce(p_name, ''));
  v_rarity text := coalesce(p_rarity, 'bla');
begin
  perform private.check_gm(p_password);

  if char_length(v_name) = 0 then
    raise exception 'name_empty';
  end if;
  if p_stock is null or p_stock < 0 then
    raise exception 'bad_stock';
  end if;
  if v_rarity not in ('bla', 'lila', 'rosa', 'rod', 'guld') then
    raise exception 'bad_rarity';
  end if;

  if p_id is null then
    insert into public.box_prizes (name, blurb, image, rarity, stock, sort, active)
    values (
      v_name, btrim(coalesce(p_blurb, '')), btrim(coalesce(p_image, '')), v_rarity, p_stock,
      coalesce(p_sort, 0), coalesce(p_active, true)
    )
    returning * into v_prize;
  else
    update public.box_prizes
    set name = v_name,
        blurb = btrim(coalesce(p_blurb, '')),
        image = btrim(coalesce(p_image, '')),
        rarity = v_rarity,
        stock = p_stock,
        sort = coalesce(p_sort, 0),
        active = coalesce(p_active, true)
    where id = p_id
    returning * into v_prize;
    if not found then
      raise exception 'prize_not_found';
    end if;
  end if;

  return v_prize;
end
$$;

create function public.gm_delete_box_prize(p_password text, p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.check_gm(p_password);

  -- purchases.prize_id is "on delete set null"; the receipt keeps its snapshotted prize name.
  delete from public.box_prizes where id = p_id;
  if not found then
    raise exception 'prize_not_found';
  end if;
end
$$;

-- Ångra as before, plus: a box opening puts its prize back in the box.
create or replace function public.gm_refund_purchase(p_password text, p_id uuid)
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

  if v_purchase.prize_id is not null then
    update public.box_prizes set stock = stock + 1 where id = v_purchase.prize_id;
  end if;

  update public.players
  set balance = balance + v_purchase.price,
      spent = greatest(spent - v_purchase.price, 0)
  where id = v_purchase.player_id;

  delete from public.purchases where id = p_id;

  return v_purchase;
end
$$;

-- Seed ----------------------------------------------------------------------------------------

-- Everything but the öl and the cider leaves the shop. Old receipts keep their names
-- (purchases.item_id is "on delete set null"), and titles and badges already bought stay put.
delete from public.shop_items where name not in ('En kall öl', 'Cider för den kräsna');

update public.shop_items
set name = 'Öl', blurb = 'Kall. Hämtas i baren mot kvitto.', image = 'ol.jpg', sort = 20
where name = 'En kall öl';

update public.shop_items
set name = 'Cider', blurb = 'Smakar semester. Kostar som semester.', image = 'cider.jpg', sort = 30
where name = 'Cider för den kräsna';

insert into public.shop_items (name, blurb, price, stock, kind, effect, effect_value, sort, image) values
  ('Mystery Box', 'Vad som helst kan ligga i lådan. Nästan.', 1000, null, 'box', 'none', '', 10, 'box.jpg');

-- Placeholders until Simon has the real list: edit here before db push, or on the control phone.
insert into public.box_prizes (name, blurb, image, rarity, stock, sort) values
  ('Klistermärke med grodan', 'Sätt den var du vill. Inte på Simon.', '', 'bla', 10, 10),
  ('Nyckelring', 'Håller ordning på nycklarna du tappar i kväll.', '', 'bla', 6, 20),
  ('Solglasögon från macken', 'Uv-skydd enligt uppgift.', '', 'lila', 4, 30),
  ('En flaska bubbel', 'Skakas inte. Delas kanske.', '', 'rosa', 2, 40),
  ('Mr Green-keps', 'Grön. Obehagligt grön.', '', 'rod', 1, 50),
  ('Guldkniven', 'En smörkniv, sprayad i guld. Legendarisk.', '', 'guld', 1, 60);

-- Grants --------------------------------------------------------------------------------------

revoke execute on function private.random_below(int) from public, anon, authenticated;

revoke execute on function
  public.open_box(uuid, uuid, uuid),
  public.gm_upsert_shop_item(text, uuid, text, text, int, int, text, text, text, int, boolean, text),
  public.gm_upsert_box_prize(text, uuid, text, text, text, text, int, int, boolean),
  public.gm_delete_box_prize(text, uuid)
from public, anon, authenticated;

grant execute on function
  public.open_box(uuid, uuid, uuid),
  public.gm_upsert_shop_item(text, uuid, text, text, int, int, text, text, text, int, boolean, text),
  public.gm_upsert_box_prize(text, uuid, text, text, text, text, int, int, boolean),
  public.gm_delete_box_prize(text, uuid)
to anon, authenticated;
