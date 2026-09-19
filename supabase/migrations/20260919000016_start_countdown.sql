-- Held start: the display iPad counts 3, 2, 1, KÖR before the field moves.
--
-- The race clock is server-authoritative, so the hold cannot be a local delay on one device: it is
-- stamped into races.started_at, which is now set a few seconds into the future. Both devices
-- replay the timeline against it, so the negative elapsed time is the countdown and tick 0 is the
-- start. Snabbspola still drags started_at back and is unaffected.
--
-- START_COUNTDOWN_MS in src/gm/raceClock.ts mirrors this interval; change both together.
create or replace function public.gm_set_status(p_password text, p_race_id uuid, p_status text)
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
      started_at = case when p_status = 'running' then now() + interval '3 seconds' else started_at end,
      finished_at = case when p_status = 'void' then now() else finished_at end
  where id = p_race_id
  returning * into v_race;

  return v_race;
end
$$;
