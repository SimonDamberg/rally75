-- Game master RPCs. Every one takes the GM password first and checks it server-side.
-- Password is set with supabase/snippets/set_gm_password.sql.

-- Helpers ---------------------------------------------------------------------------------

create function private.check_gm(p_password text)
returns void
language plpgsql
stable
set search_path = ''
as $$
declare
  v_hash text;
begin
  select a.password_hash into v_hash from public.gm_auth a where a.id;
  if v_hash is null then
    raise exception 'gm_no_password';
  end if;
  if p_password is null or extensions.crypt(p_password, v_hash) <> v_hash then
    raise exception 'gm_unauthorized';
  end if;
end
$$;

-- Validates a race card: field = HorsePublic[], stats = HorseStats[] with the same numbers.
create function private.check_card(p_field jsonb, p_stats jsonb, p_dist text, p_cond text)
returns void
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_field_ns int[];
  v_stats_ns int[];
begin
  if p_field is null or jsonb_typeof(p_field) <> 'array' or jsonb_array_length(p_field) < 2
     or p_stats is null or jsonb_typeof(p_stats) <> 'array'
     or p_dist is null or p_cond is null then
    raise exception 'invalid_field';
  end if;

  if exists (
    select 1 from jsonb_array_elements(p_field) h
    where jsonb_typeof(h -> 'n') is distinct from 'number'
       or jsonb_typeof(h -> 'baseOdds') is distinct from 'number'
       or (h ->> 'baseOdds')::float8 <= 0
       or jsonb_typeof(h -> 'name') is distinct from 'string'
  ) then
    raise exception 'invalid_field';
  end if;

  select array_agg((h ->> 'n')::int order by (h ->> 'n')::int) into v_field_ns
  from jsonb_array_elements(p_field) h;
  select array_agg((s ->> 'n')::int order by (s ->> 'n')::int) into v_stats_ns
  from jsonb_array_elements(p_stats) s;

  if v_field_ns is distinct from v_stats_ns
     or (select count(distinct x) from unnest(v_field_ns) x) <> cardinality(v_field_ns) then
    raise exception 'invalid_field';
  end if;
end
$$;

-- Auth ------------------------------------------------------------------------------------

