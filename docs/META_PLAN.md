# Rally75: meta-plan

## Context

Simon's party has an online-casino theme, and his outfit is horse racing. The existing prototype
(`natcasino-derby.html` + `PROTOTYPE.md`) is a single-file, single-iPad, offline trotting-bet
toy with no persistence. We are rebuilding it as **Rally75**, a V75/V85 parody (ATG-style
Swedish betting site with casino sleaze on top):

- **Client** (`/`): guests on their own phones sign up with just a name, get a 1000 RM (RallyMynt) welcome
  bonus, and bet on the active race. Parody casino UX: pop-ups, empty promises, fake social proof.
- **Game master** (`/gm`): Simon on an iPad (landscape, readable at 2 m), password-protected.
  Generates fields, controls the race lifecycle, runs the race animation, rules on inquiries,
  sees live bets, manages players and named kuskar.
- **Shared backend**: Supabase (Postgres + Realtime + RPC functions).

The work is split into stages, each executed by a fresh agent session. This file is the
contract between those sessions.

## Decisions (settled with Simon, treat as fixed)

| Topic | Decision |
|---|---|
| Brand | **Rally75**, inspired by V75/V85. Full ATG/V75 parody look (bright blues/yellows, jackpot banners) plus casino sleaze. Own logo, never ATG's real name/logo. |
| Language | Swedish everywhere, including errors. No em dashes in any user-facing text. No audio. |
| Race view | Race animation runs **only on the GM iPad**. Phones show state ("Loppet pågår") and then a result reveal. |
| Race lifecycle | GM controls every step: `paddock` (field visible to guests, GM can reroll) -> `betting` -> `closed` -> `running` -> `finished`/`void`. No auto countdown. |
| Horses | Fresh **4-horse** field per race, rerollable (changed from 6 by Simon after Stage 3, to fit the iPad). Content pools ported verbatim from prototype. The UI shows **no kusk title** in parentheses after the kusk name and **no race stats** (distance, track conditions); the data still carries `title`, `dist`, `cond`. |
| Bet type | **Vinnare only.** Fixed odds captured at placement (prototype model). |
| Economy | Currency is **RallyMynt (RM)**, not kronor (changed by Simon in Stage 2). 1000 RM welcome bonus. When broke: predatory "Snabblån" pop-up (absurd interest, debt tracked, shown on leaderboard). |
| Identity | Name only, duplicates allowed (displayed with random tag, e.g. "Simon #42"). `{playerId, token}` in localStorage. Lost storage = new account + new bonus (accepted). |
| Balance | Authoritative in DB. All balance changes via server-side RPCs. |
| Inquiry | ~10% of races. GM picks ruling on the iPad: pay the new winner / void, house keeps stakes / dismiss (original result stands). |
| Client extras | Leaderboard (incl. "Kvällens största förlorare"), my bets + history, result reveal pop-up, live odds ticker with drift colours. |
| Client parody | Pop-up offers with restarting countdowns, fake social proof (win toasts, viewer count), absurd KYC + cookie banner where every option accepts. |
| GM extras | Manage players (list, adjust balance, rename, delete). Edit named kuskar in DB. (No race rigging, no broadcast.) |
| GM auth | Server-checked password: bcrypt hash in a private DB table, every `gm_*` RPC takes the password. Remembered on the iPad. |
| Network | Required. No offline fallback; clear "Ingen anslutning" states + auto-retry. |
| Devices | Client: phone portrait (usable on desktop). GM: iPad landscape. |
| Stack | Vite + React + TypeScript + Tailwind (v4, `@tailwindcss/vite`) + React Router + Vitest. `@supabase/supabase-js`. Deployed on Vercel (SPA rewrite). |
| Timeline | Party is soon: lean stages, optional items clearly marked. |
| Accounts | Simon has GitHub + Vercel. **No Supabase account yet** (created in Stage 2). |

## Architecture

### Repo layout (target)

