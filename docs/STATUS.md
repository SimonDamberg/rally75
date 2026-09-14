# Rally75: status log

Every stage agent appends a section here when it finishes: what was done, deviations from
`docs/META_PLAN.md`, open issues, and manual steps Simon must take.

## Stage 0: meta-plan (done, 2026-09-14)

- Requirements gathered with Simon and recorded in `docs/META_PLAN.md` (Decisions table is fixed).
- No code yet. Prototype files are still at the repo root (`natcasino-derby.html`, `PROTOTYPE.md`);
  Stage 1 moves them to `docs/prototype/`.
- Not a git repo yet; Stage 1 runs `git init`.

**Next:** Stage 1 (Foundation + game logic). Start a fresh session with:

> Read docs/META_PLAN.md and docs/STATUS.md, then plan and execute Stage 1.

(From Stage 2 on, also read `CLAUDE.md`, which Stage 1 creates.)

## Stage 1: foundation + game logic (done, 2026-09-14)

**Done**

- `git init` (branch `main`), prototype moved to `docs/prototype/`, `CLAUDE.md` written.
- Vite 8 + React 19 + TS 6 + Tailwind 4 + React Router 7 + Vitest 4 + ESLint 10, `vercel.json`
  SPA rewrite, `.env.example` (Supabase vars for Stage 2).
- Routes: `/` (client placeholder) and `/gm/*` (GM placeholder with a "Generera testfält" button
  that renders a real generated field + odds). Unknown paths redirect to `/`.
- `src/shared/content/`: all prototype pools ported verbatim (`names`, `stories`, `race`,
  `kuskar`, `commentary`, `parody`). Templates take an `Rng` instead of `Math.random`.
- `src/shared/game/`: `rng` (mulberry32), `types`, `field`, `odds`, `sim`, `format`.
- 36 tests: odds invariant (2000 random markets), prototype 3.77 regression, name/final-word/
  kusk/note/tip constraints over 1000 seeds, sim determinism incl. JSON round trip, timeline
  shape, inquiry rate, em dash scan over all of `src/`.
- Verified: `npm test`, `npm run lint`, `npm run build` pass; headless Chromium renders `/` at
  390px and `/gm` at 1180x820, and the test-field button shows 6 horses.

**Notes for Stage 2 (SQL mirror and jsonb shapes)**

- `races.field` = `HorsePublic[]`, `race_secrets.stats` = `HorseStats[]` (`src/shared/game/types.ts`).
  `baseOdds` is rounded to 2 decimals, stats to 4 decimals, so both survive a jsonb round trip.
- Odds: `computeOdds(horses, pools)` in `odds.ts` (VIRTUAL_POOL 700, TAKEOUT 0.87, clamp
  1.15..80, pools aligned with field order). Captured bet odds = `roundOdds` = round half up to
  2 decimals. Payout = `payoutFor(stake, odds)` = `round(stake * odds)` in whole kr, stake included.
- `simulateRace({horses, stats, seed, raceNo, meters})` needs `seed` stored in `race_secrets`;
  `distMeters(race.dist)` gives `meters`. `timeline.inquiry` (10 %) tells the GM to show the
  inquiry overlay; `demoteWinner(order)` implements the "pay new winner" ruling.
- Kusk seed data: `NAMED_KUSKAR` in `src/shared/content/kuskar.ts` (8 kuskar, 7 notes each).
  `buildField` falls back to a generic note if a DB kusk has no notes.
- `poolsFromBets(horses, bets)` turns `bets` rows (`horse_n`, `stake`) into the pools array.

**Deviations from META_PLAN**

- Versions are newer than the plan implied (Vite 8, TS 6, ESLint 10, Vitest 4); all work together.
- `Ruling` type includes `'none'` for races without an inquiry.
- `LEGAL_TEXT` rebranded from "Nat Casino Derby / Nat Holdings" to "Rally75 / Rally Holdings".
- Added small helpers not named in the plan: `commentAt` (commentary on screen at a tick, for
  replay/Snabbspola), `poolsFromBets`, `distMeters`, `buildRaceCard`.

