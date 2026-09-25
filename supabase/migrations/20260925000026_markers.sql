-- Marker: chips for the physical games (triss, roulette, enarmade banditen), bought in the Butik
-- and handed over by Mr Green in person.
--
-- The marker is a shop_items row of kind 'marker', so the GM edits its price and pauses it on the
-- control phone like the Öl. Unlike the Öl it is bought by the handful: buy_markers takes a
-- quantity, the receipt carries it in purchases.qty and purchases.price is the total paid. Still
-- rank neutral: the total moves from balance to spent, exactly like buy_item.
--
-- A marker receipt is claimed once. claim_markers stamps claimed_at on every unclaimed marker
-- receipt of the player and returns the count, which the phone shows under a rain of RM for Mr
-- Green to count out. claimed_at is the authority: a second press finds nothing to claim.
--
-- Mirrored in src/shared/game/economy.ts (economy.test.ts checks this file by string):
--   MARKER_MAX_QTY 100.
--
-- gm_refund_purchase needs no change: price is the total and the marker's stock is null.

alter table public.shop_items drop constraint shop_items_kind_check;
alter table public.shop_items
  add constraint shop_items_kind_check check (kind in ('physical', 'digital', 'box', 'marker'));

alter table public.purchases
  add column qty int not null default 1 check (qty >= 1),
  -- Set once Mr Green has handed the marker over; null until then. Only for kind 'marker'.
  add column claimed_at timestamptz;

create index purchases_unclaimed_idx on public.purchases (player_id) where claimed_at is null;

-- Guest RPCs ----------------------------------------------------------------------------------

create function public.buy_markers(p_player_id uuid, p_token uuid, p_item_id uuid, p_qty int)
returns public.purchases
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item public.shop_items;
  v_balance int;
  v_total int;
  v_purchase public.purchases;
begin
  perform private.check_player(p_player_id, p_token);

  if p_qty is null or p_qty < 1 or p_qty > 100 then
    raise exception 'bad_qty';
  end if;

  -- Lock order: the item, then players (the same shape as buy_item).
  select * into v_item from public.shop_items i where i.id = p_item_id for update;
  if not found then
    raise exception 'item_not_found';
  end if;
  if v_item.kind <> 'marker' then
    raise exception 'not_markers';
  end if;
  if not v_item.active then
    raise exception 'item_inactive';
  end if;
  if v_item.stock is not null and v_item.stock < p_qty then
    raise exception 'out_of_stock';
  end if;

  v_total := v_item.price * p_qty;

  select p.balance into v_balance from public.players p where p.id = p_player_id for update;
  if v_balance < v_total then
    raise exception 'insufficient_balance';
  end if;

  if v_item.stock is not null then
    update public.shop_items set stock = stock - p_qty where id = v_item.id;
  end if;

  update public.players
  set balance = balance - v_total,
      spent = spent + v_total
  where id = p_player_id;

  insert into public.purchases (player_id, item_id, item_name, kind, price, qty)
  values (p_player_id, v_item.id, v_item.name, v_item.kind, v_total, p_qty)
  returning * into v_purchase;

  return v_purchase;
end
$$;

-- Press only in front of Mr Green. Claims every unclaimed marker receipt at once.
create function public.claim_markers(p_player_id uuid, p_token uuid)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count int;
  v_now timestamptz := now();
begin
  perform private.check_player(p_player_id, p_token);

  -- The player row serialises two presses from two tabs.
  perform 1 from public.players p where p.id = p_player_id for update;

  with claimed as (
    update public.purchases
    set claimed_at = v_now
    where player_id = p_player_id and kind = 'marker' and claimed_at is null
    returning qty
  )
  select coalesce(sum(qty), 0)::int into v_count from claimed;

  if v_count = 0 then
    raise exception 'nothing_to_claim';
  end if;

  return json_build_object('count', v_count, 'claimed_at', v_now);
end
$$;

-- buy_item as before, except that markers are bought by the handful with buy_markers.
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
  if v_item.kind = 'marker' then
    raise exception 'use_buy_markers';
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

-- As in *_mystery_box.sql, plus the 'marker' kind.
create or replace function public.gm_upsert_shop_item(
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
  if v_kind not in ('physical', 'digital', 'box', 'marker') then
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

-- Seed ----------------------------------------------------------------------------------------

insert into public.shop_items (name, blurb, price, stock, kind, effect, effect_value, sort, image)
select 'Marker', 'Till triss, roulette och enarmade banditen.', 10, null, 'marker', 'none', '', 25, 'marker.png'
where not exists (select 1 from public.shop_items where kind = 'marker');

-- Grants --------------------------------------------------------------------------------------

revoke execute on function
  public.buy_markers(uuid, uuid, uuid, int),
  public.claim_markers(uuid, uuid)
from public, anon, authenticated;

grant execute on function
  public.buy_markers(uuid, uuid, uuid, int),
  public.claim_markers(uuid, uuid)
to anon, authenticated;