```
/                     Vite app root
  CLAUDE.md           conventions for every agent (written in Stage 1)
  docs/META_PLAN.md   this plan (copied in on approval)
  docs/STATUS.md      running handoff log, updated at end of every stage
  docs/prototype/     natcasino-derby.html + PROTOTYPE.md (moved, reference only)
  supabase/migrations/*.sql
  src/
    shared/content/   word pools, NAMED_KUSKAR seed, commentary lines (from prototype)
    shared/game/      rng.ts (seeded mulberry32), field.ts, odds.ts, sim.ts, format.ts, types.ts
    lib/supabase.ts   client + typed RPC wrappers (api.ts) + realtime hooks
    ui/               design-system components shared by both apps
    client/           guest app (route "/")
    gm/               game master app (route "/gm")
  vercel.json         rewrite all paths -> /index.html
```

### Data model (Supabase, all tables RLS-enabled)

- `players`: `id uuid, name text, tag int, balance int, debt int, loans_taken int, created_at`. Public SELECT (leaderboard).
- `player_secrets`: `player_id, token uuid`. No client access (kept out of Realtime).
- `game_state` singleton: `active_race_id`. Public SELECT.
- `races`: `id, race_no, status, dist, cond, field jsonb` (public horse info: n, name, jockey, title, story, jnote, form, note, tip, silk, baseOdds), `result jsonb` (`order: number[], ruling, inquiry_text`), timestamps. Public SELECT.
- `race_secrets`: `race_id, stats jsonb` (strength/stamina/temper per horse), `seed int`. No client access; GM reads via RPC.
- `bets`: `id, player_id, race_id, horse_n, stake, odds numeric, payout int, status (open|won|lost|void)`, created_at. Public SELECT (drives odds ticker, GM live bets, real "X satsade" toasts).
- `kusks`: `id, name, title, notes text[], active bool`. Public SELECT; seeded with the prototype's 8 friends.
- `gm_auth` (private): bcrypt hash via pgcrypto. Password set once by Simon with a SQL snippet.

Realtime publication: `game_state`, `races`, `bets`, `players`.

### RPC contract (SECURITY DEFINER, the only write path)

Client: `create_player(name) -> {id, token, tag}`, `place_bet(player_id, token, race_id, horse_n, stake) -> bet` (locks player row, checks status = betting and balance, computes odds server-side), `take_loan(player_id, token)` (only when balance < min stake).

GM (all take `password`): `gm_login`, `gm_create_race(field, stats, seed, dist, cond)` (also sets active race), `gm_reroll_race(race_id, ...)` (paddock only), `gm_set_status(race_id, status)` (validated transitions), `gm_get_secrets(race_id)`, `gm_publish_result(race_id, order, ruling, inquiry_text)` (settles all bets atomically), `gm_adjust_balance`, `gm_rename_player`, `gm_delete_player`, `gm_upsert_kusk`, `gm_delete_kusk`.

### Shared game logic (pure TS, ported from prototype)

- `buildField(n, kusks, rng)`: same patterns and constraints (no duplicate names or final words, 2-4 named kuskar, no repeated comment/tip).
- `computeOdds(field, pools)`: VIRTUAL_POOL 700, TAKEOUT 0.87, clamp 1.15..80. Invariant test: **money on a horse always shortens it.** Mirrored in SQL inside `place_bet`; Stage 2 adds a parity check on fixtures.
- `simulateRace(field, stats, seed)`: returns the full tick timeline (positions, breaks, commentary events, finish order) deterministically, so the iPad can replay after a reload and "Snabbspola" just jumps to the end. Gap-based screen positions, MÅLFOTO under 1.6, 10% inquiry flag.

## Stages

Each stage: one fresh agent session. Start prompt: *"Read CLAUDE.md, docs/META_PLAN.md and docs/STATUS.md, then plan and execute Stage N."* End of every stage: `npm run build` + `npm test` pass, update `docs/STATUS.md` (done, deviations, open issues, manual steps for Simon), commit, stop.

### Stage 1: Foundation + game logic
- `git init`, Vite React TS, Tailwind v4, React Router (`/`, `/gm` placeholders), Vitest, ESLint, `vercel.json`, `.env.example`.
- Move prototype files to `docs/prototype/`. Write `CLAUDE.md` (Swedish UI, no em dash, no audio, folder rules, "shared/game is pure and tested").
- Port content pools verbatim to `src/shared/content/`; implement `rng`, `field`, `odds`, `sim`, `format` in `src/shared/game/` with unit tests (odds invariant, name constraints, sim determinism, no em dash in content).
- Simon: create GitHub repo + import to Vercel (placeholder deploy).

