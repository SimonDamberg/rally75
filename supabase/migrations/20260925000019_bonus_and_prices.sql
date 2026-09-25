-- Simon's numbers for the party: a 100 RM welcome bonus (was 1 000), a 100 RM Snabblån (was 500,
-- the debt stays 1 337), Öl and Cider at 500 RM, the Mystery Box at 800 RM.
--
-- Mirrored in src/shared/game/economy.ts (economy.test.ts reads the newest create_player and
-- take_loan):
--   WELCOME_BONUS 100, MIN_STAKE 10, LOAN_AMOUNT 100, LOAN_DEBT 1337, MAX_NAME_LENGTH 24.
--   LOAN_THRESHOLD 50.
--
-- Players who already exist keep their balance and debt; only new bonuses and loans are smaller.

create or replace function public.create_player(p_name text)
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

  insert into public.players (name, tag, balance) values (v_name, v_tag, 100)
  returning id into v_id;
  insert into public.player_secrets (player_id) values (v_id)
  returning token into v_token;

  return json_build_object('id', v_id, 'token', v_token, 'tag', v_tag);
end
$$;

-- As in *_loan_threshold.sql, only the payout changes.
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
  set balance = balance + 100, debt = debt + 1337, loans_taken = loans_taken + 1
  where id = p_player_id
  returning * into v_player;

  return v_player;
end
$$;

update public.shop_items set price = 500 where kind = 'physical' and name in ('Öl', 'Cider');
update public.shop_items set price = 800 where kind = 'box';
