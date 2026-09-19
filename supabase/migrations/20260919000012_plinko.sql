-- Plånko: Mr Green's Plinko.
--
-- A ball falls through 12 rows of pegs and bounces left or right once per row; the slot it lands in
-- is the number of rights, and each slot pays a fixed multiplier of the stake. The whole drop is one
-- RPC: plinko_drop draws the path, pays out and writes the row in the same transaction, so there is
-- no round state and nothing secret to peek at. The phone only animates a path it already knows,
-- and holds the header balance back until the ball lands (see src/client/Plinko.tsx).
--
-- Mirrored in src/shared/game/plinko.ts (plinko.test.ts checks this file by string):
-- PLINKO_ROWS 12, PLINKO_MAX_STAKE 250.
-- Multipliers in tenths, slot 0 to 12: array[1000, 120, 40, 15, 10, 5, 3, 5, 10, 15, 40, 120, 1000]
-- RTP is 3735.2 / 4096, about 91 %.
--
-- Not rank neutral: it is gambling, like a bet, so the stake and the payout both move balance.
-- gm_reset_night needs no change: drops cascade off the deleted players.

create table public.plinko_drops (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players (id) on delete cascade,
  stake int not null check (stake > 0),
  -- 12-bit mask, bit i set = bounce right at row i.
  path int not null check (path >= 0 and path < 4096),
  slot int not null check (slot >= 0 and slot <= 12),
  m10 int not null check (m10 >= 0),
  payout int not null check (payout >= 0),
  -- The player's balance right after this drop. The phone shows this minus the payouts of balls
  -- still falling, so the header never spoils a result whichever of the RPC reply and the Realtime
  -- players update arrives first. (Balances are public on players anyway.)
  balance_after int not null,
  created_at timestamptz not null default now()
);
create index plinko_drops_player_id_idx on public.plinko_drops (player_id);
create index plinko_drops_created_at_idx on public.plinko_drops (created_at desc);

alter table public.plinko_drops enable row level security;
revoke all on public.plinko_drops from public, anon, authenticated;
grant select on public.plinko_drops to anon, authenticated;
create policy "public read" on public.plinko_drops for select to anon, authenticated using (true);

-- The control phone's totals and the display iPad's big-hit toasts fill themselves.
alter publication supabase_realtime add table public.plinko_drops;

create function public.plinko_drop(p_player_id uuid, p_token uuid, p_stake int)
returns public.plinko_drops
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_table constant int[] := array[1000, 120, 40, 15, 10, 5, 3, 5, 10, 15, 40, 120, 1000];
  v_balance int;
  v_bytes bytea;
  v_path int;
  v_slot int := 0;
  v_m10 int;
  v_payout int;
  v_drop public.plinko_drops;
begin
  perform private.check_player(p_player_id, p_token);

  if p_stake is null or p_stake < 10 then
    raise exception 'stake_too_low';
  end if;
  if p_stake > 250 then
    raise exception 'stake_too_high';
  end if;

  select p.balance into v_balance from public.players p where p.id = p_player_id for update;
  if v_balance < p_stake then
    raise exception 'insufficient_balance';
  end if;

  v_bytes := extensions.gen_random_bytes(2);
  v_path := ((get_byte(v_bytes, 0) << 8) | get_byte(v_bytes, 1)) & 4095;
  for i in 0..11 loop
    if (v_path >> i) & 1 = 1 then
      v_slot := v_slot + 1;
    end if;
  end loop;
  v_m10 := v_table[v_slot + 1];
  -- Round half up, integer maths (plinkoPayout).
  v_payout := (p_stake * v_m10 + 5) / 10;

  update public.players
  set balance = balance - p_stake + v_payout
  where id = p_player_id;

  insert into public.plinko_drops (player_id, stake, path, slot, m10, payout, balance_after)
  values (p_player_id, p_stake, v_path, v_slot, v_m10, v_payout, v_balance - p_stake + v_payout)
  returning * into v_drop;

  return v_drop;
end
$$;

revoke execute on function public.plinko_drop(uuid, uuid, int) from public, anon, authenticated;
grant execute on function public.plinko_drop(uuid, uuid, int) to anon, authenticated;
