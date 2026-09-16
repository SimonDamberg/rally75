-- "Utbetalt i kväll" as a server-side aggregate.
--
-- The client used to select every winning bet's payout and sum it in JS, which hit PostgREST's
-- default 1000-row cap (the number would silently stop growing) and made every phone re-download
-- the whole winners list after each race. This returns a single number instead.
--
-- security invoker on purpose: public.bets already has a permissive public SELECT policy, so
-- invoker rights are enough and this does not join the list of SECURITY DEFINER RPCs callable
-- by anon.
create function public.night_paid()
returns bigint
language sql
stable
set search_path = ''
as $$
  select coalesce(sum(b.payout), 0)::bigint
  from public.bets b
  where b.status = 'won'
$$;

revoke execute on function public.night_paid() from public;
grant execute on function public.night_paid() to anon, authenticated;
