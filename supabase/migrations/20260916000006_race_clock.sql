-- Server-authoritative race clock, so the display iPad and the control phone agree.
--
-- The race screen replays the deterministic timeline against a start time. That start used to live
-- in localStorage on the one device that ran the race, which cannot work once the iPad only
-- displays and the phone only controls: the phone's Snabbspola would never reach the iPad.
-- races.started_at is now the single source of truth, and Snabbspola moves it.

-- Lets a device measure its own clock offset instead of trusting it against a server timestamp.
create function public.server_now()
returns timestamptz
language sql
stable
set search_path = ''
as $$
  select now()
$$;

revoke execute on function public.server_now() from public;
grant execute on function public.server_now() to anon, authenticated;

-- Snabbspola: drag the start back so the race is already at its last frame. The finish pause still
-- runs from there, so the result publishes normally. p_run_ms is the timeline length, which only
-- the client knows (it comes out of simulateRace).
create function public.gm_skip_race(p_password text, p_race_id uuid, p_run_ms int)
returns public.races
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_race public.races;
begin
  perform private.check_gm(p_password);

  if p_run_ms is null or p_run_ms < 0 or p_run_ms > 600000 then
    raise exception 'bad_run_ms';
  end if;

  select * into v_race from public.races r where r.id = p_race_id for update;
  if not found then
    raise exception 'race_not_found';
  end if;
  if v_race.status <> 'running' then
    raise exception 'race_not_running';
  end if;

  update public.races
  set started_at = now() - make_interval(secs => p_run_ms / 1000.0)
  where id = p_race_id
  returning * into v_race;

  return v_race;
end
$$;

revoke execute on function public.gm_skip_race(text, uuid, int) from public, anon, authenticated;
grant execute on function public.gm_skip_race(text, uuid, int) to anon, authenticated;
