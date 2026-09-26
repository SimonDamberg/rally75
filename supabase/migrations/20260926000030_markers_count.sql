-- Marker count on the Topplista (Simon's call). Toppen is total gained for the night: the Mystery
-- Box, the Öl and the Cider stay rank neutral (their price moves from balance to spent, and
-- netWorth adds spent back), but marker are chips for the other games and cost you like a bet.
--
-- So buy_markers now takes the total off the balance alone and leaves spent alone, Ångra on a
-- marker receipt gives the RM back to the balance alone, and the marker already sold tonight are
-- taken back out of spent.
--
-- Mirrored in src/shared/game/economy.ts (economy.test.ts checks this file by string):
--   MARKER_MAX_QTY 100.

create or replace function public.buy_markers(p_player_id uuid, p_token uuid, p_item_id uuid, p_qty int)
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

  -- Not spent: marker count against you on the Topplista.
  update public.players
  set balance = balance - v_total
  where id = p_player_id;

  insert into public.purchases (player_id, item_id, item_name, kind, price, qty)
  values (p_player_id, v_item.id, v_item.name, v_item.kind, v_total, p_qty)
  returning * into v_purchase;

  return v_purchase;
end
$$;

-- Ångra as before, except that a marker receipt was never in spent.
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
      spent = case
        when v_purchase.kind = 'marker' then spent
        else greatest(spent - v_purchase.price, 0)
      end
  where id = v_purchase.player_id;

  delete from public.purchases where id = p_id;

  return v_purchase;
end
$$;

-- The marker already sold come back out of spent, so they count from the start of the night.
update public.players p
set spent = greatest(p.spent - m.total, 0)
from (
  select player_id, sum(price)::int as total
  from public.purchases
  where kind = 'marker'
  group by player_id
) m
where m.player_id = p.id;
