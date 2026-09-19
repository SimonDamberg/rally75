-- Snabblån opens below 50 RM instead of below MIN_STAKE (10).
--
-- Plånko pays odd amounts (0,3x of 25 is 8), so guests end up stranded on 23 or 41 RM: too much to
-- be offered a loan, too little to do anything fun with. The loan now opens under LOAN_THRESHOLD.
-- Mirrored in src/shared/game/economy.ts (economy.test.ts checks this file by string):
-- LOAN_THRESHOLD 50.
--
-- Same function as in 20260914000002_rpc_client.sql, only the threshold changed.

create or replace function public.take_loan(p_player_id uuid, p_token uuid)
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
  if v_player.balance >= 50 then
    raise exception 'loan_not_allowed';
  end if;

  update public.players
  set balance = balance + 500, debt = debt + 1337, loans_taken = loans_taken + 1
  where id = p_player_id
  returning * into v_player;

  return v_player;
end
$$;