create function public.gm_login(p_password text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.check_gm(p_password);
  return true;
end
$$;

-- Races -----------------------------------------------------------------------------------

-- Creates the next race and makes it active. A paddock race is replaced (it has no bets);
-- a race that is betting, closed or running must be settled or voided first.
create function public.gm_create_race(
  p_password text,
  p_field jsonb,
  p_stats jsonb,
  p_seed int,
  p_dist text,
  p_cond text
)
returns public.races
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_active uuid;
  v_status text;
  v_race public.races;
begin
  perform private.check_gm(p_password);
  perform private.check_card(p_field, p_stats, p_dist, p_cond);
  if p_seed is null then
    raise exception 'invalid_field';
  end if;

  select g.active_race_id into v_active from public.game_state g where g.id for update;
  if v_active is not null then
    select r.status into v_status from public.races r where r.id = v_active for update;
    if v_status = 'paddock' then
      delete from public.races where id = v_active;
    elsif v_status not in ('finished', 'void') then
      raise exception 'race_in_progress';
    end if;
  end if;

  insert into public.races (race_no, dist, cond, field)
  values ((select coalesce(max(r.race_no), 0) + 1 from public.races r), p_dist, p_cond, p_field)
  returning * into v_race;
  insert into public.race_secrets (race_id, stats, seed) values (v_race.id, p_stats, p_seed);
  update public.game_state set active_race_id = v_race.id where id;

  return v_race;
end
$$;

create function public.gm_reroll_race(
  p_password text,
  p_race_id uuid,
  p_field jsonb,
  p_stats jsonb,
  p_seed int,
  p_dist text,
  p_cond text
)
returns public.races
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_race public.races;
begin
  perform private.check_gm(p_password);
  perform private.check_card(p_field, p_stats, p_dist, p_cond);
  if p_seed is null then
    raise exception 'invalid_field';
  end if;

  select * into v_race from public.races r where r.id = p_race_id for update;
  if not found then
    raise exception 'race_not_found';
  end if;
  if v_race.status <> 'paddock' then
    raise exception 'race_not_paddock';
  end if;

  update public.races set field = p_field, dist = p_dist, cond = p_cond
  where id = p_race_id
  returning * into v_race;
  update public.race_secrets set stats = p_stats, seed = p_seed where race_id = p_race_id;

  return v_race;
end
$$;

-- Allowed: paddock>betting, betting>closed, closed>betting, closed>running, and any
-- unsettled status > void (cancellation: open bets are refunded). finished only via
-- gm_publish_result.
create function public.gm_set_status(p_password text, p_race_id uuid, p_status text)
returns public.races
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_race public.races;
begin
  perform private.check_gm(p_password);

  select * into v_race from public.races r where r.id = p_race_id for update;
  if not found then
    raise exception 'race_not_found';
  end if;

  if not (
    (v_race.status || '>' || coalesce(p_status, '')) = any (
      array['paddock>betting', 'betting>closed', 'closed>betting', 'closed>running']
    )
    or (p_status = 'void' and v_race.status in ('paddock', 'betting', 'closed', 'running'))
  ) then
    raise exception 'invalid_transition';
  end if;

  if p_status = 'void' then
    update public.players p
    set balance = p.balance + refund.total
    from (
      select b.player_id, sum(b.stake)::int as total
      from public.bets b
      where b.race_id = p_race_id and b.status = 'open'
      group by b.player_id
    ) refund
    where p.id = refund.player_id;

    update public.bets set status = 'void', payout = stake
    where race_id = p_race_id and status = 'open';
  end if;

  update public.races
  set status = p_status,
      betting_at = case when p_status = 'betting' then now() else betting_at end,
      closed_at = case when p_status = 'closed' then now() else closed_at end,
      started_at = case when p_status = 'running' then now() else started_at end,
      finished_at = case when p_status = 'void' then now() else finished_at end
  where id = p_race_id
  returning * into v_race;

  return v_race;
end
$$;

create function public.gm_get_secrets(p_password text, p_race_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_secrets public.race_secrets;
begin
  perform private.check_gm(p_password);

  select * into v_secrets from public.race_secrets s where s.race_id = p_race_id;
  if not found then
    raise exception 'race_not_found';
  end if;
  return jsonb_build_object('stats', v_secrets.stats, 'seed', v_secrets.seed);
end
$$;

-- Settles a running race atomically. p_order is the simulated finish order (winner first).
--   none, dismiss:   official order = p_order.
--   pay_new_winner:  winner demoted to last (mirrors demoteWinner), new winner pays.
--   void:            race void, house keeps every stake (bets void, payout 0).
-- Winning payout = round(stake * odds), stake included (mirrors payoutFor).
create function public.gm_publish_result(
  p_password text,
  p_race_id uuid,
  p_order int[],
  p_ruling text,
  p_inquiry_text text
)
returns public.races
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_race public.races;
  v_official int[];
  v_winner int;
  v_status text;
begin
  perform private.check_gm(p_password);

  select * into v_race from public.races r where r.id = p_race_id for update;
  if not found then
    raise exception 'race_not_found';
  end if;
  if v_race.status <> 'running' then
    raise exception 'race_not_running';
  end if;

  if p_order is null
     or (select array_agg(x order by x) from unnest(p_order) x)
        is distinct from
        (select array_agg((h ->> 'n')::int order by (h ->> 'n')::int)
         from jsonb_array_elements(v_race.field) h) then
    raise exception 'invalid_order';
  end if;

  if p_ruling is null or p_ruling not in ('none', 'pay_new_winner', 'void', 'dismiss') then
    raise exception 'invalid_ruling';
  end if;

  v_official := case
    when p_ruling = 'pay_new_winner' then p_order[2:] || p_order[1]
    else p_order
  end;

  if p_ruling = 'void' then
    update public.bets set status = 'void', payout = 0
    where race_id = p_race_id and status = 'open';
    v_status := 'void';
  else
    v_winner := v_official[1];

    update public.players p
    set balance = p.balance + win.total
    from (
      select b.player_id, sum(round(b.stake * b.odds))::int as total
      from public.bets b
      where b.race_id = p_race_id and b.status = 'open' and b.horse_n = v_winner
      group by b.player_id
    ) win
    where p.id = win.player_id;

    update public.bets
    set status = case when horse_n = v_winner then 'won' else 'lost' end,
        payout = case when horse_n = v_winner then round(stake * odds)::int else 0 end
    where race_id = p_race_id and status = 'open';
    v_status := 'finished';
  end if;

  update public.races
  set status = v_status,
      finished_at = now(),
      result = jsonb_build_object(
        'order', to_jsonb(v_official),
        'original_order', to_jsonb(p_order),
        'ruling', p_ruling,
        'inquiry_text', p_inquiry_text
      )
  where id = p_race_id
  returning * into v_race;

  return v_race;
end
$$;

-- Players ---------------------------------------------------------------------------------

create function public.gm_adjust_balance(p_password text, p_player_id uuid, p_delta int)
returns public.players
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_player public.players;
begin
  perform private.check_gm(p_password);

  select * into v_player from public.players p where p.id = p_player_id for update;
  if not found then
    raise exception 'player_not_found';
  end if;
  if p_delta is null or v_player.balance + p_delta < 0 then
    raise exception 'balance_negative';
  end if;

  update public.players set balance = balance + p_delta
  where id = p_player_id
  returning * into v_player;
  return v_player;
end
$$;

create function public.gm_rename_player(p_password text, p_player_id uuid, p_name text)
returns public.players
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_player public.players;
begin
  perform private.check_gm(p_password);

  update public.players set name = private.clean_name(p_name)
  where id = p_player_id
  returning * into v_player;
  if not found then
    raise exception 'player_not_found';
  end if;
  return v_player;
end
$$;

-- Deletes the player, their secret and all their bets.
create function public.gm_delete_player(p_password text, p_player_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.check_gm(p_password);

  delete from public.players where id = p_player_id;
  if not found then
    raise exception 'player_not_found';
  end if;
end
$$;

-- Kuskar ----------------------------------------------------------------------------------

-- p_id null inserts a new kusk.
create function public.gm_upsert_kusk(
  p_password text,
  p_id uuid,
  p_name text,
  p_title text,
  p_notes text[],
  p_active boolean
)
returns public.kusks
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_kusk public.kusks;
  v_name text := btrim(coalesce(p_name, ''));
begin
  perform private.check_gm(p_password);
  if char_length(v_name) = 0 then
    raise exception 'name_empty';
  end if;

  if p_id is null then
    insert into public.kusks (name, title, notes, active)
    values (v_name, btrim(coalesce(p_title, '')), coalesce(p_notes, '{}'), coalesce(p_active, true))
    returning * into v_kusk;
  else
    update public.kusks
    set name = v_name,
        title = btrim(coalesce(p_title, '')),
        notes = coalesce(p_notes, '{}'),
        active = coalesce(p_active, true)
    where id = p_id
    returning * into v_kusk;
    if not found then
      raise exception 'kusk_not_found';
    end if;
  end if;
  return v_kusk;
end
$$;

create function public.gm_delete_kusk(p_password text, p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.check_gm(p_password);

  delete from public.kusks where id = p_id;
  if not found then
    raise exception 'kusk_not_found';
  end if;
end
$$;

-- Night reset -----------------------------------------------------------------------------

-- Wipes players, bets and races. Keeps kuskar and the GM password.
create function public.gm_reset_night(p_password text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.check_gm(p_password);

  update public.game_state set active_race_id = null where id;
  delete from public.bets where true;
  delete from public.races where true;
  delete from public.players where true;
end
$$;

-- Grants ----------------------------------------------------------------------------------

revoke execute on function
  private.check_gm(text),
  private.check_card(jsonb, jsonb, text, text)
from public, anon, authenticated;

revoke execute on function
  public.gm_login(text),
  public.gm_create_race(text, jsonb, jsonb, int, text, text),
  public.gm_reroll_race(text, uuid, jsonb, jsonb, int, text, text),
  public.gm_set_status(text, uuid, text),
  public.gm_get_secrets(text, uuid),
  public.gm_publish_result(text, uuid, int[], text, text),
  public.gm_adjust_balance(text, uuid, int),
  public.gm_rename_player(text, uuid, text),
  public.gm_delete_player(text, uuid),
  public.gm_upsert_kusk(text, uuid, text, text, text[], boolean),
  public.gm_delete_kusk(text, uuid),
  public.gm_reset_night(text)
from public, anon, authenticated;

grant execute on function
  public.gm_login(text),
  public.gm_create_race(text, jsonb, jsonb, int, text, text),
  public.gm_reroll_race(text, uuid, jsonb, jsonb, int, text, text),
  public.gm_set_status(text, uuid, text),
  public.gm_get_secrets(text, uuid),
  public.gm_publish_result(text, uuid, int[], text, text),
  public.gm_adjust_balance(text, uuid, int),
  public.gm_rename_player(text, uuid, text),
  public.gm_delete_player(text, uuid),
  public.gm_upsert_kusk(text, uuid, text, text, text[], boolean),
  public.gm_delete_kusk(text, uuid),
  public.gm_reset_night(text)
to anon, authenticated;