### Stage 2: Supabase backend
- Simon: create Supabase account/project, put URL + anon key in `.env.local` and Vercel env. Agent gives exact steps; migrations applied with `npx supabase` (Simon runs `! npx supabase login`) or pasted into the SQL editor.
- Migrations: tables, RLS, grants, realtime publication, all RPCs, kusk seed, `gm_set_password` snippet.
- `src/lib/`: supabase client, typed RPC wrappers, hooks (`useActiveRace`, `useRaceBets`, `usePlayer`, `useLeaderboard`, `useConnection`).
- Verification script (`scripts/smoke.ts`): create players, run a race lifecycle via RPCs, place bets (incl. insufficient balance and wrong status), publish each ruling, assert balances. SQL/TS odds parity.

### Stage 3: Rally75 design system
- Use the `frontend-design` skill. Rally75 logo/wordmark, Tailwind theme tokens (ATG-style blues/yellows + casino neon), typography readable at 2 m on iPad.
- Components in `src/ui/`: Button, Modal/Popup (stackable), Toast, SilkBadge, HorseRow, OddsValue (drift up/down), StatusBanner, BonusBar, ConnectionBadge.
- Dev-only `/styleguide` route showing all components at phone and iPad widths.

### Stage 4: Game master app (`/gm`)
- Password login (remembered). Connection state.
- Race control panel as a state machine: generate/reroll field (uses DB kuskar), open betting, close betting, start race, full-screen race animation + oversized commentary strip (port prototype visuals), Snabbspola, inquiry overlay with the three rulings, publish result, next race.
- Live bets panel: bets streaming in, pool per horse, current odds, house exposure per outcome.
- Join panel: big QR code to the client URL.
- Players tab (list, balance/debt, adjust, rename, delete). Kuskar tab (CRUD, 7 notes each).
- Reload-safe: resuming mid-race replays from the stored seed.

### Stage 5: Client app core (`/`)
- Onboarding: fake connect sequence, name entry + absurd KYC, cookie banner (every option accepts), 1000 RM bonus reveal.
- Home by race status: paddock (race card), betting (horse list with live odds ticker, chips 10/25/50/100/250 + "ALL IN", confirm with locked odds), closed/running ("Loppet pågår"), finished (result reveal pop-up: win/loss, inquiry ruling).
- Balance header, Snabblån flow, My bets + history, Leaderboard (top balance + största förlorare).
- Placing a bet from cold start must stay under 2 minutes.

### Stage 6: Parody layer + polish
- Pop-up offer engine: timed offers, restarting countdowns, "free spins" for games that don't exist, VIP-only-today. Rules: one tap to dismiss, cooldown between pop-ups, never shown during bet confirm or result reveal.
- Fake social proof: win toasts mixed with real bets, fluctuating viewer count, "Utbetalt i kväll".
- Bonus bar, legal small print, sleazy copy pass across both apps. Em dash check over `src/`.
- Optional if time: haptics/animations on big wins, "Kvällens största förlorare" award screen on GM.

### Stage 7: Deploy + dress rehearsal
- Production env on Vercel, Supabase auth/CORS settings, iPad "Lägg till på hemskärmen" (PWA manifest + icons).
- Load script: ~30 simulated players betting concurrently through a full race.
- Rehearsal checklist on a real phone + iPad. Party-day checklist (wake the Supabase free project, which pauses after 7 days idle; set GM password; reset data script `gm_reset_night`).

## Verification (per stage, summarized)

- Stage 1: `npm test` (odds invariant, sim determinism, name constraints), `npm run build`, `npm run dev` shows both routes.
- Stage 2: `scripts/smoke.ts` passes against the real project; RLS check that anon cannot write tables or read `player_secrets`/`race_secrets`/`gm_auth`.
- Stages 3-6: run the app (`run` skill / browser), screenshots at 390px portrait and 1180x820 landscape; two browser windows (GM + client) to confirm realtime flow end to end.
- Stage 7: deployed URL on real devices, load script, full race night rehearsal.

## Immediate next step (this session, after approval)

Only write `docs/META_PLAN.md` (this plan) and an initial `docs/STATUS.md` ("Stage 0: plan approved, next: Stage 1") in the project folder. No code. Then stop so Stage 1 starts in a fresh session.