**Open issues**

- The local npm registry config uses plain `http://registry.npmjs.org` (npm warns about it).
  Not project-specific; consider `npm config set registry https://registry.npmjs.org/`.

**Manual steps for Simon**

1. ~~Create the GitHub repo and push.~~ Done: https://github.com/SimonDamberg/rally75 (private).
   The remote uses HTTPS with `gh` as the repo-local credential helper (no SSH key on this Mac),
   so `git push` works as is.
2. ~~Import `rally75` into Vercel.~~ Done: the placeholder deploy is live and pushes to `main`
   deploy automatically. Stage 2 adds the Supabase env vars to the Vercel project.

**Next:** Stage 2 (Supabase backend). Start a fresh session with:

> Read CLAUDE.md, docs/META_PLAN.md and docs/STATUS.md, then plan and execute Stage 2.

## Stage 2: Supabase backend (done, 2026-09-14)

**Done**

- Hosted project **Rally75** (ref `ftmnvwuczanrwdhfdabg`, eu-west-1) linked; migrations pushed with
  `npx supabase db push`. `supabase/config.toml` committed for the local stack.
- `supabase/migrations/`: `_schema` (tables per META_PLAN, RLS on all, `revoke all` + explicit
  `grant select` on public tables, secret tables with no grants/policies, realtime publication
  `game_state, races, bets, players`), `_rpc_client`, `_rpc_gm`, `_kusk_seed` (8 kuskar from
  `NAMED_KUSKAR`). Helpers live in a `private` schema that PostgREST does not expose. Every
  function is `set search_path = ''` and `EXECUTE` is granted only on the listed RPCs.
- RPCs: `create_player`, `place_bet`, `take_loan`, `compute_odds`, `gm_login`, `gm_create_race`,
  `gm_reroll_race`, `gm_set_status`, `gm_get_secrets`, `gm_publish_result`, `gm_adjust_balance`,
  `gm_rename_player`, `gm_delete_player`, `gm_upsert_kusk`, `gm_delete_kusk`, `gm_reset_night`.
  Errors are raised as stable codes (`race_not_betting`, ...), mapped to Swedish in
  `src/shared/content/errors.ts`.
- `src/lib/`: `client.ts` (factory), `supabase.ts` (browser singletons `getSupabase`/`getApi`),
  `api.ts` (typed wrappers + reads), `types.ts` (hand-written row types using shared game types),
  `errors.ts` (`RallyError`), `identity.ts` (localStorage store), `connection.ts`, `realtime.ts`
  (pure reducers), `hooks.ts`: `useConnection`, `useActiveRace`, `useRaceBets`, `usePlayerBets`,
  `usePlayer`, `useLeaderboard` (`top` + `losers`), `useKusks`.
- `scripts/smoke.ts` (`npm run smoke -- --reset`): gm auth, RLS (anon cannot write any table or read
  secrets/private), SQL/TS odds parity over 402 markets, full lifecycle with captured odds checked
  against `computeOdds`, every error path, all four rulings, cancel-void refund, paddock
  replacement, Snabblån, GM player/kusk management, Realtime delivery of bet INSERTs, night reset.
  **Passes against the local stack and against the hosted project.**
- New tests: exact payout math, economy constants mirrored in SQL, kusk seed in sync, error
  mapping, realtime reducers and leaderboard sorting (47 tests total).
- Currency renamed to **RallyMynt (RM)** at Simon's request: `fmtKr` is now `fmtRm` ("1 000 RM"),
  copy, horse stories and docs updated. CLAUDE.md has the rule.

**Semantics later stages rely on**

