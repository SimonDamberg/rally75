-- "Huset idag" on Topplista: real RM the house has taken tonight from Rally75, Plånko and Butiken,
-- net of payouts. Deliberately excludes the welcome bonus and kuponger, both of which mint RM
-- straight onto players.balance without ever touching bets, plinko_drops or purchases.
--
-- security invoker on purpose: bets, plinko_drops and purchases all carry permissive public SELECT
-- policies, so invoker rights are enough and this does not join the list of SECURITY DEFINER RPCs
-- callable by anon.
create function public.house_take()
returns bigint
language sql
stable
set search_path = ''
as $$
  select (
    coalesce((select sum(b.stake - b.payout) from public.bets b where b.status <> 'open'), 0)
    + coalesce((select sum(d.stake - d.payout) from public.plinko_drops d), 0)
    + coalesce((select sum(p.price) from public.purchases p), 0)
  )::bigint
$$;

revoke execute on function public.house_take() from public;
grant execute on function public.house_take() to anon, authenticated;
