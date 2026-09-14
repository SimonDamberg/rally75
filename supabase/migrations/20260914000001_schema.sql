-- Rally75 schema: tables, RLS, grants, realtime publication.
-- Writes happen only through SECURITY DEFINER RPCs (see the rpc migrations).
-- jsonb shapes: races.field = HorsePublic[], race_secrets.stats = HorseStats[]
-- (src/shared/game/types.ts).

create extension if not exists pgcrypto with schema extensions;

-- Helpers live in a schema PostgREST does not expose.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- Players ---------------------------------------------------------------------------------

create table public.players (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 24),
  tag int not null check (tag between 1 and 99),
  balance int not null default 0 check (balance >= 0),
  debt int not null default 0 check (debt >= 0),
  loans_taken int not null default 0 check (loans_taken >= 0),
  created_at timestamptz not null default now()
);

create table public.player_secrets (
  player_id uuid primary key references public.players (id) on delete cascade,
  token uuid not null default gen_random_uuid()
);

-- Races -----------------------------------------------------------------------------------

create table public.races (
  id uuid primary key default gen_random_uuid(),
  race_no int not null unique check (race_no > 0),
  status text not null default 'paddock'
    check (status in ('paddock', 'betting', 'closed', 'running', 'finished', 'void')),
  dist text not null,
  cond text not null,
  field jsonb not null check (jsonb_typeof(field) = 'array'),
  -- {order: int[], original_order: int[], ruling, inquiry_text}; null until settled.
  result jsonb,
  created_at timestamptz not null default now(),
  betting_at timestamptz,
  closed_at timestamptz,
  started_at timestamptz,
  finished_at timestamptz
);

create table public.race_secrets (
  race_id uuid primary key references public.races (id) on delete cascade,
  stats jsonb not null check (jsonb_typeof(stats) = 'array'),
  seed int not null
);

create table public.game_state (
  id boolean primary key default true check (id),
  active_race_id uuid references public.races (id) on delete set null
);
insert into public.game_state (id) values (true);

-- Bets ------------------------------------------------------------------------------------

create table public.bets (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players (id) on delete cascade,
  race_id uuid not null references public.races (id) on delete cascade,
  horse_n int not null,
  stake int not null check (stake > 0),
  odds numeric(8, 2) not null check (odds > 0),
  -- null while open; stake for a refunded void, 0 for lost or house-kept void.
  payout int check (payout >= 0),
  status text not null default 'open' check (status in ('open', 'won', 'lost', 'void')),
  created_at timestamptz not null default now()
);
create index bets_race_id_idx on public.bets (race_id);
create index bets_player_id_idx on public.bets (player_id);

-- Kuskar and GM auth ----------------------------------------------------------------------

create table public.kusks (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) > 0),
  title text not null default '',
  notes text[] not null default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.gm_auth (
  id boolean primary key default true check (id),
  password_hash text not null
);

-- RLS and grants --------------------------------------------------------------------------

alter table public.players enable row level security;
alter table public.player_secrets enable row level security;
alter table public.races enable row level security;
alter table public.race_secrets enable row level security;
alter table public.game_state enable row level security;
alter table public.bets enable row level security;
alter table public.kusks enable row level security;
alter table public.gm_auth enable row level security;

revoke all on
  public.players, public.player_secrets, public.races, public.race_secrets,
  public.game_state, public.bets, public.kusks, public.gm_auth
from public, anon, authenticated;

grant select on public.players, public.races, public.game_state, public.bets, public.kusks
to anon, authenticated;

create policy "public read" on public.players for select to anon, authenticated using (true);
create policy "public read" on public.races for select to anon, authenticated using (true);
create policy "public read" on public.game_state for select to anon, authenticated using (true);
create policy "public read" on public.bets for select to anon, authenticated using (true);
create policy "public read" on public.kusks for select to anon, authenticated using (true);
-- player_secrets, race_secrets, gm_auth: no grants, no policies.

-- Realtime --------------------------------------------------------------------------------

alter publication supabase_realtime add table public.game_state, public.races, public.bets, public.players;