- Race flow: `paddock>betting`, `betting>closed`, `closed>betting` (undo), `closed>running`;
  `finished` only via `gm_publish_result` (race must be `running`); `gm_set_status(void)` from any
  unsettled status cancels the race and **refunds** open bets (`status void, payout = stake`).
- `gm_create_race` works when there is no active race or it is `paddock` (the paddock race is
  deleted and replaced, same `race_no`), `finished` or `void`; otherwise `race_in_progress`.
- `gm_publish_result(order)` takes the **simulated** finish order; the server applies the ruling.
  `result = {order (official), original_order, ruling, inquiry_text}`. `pay_new_winner` demotes the
  winner (as `demoteWinner`). Ruling `void` sets race `void` and bets `void` with `payout 0` (house
  keeps stakes). Lost bets have `payout 0`, open bets `payout null`.
- Bets are only accepted on the active race while `betting`. Odds are captured before the bet
  joins the pool (pools = open bets).
- Economy (`src/shared/game/economy.ts`, mirrored in SQL): bonus 1000, min stake 10, Snabblån
  +500 balance / +1337 debt, only when balance < 10. Tags are random 10..99.
- Realtime: `postgres_changes` only start flowing at the `system` "Subscribed to PostgreSQL" event,
  which comes after `SUBSCRIBED`; hooks refetch at both. Filtered DELETE events are not delivered,
  so bet hooks subscribe unfiltered and filter client-side. `kusks` is not in the publication:
  call `useKusks().reload()` after GM edits.
- If a guest RPC returns `player_not_found`, call `usePlayer().forget()` (the GM deleted them).

**Deviations from META_PLAN**

- `payoutFor` now uses integer math (the float version differed from SQL `round(stake * odds)` in
  7 470 stake/odds pairs, for example 15 at 4.10 gave 61 instead of 62).
