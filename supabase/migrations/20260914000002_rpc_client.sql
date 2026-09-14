-- Private helpers and guest RPCs.
-- Errors are raised as stable codes (message = code); src/lib/errors.ts maps them to Swedish.
-- Economy constants mirror src/shared/game/economy.ts:
--   WELCOME_BONUS 1000, MIN_STAKE 10, LOAN_AMOUNT 500, LOAN_DEBT 1337, MAX_NAME_LENGTH 24.

-- Helpers ---------------------------------------------------------------------------------

-- Mirrors computeOdds + roundOdds (src/shared/game/odds.ts) in float8, summing in array order
-- so the IEEE arithmetic is identical. Returns rounded odds aligned with the inputs.
create function private.compute_odds(p_base float8[], p_pools int[])
returns numeric[]
language plpgsql
immutable
set search_path = ''
as $$
declare
  n int := coalesce(array_length(p_base, 1), 0);
  virtual_pool constant float8 := 700;
  takeout constant float8 := 0.87;
  min_odds constant float8 := 1.15;
  max_odds constant float8 := 80;
  eps constant float8 := 2.220446049250313e-16;
  impl_sum float8 := 0;
  total float8 := 0;
  eff float8[] := '{}'::float8[];
  o float8;
  res numeric[] := '{}'::numeric[];
begin
  for i in 1..n loop
    impl_sum := impl_sum + (1::float8 / p_base[i]);
  end loop;
  for i in 1..n loop
    eff := eff || (virtual_pool * ((1::float8 / p_base[i]) / impl_sum) + coalesce(p_pools[i], 0)::float8);
  end loop;
  for i in 1..n loop
    total := total + eff[i];
  end loop;
  for i in 1..n loop
    o := least(max_odds, greatest(min_odds, takeout / (eff[i] / total)));
    -- Math.round(x) == floor(x + 0.5) exactly for this range.
    o := floor((o + eps) * 100::float8 + 0.5::float8) / 100::float8;
    res := res || round(o::numeric, 2);
  end loop;
  return res;
end
$$;

-- Current rounded odds for a race: base odds from the field, pools from open bets.
create function private.race_odds(p_race_id uuid)
returns numeric[]
language sql
stable
set search_path = ''
as $$
  select private.compute_odds(
    array_agg((f.h ->> 'baseOdds')::float8 order by f.ord),
    array_agg(coalesce(p.total, 0)::int order by f.ord)
  )
  from public.races r
  cross join lateral jsonb_array_elements(r.field) with ordinality as f(h, ord)
  left join (
    select b.horse_n, sum(b.stake) as total
    from public.bets b
    where b.race_id = p_race_id and b.status = 'open'
    group by b.horse_n
  ) p on p.horse_n = (f.h ->> 'n')::int
  where r.id = p_race_id
$$;

create function private.check_player(p_player_id uuid, p_token uuid)
returns void
language plpgsql
stable
set search_path = ''
as $$
declare
  v_token uuid;
begin
  select s.token into v_token from public.player_secrets s where s.player_id = p_player_id;
  if not found then
    raise exception 'player_not_found';
  end if;
  if p_token is null or v_token <> p_token then
    raise exception 'invalid_token';
  end if;
end
$$;

-- Trims, collapses whitespace and validates a player name.
create function private.clean_name(p_name text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  v text := btrim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g'));
begin
  if char_length(v) = 0 then
    raise exception 'name_empty';
  end if;
  if char_length(v) > 24 then
    raise exception 'name_too_long';
  end if;
  return v;
end
$$;

-- Guest RPCs ------------------------------------------------------------------------------

create function public.create_player(p_name text)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := private.clean_name(p_name);
  v_tag int;
  v_id uuid;
  v_token uuid;
begin
  for attempt in 1..20 loop
    v_tag := 10 + floor(random() * 90)::int;
    exit when not exists (
      select 1 from public.players p where lower(p.name) = lower(v_name) and p.tag = v_tag
    );
  end loop;

  insert into public.players (name, tag, balance) values (v_name, v_tag, 1000)
  returning id into v_id;
  insert into public.player_secrets (player_id) values (v_id)
  returning token into v_token;

  return json_build_object('id', v_id, 'token', v_token, 'tag', v_tag);
end
$$;

create function public.place_bet(
  p_player_id uuid,
  p_token uuid,
  p_race_id uuid,
  p_horse_n int,
  p_stake int
)
returns public.bets
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_race public.races;
  v_active uuid;
  v_idx int;
  v_balance int;
  v_odds numeric[];
  v_bet public.bets;
begin
  perform private.check_player(p_player_id, p_token);

  -- Lock order everywhere: race, then players.
  select * into v_race from public.races r where r.id = p_race_id for share;
  if not found then
    raise exception 'race_not_found';
  end if;
  select g.active_race_id into v_active from public.game_state g where g.id;
  if v_race.status <> 'betting' or v_active is distinct from v_race.id then
    raise exception 'race_not_betting';
  end if;

  select f.ord into v_idx
  from jsonb_array_elements(v_race.field) with ordinality as f(h, ord)
  where (f.h ->> 'n')::int = p_horse_n;
  if v_idx is null then
    raise exception 'horse_not_found';
  end if;

  if p_stake is null or p_stake < 10 then
    raise exception 'stake_too_low';
  end if;

  select p.balance into v_balance from public.players p where p.id = p_player_id for update;
  if v_balance < p_stake then
    raise exception 'insufficient_balance';
  end if;

  -- Odds are captured before this bet joins the pool.
  v_odds := private.race_odds(p_race_id);

  insert into public.bets (player_id, race_id, horse_n, stake, odds)
  values (p_player_id, p_race_id, p_horse_n, p_stake, v_odds[v_idx])
  returning * into v_bet;

  update public.players set balance = balance - p_stake where id = p_player_id;

  return v_bet;
end
$$;

-- Snabblån: only when the player cannot afford the minimum stake.
create function public.take_loan(p_player_id uuid, p_token uuid)
returns public.players
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_player public.players;
begin
  perform private.check_player(p_player_id, p_token);

  select * into v_player from public.players p where p.id = p_player_id for update;
  if v_player.balance >= 10 then
    raise exception 'loan_not_allowed';
  end if;

  update public.players
  set balance = balance + 500, debt = debt + 1337, loans_taken = loans_taken + 1
  where id = p_player_id
  returning * into v_player;

  return v_player;
end
$$;

-- Pure odds calculation, public so clients and the smoke test can check SQL/TS parity.
create function public.compute_odds(p_base_odds float8[], p_pools int[])
returns numeric[]
language sql
immutable
security definer
set search_path = ''
as $$
  select private.compute_odds(p_base_odds, p_pools)
$$;

-- Grants ----------------------------------------------------------------------------------

revoke execute on function
  private.compute_odds(float8[], int[]),
  private.race_odds(uuid),
  private.check_player(uuid, uuid),
  private.clean_name(text)
from public, anon, authenticated;

revoke execute on function
  public.create_player(text),
  public.place_bet(uuid, uuid, uuid, int, int),
  public.take_loan(uuid, uuid),
  public.compute_odds(float8[], int[])
from public, anon, authenticated;

grant execute on function
  public.create_player(text),
  public.place_bet(uuid, uuid, uuid, int, int),
  public.take_loan(uuid, uuid),
  public.compute_odds(float8[], int[])
to anon, authenticated;
