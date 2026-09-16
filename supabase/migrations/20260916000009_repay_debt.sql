-- Avbetalning: the other half of take_loan.
--
-- The Snabblån debt used to be a one-way street. players.debt only ever grew (take_loan) and the
-- only way out was gm_reset_night, so a guest who borrowed early carried the red number all night
-- with nothing to do about it. This lets them buy it off in the Bank tab.
--
-- Note what this deliberately does NOT do: balance and debt move by the same amount, so neither
-- netWorth nor nightNet (src/shared/game/economy.ts) changes. Paying off a loan cannot move you up
-- either leaderboard, it only clears the red line. loans_taken is never decremented either: it
-- counts loans taken, and it breaks ties in byLosses.

create function public.repay_debt(p_player_id uuid, p_token uuid, p_amount int)
returns public.players
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_player public.players;
begin
  perform private.check_player(p_player_id, p_token);

  if p_amount is null or p_amount < 1 then
    raise exception 'bad_amount';
  end if;

  -- check_player already proved the row exists, so no "if not found" (same as take_loan).
  select * into v_player from public.players p where p.id = p_player_id for update;
  -- Before the size check: "for stort belopp" makes no sense to someone who owes nothing.
  if v_player.debt = 0 then
    raise exception 'no_debt';
  end if;
  -- The Bank tab caps the amount at least(balance, debt). Over that means the row moved under the
  -- guest (a bet went through on another tab, a double tap), so say so instead of paying a guess.
  if p_amount > least(v_player.balance, v_player.debt) then
    raise exception 'repay_too_large';
  end if;

  update public.players
  set balance = balance - p_amount, debt = debt - p_amount
  where id = p_player_id
  returning * into v_player;

  return v_player;
end
$$;

revoke execute on function public.repay_debt(uuid, uuid, int) from public, anon, authenticated;
grant execute on function public.repay_debt(uuid, uuid, int) to anon, authenticated;
