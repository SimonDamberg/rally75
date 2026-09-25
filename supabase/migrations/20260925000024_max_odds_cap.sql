-- Cap odds at 20 instead of 80.
--
-- With everyone piling onto the same horse, the rest of the field could drift out to
-- 80/1, which felt absurd on a 4-horse race. Mirrored in src/shared/game/odds.ts: MAX_ODDS 20.
--
-- Same function as in 20260914000002_rpc_client.sql, only max_odds changed.

create or replace function private.compute_odds(p_base float8[], p_pools int[])
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
  max_odds constant float8 := 20;
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
