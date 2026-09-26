-- Printed kuponger leave the Topplista (Simon's call). The score is total gained: Rally75, Plånko
-- and vinstkort winnings, minus LOAN_AMOUNT per Snabblån, minus the marker. A printed kupong still
-- pays into balance, but players.coupon_rm keeps the running total so netWorth can take it back
-- off (src/shared/game/economy.ts).
--
-- Kept by redeem_coupon (plus the amount) and gm_void_claim (minus it). Everything else in both
-- functions is as in *_coupons.sql.

alter table public.players
  add column coupon_rm int not null default 0 check (coupon_rm >= 0);

create or replace function public.redeem_coupon(p_player_id uuid, p_token uuid, p_code text)
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

  update public.players
  set balance = balance + v_coupon.amount,
      coupon_rm = coupon_rm + v_coupon.amount
  where id = p_player_id;

  return v_coupon;
end
$$;

create or replace function public.gm_void_claim(p_password text, p_id uuid)
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
    set balance = greatest(balance - v_coupon.amount, 0),
        coupon_rm = greatest(coupon_rm - v_coupon.amount, 0)
    where id = v_coupon.redeemed_by;
  end if;

  update public.coupons
  set redeemed_by = null, redeemed_at = null
  where id = p_id
  returning * into v_coupon;

  return v_coupon;
end
$$;

-- The tickets already scanned tonight.
update public.players p
set coupon_rm = c.total
from (
  select redeemed_by, sum(amount)::int as total
  from public.coupons
  where redeemed_at is not null and redeemed_by is not null
  group by redeemed_by
) c
where c.redeemed_by = p.id;