- `gm_reset_night` pulled forward from Stage 7 (used by the smoke script).
- Extra: public `compute_odds` RPC (parity check), `usePlayerBets`, `useKusks`, `result.original_order`.
- Currency is RallyMynt (RM) instead of kronor (Simon's change; Decisions table updated).
- Env var name kept as `VITE_SUPABASE_ANON_KEY`, but it holds the new publishable key
  (`sb_publishable_...`).
- Dev deps: `supabase` (CLI), `tsx`, `ws` (Node 20 has no global WebSocket for the smoke Realtime check).

**Open issues**

- Supabase advisors list every RPC as "SECURITY DEFINER executable by anon". That is by design (they
  are the only write path and check the token/password inside); the secret tables "RLS without
  policy" notices are also intentional (deny all).
- Vercel project is linked (`.vercel/`, gitignored). The Supabase Vercel integration also added its own
  `SUPABASE_*` / `NEXT_PUBLIC_SUPABASE_*` / `POSTGRES_*` vars (same project); the app ignores them.
- GM brute force is only slowed by bcrypt; use a long password (the generated one is).

**Manual steps for Simon**

1. **GM password**: generated and set on the hosted project; it is in `.env.local` as
   `GM_PASSWORD` (gitignored). To change it, run `supabase/snippets/set_gm_password.sql` with
   the new password in the Supabase SQL editor, and update `.env.local`.
2. ~~Vercel env vars~~ Done by the agent: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` set for
   Production and Preview (stored non-sensitive, since they ship in the JS bundle anyway; verified
   with `vercel env pull`). They take effect on the next deploy (next push to `main`). Never add
   `GM_PASSWORD` to Vercel.
3. The free Supabase project pauses after 7 days idle; open the dashboard before the party.
4. Local stack (optional): Docker Desktop + `npx supabase start`; `npx supabase stop` when done.

**Next:** Stage 3 (Rally75 design system). Start a fresh session with:

> Read CLAUDE.md, docs/META_PLAN.md and docs/STATUS.md, then plan and execute Stage 3.

## Stage 3: Rally75 design system (done, 2026-09-14)

**Done**

- Direction: V75 tote programme run by an offshore casino. Deep tote blue ground, yellow
  start-number plates, pink sleaze, green/red odds drift. Dark only.
- Signature: the logo is RALLY + a yellow **75 plate** slanted forward with a pink offset shadow;
  `SilkBadge` uses the same plate for every start number.
- Fonts self-hosted from npm (no Google Fonts request): Big Shoulders Display (display, odds,
  buttons) and Archivo with its width axis (body, condensed horse names). Only the latin subsets
  download.
- `src/index.css`: `@theme` tokens (colours, fonts, `text-tv-*` sizes for 2 m, animations),
  `plate`/`unplate`/`bulbs` utilities, base styles, focus ring, dialog backdrop, scroll lock while
  a dialog is open, reduced-motion override.
- `src/ui/`: `Logo`, `Button` (primary/sleaze/ghost/danger, md/lg/tv, loading), `Modal` (native
  `<dialog>` + `showModal()`: stacks in open order, Esc closes the top one, backdrop tap closes
  when `dismissible`), `toast()` store + `Toaster`, `SilkBadge` (lead glow, galopp wobble),
  `OddsValue` (flash + persistent drift colour and arrow), `HorseRow` (`card` / `pick`, selectable,
  tv size), `StatusBanner` (per race status), `BonusBar` (marquee + chasing bulbs),
  `ConnectionBadge` (pill, or banner shown only while offline). Barrel `src/ui/index.ts`.
- Copy in `src/shared/content/ui.ts` (status titles/subtitles, connection labels, small labels).
- Dev-only `/styleguide` (phone 390x844 and scaled iPad 1180x820 iframes) and
  `/styleguide/frame?device=phone|ipad` with every component, a fixed-seed field, fake bets that
  move odds, status/connection cyclers, toasts and two stacked modals. Lazy routes behind
  `import.meta.env.DEV`; verified absent from `dist`.
- Placeholders `/` and `/gm` now use `Logo`, `BonusBar`, `Button`, `HorseRow`.
- Tests: `src/ui/drift.test.ts`, `src/ui/toast.test.ts` (55 tests total).
- Verified: build, test, lint pass. Headless Chromium (Playwright's cached headless shell driven by
  a throwaway `playwright-core` script) at 390x844 and 1180x820: no horizontal scroll, both fonts
  loaded, no console errors, odds drift after fake bets, 2 stacked dialogs, Esc ignored by the
  non-dismissible top one and closing the dismissible one below.

**Deviations from META_PLAN**

- Palette is a dark tote blue rather than a light ATG-style page (dim party room, one theme).
- Extra: `Logo`, `Toaster`, `drift.ts`, `cx.ts`, `src/fonts.d.ts` (the Big Shoulders package has no
  CSS type declaration).
- No jackpot banner component; Stage 6 can compose one from `BonusBar`/`StatusBanner` styles.

**Notes for Stages 4 and 5**

- Wire `ConnectionBadge status={useConnection()}` in both apps (pill in the header plus the banner).
- Mount `<Toaster />` once per app. Toasts sit below open dialogs (browser top layer).
- `OddsValue` keeps its drift colour until the next change; it derives drift from the `value`
  prop, so keep the component mounted (stable `key`) for the ticker to work.
- `HorseRow variant="pick" size="tv"` in a 2-column grid truncates kusk names on the iPad; use one
  column or `size="md"` for dense GM panels.
- `Modal` with `dismissible={false}` (bet confirm, KYC) shows no close button and ignores Esc and
  backdrop taps.

**Open issues**

- None blocking. iOS Safari `<dialog>` behaviour should get a real-device check in Stage 7.

**Manual steps for Simon**

- None. Optional: `npm run dev` and open http://localhost:5173/styleguide to see the design system.

**Next:** Stage 4 (Game master app). Start a fresh session with:

> Read CLAUDE.md, docs/META_PLAN.md and docs/STATUS.md, then plan and execute Stage 4.
