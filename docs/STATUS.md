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

## Adjustments after Stage 3 (done, 2026-09-14)

Requested by Simon before Stage 4:

- **4 horses per race** (`FIELD_SIZE = 4` in `src/shared/game/field.ts`, was 6) so a whole field
  fits on the iPad. Tests and the smoke odds-parity check use `FIELD_SIZE`. SQL needs no change
  (`gm_create_race` accepts 2 or more horses). Named kuskar are still 2 to 4 per field, so a race
  can now be all friends.
- **No kusk title in parentheses** after the kusk name (`HorseRow`). `title` stays in the data,
  the `kusks` table and `gm_upsert_kusk`; Stage 4's Kuskar tab can skip the field.
- **No race stats** (distance, track conditions) on screen. Removed from the GM placeholder and
  the styleguide. `dist`/`cond` are still generated and stored (DB columns are `not null`), and
  `distMeters(race.dist)` still feeds the sim clock.
- META_PLAN Decisions table updated (Horses row). Stages 4 to 6: do not display `title`, `dist`
  or `cond`, even where the prototype did.

## GM attract screen (done, 2026-09-14)

Requested by Simon: idle animations on the iPad to pull guests in.

- `src/gm/Attract.tsx`: full-screen idle view. Now shown by the `/gm` placeholder (a dim
  "Testfält" button bottom right opens the old test field). Contents:
  - Join QR code (`QrCode` in `src/ui`, SVG via the new dependency `uqr`) for
    `window.location.origin`, host name printed under it, 1 000 RM bonus pill.
  - `Jackpot.tsx`: fake "Kvällens jackpott" on a bulb-lit tote board, odometer digits rolling
    every 1.1 s. Derived from the local clock (resets at noon), so reloads never reset it.
  - Rotating sleaze lines and a live "N spelare vid bordet / Senast in" count (`useLeaderboard`).
  - `JoinFanfare.tsx`: a pink banner sweeps across for every new sign-up ("Simon #42 är med,
    +1 000 RM på kontot"). Players present at load are not announced; more than 3 queued fold
    into one "och N till" banner.
  - `TrotParade.tsx`: the 4 start-number plates trot across a scrolling rail with speed streaks,
    trading the lead (leader glows), with a random galopp every 5 to 11 s. rAF, DOM transforms
    only; static when reduced motion is on.
  - `useWakeLock.ts`: keeps the iPad screen on while the attract screen is mounted.
- Copy in `ATTRACT` (`src/shared/content/ui.ts`); new animation tokens `trot`, `rail`,
  `fanfare`, `count-pop` in `src/index.css`.
- Verified in headless Chromium at 1180x820 and 1024x768 (no overflow, no console errors); the
  fanfare was tested with mocked `players` responses (single join and a folded rush of 4).

**Notes for Stage 4:** show `<Attract />` when there is no active race and between races
(finished/void), and switch to the race panel when the GM starts one. Wake lock needs a secure
context (the Vercel https URL, not a LAN IP). The QR points at the origin the iPad opened.

## Stage 4: Game master app (done, 2026-09-15)

**Done**

- `/gm` is the real console. Password gate (`Login`, remembered in localStorage, trusted at start;
  the first `gm_unauthorized` logs out). Wake lock for the whole GM app.
- View picker (`GmShell`): the attract screen when there is no race or between races (corner button
  "Spelledare"), the panel when a race is in paddock/betting/closed, the full-screen race
  while running.
- **Lopp** tab: compact tv rows with live odds; in the paddock, tapping a horse opens its full card
  (for presenting it). Actions by status: Skapa lopp / Slumpa om / Öppna spel / Stäng spelet /
  Öppna igen / Starta loppet / Stryk loppet (confirm, refunds) / Nästa lopp. Fields are generated
  from the active DB kuskar.
- **Race screen**: 4 lanes with checkered finish, lead glow, galopp wobble, meters clock, oversized
  commentary strip, Snabbspola, Stryk. Replays `simulateRace` from `gm_get_secrets` against a
  stored start time, so a reload mid-race resumes at the same tick (verified). "Starta loppet"
  fetches the secrets first, so the animation starts at tick 0.
- **Auto-publish** (Simon's choice): no inquiry means the result goes out after the finish pause
  (1.9 s, or 2.6 s on a photo). Inquiry: the "Bandomarna utreder" overlay holds 3.2 s, then the
  three rulings. If publishing fails, a "Publicera resultat" retry button appears.
- Result panel: podium, ruling and inquiry text, winners with payouts, house net for the race.
- **Spel** tab: total pot, per horse pool, bet count, current odds and "Om hästen vinner, huset
  +/-X", plus a feed of the latest bets.
- **Spelare** tab: balance/debt/Snabblån table, edit modal (quick deltas, free amount, rename,
  delete) and "Nollställ kvällen" (`gm_reset_night`) behind a confirm.
- **Kuskar** tab: list, create/edit (name, comments one per line, active switch), delete. The
  epithet is not shown; edits keep the stored `title`.
- Pure modules with tests: `raceClock.ts` (tick/phase/Snabbspola), `book.ts` (pools, odds,
  liability, settlement), `parse.ts` (amount and notes input). 67 tests total.
- Verified with build, test and lint, plus headless Chromium against the hosted project at 1180x820
  and 1024x768. The run covered: wrong password, create, reroll, betting with REST-placed guest
  bets (live odds, pools, feed, exposure), close, start, reload mid-race, Snabbspola, auto-publish
  payouts, all three rulings on a forced inquiry seed (pay_new_winner paid the demoted order, void
  kept stakes, dismiss kept the order), void refunds, adjust/rename/delete player, kusk
  create/delete. No horizontal overflow; the only console error was the intended wrong-password 400.
  Hosted data was reset afterwards (no players or races, the 8 kuskar untouched).

**Deviations from META_PLAN**

- Bug fix in `src/lib/hooks.ts` (Stage 2 code): Realtime merges called a `useEffectEvent` function
  inside a `setState` updater, which React runs during render. The page crashed on the first bet or
  player change. Changes are now merged in the subscription closure before `setState`.
- Paddock shows compact rows plus one expanded card instead of four full cards (they did not fit
  at 820 px).
- `src/lib/identity.ts` also stores the GM race start (`loadRaceStart`/`saveRaceStart`).
- Removed the placeholder "Testfält" button and its copy.

**Open issues**

- Race start time uses the iPad clock. A second GM device without the stored start falls back to
  `races.started_at` (server clock), so clock skew shifts its replay slightly.
- The JS bundle is 550 kB (the warning was already there at 512 kB). Stage 7 could lazy-load `/gm`
  so guests do not download it.
- Toasts sit bottom right and can briefly cover the bottom-right action button on the iPad.

**Manual steps for Simon**

- None. Open `/gm` on the iPad (the Vercel https URL, for the wake lock) and log in with the
  password in `.env.local` (`GM_PASSWORD`).

**Next:** Stage 5 (Client app core). Start a fresh session with:

> Read CLAUDE.md, docs/META_PLAN.md and docs/STATUS.md, then plan and execute Stage 5.

## Stage 5: Client app core (done, 2026-09-15)

**Done**

- `/` is the real guest app, phone portrait first.
- **Onboarding**: fake secure-connection sequence (`CONNECT_LINES`, about 3.4 s, tap to skip), then
  a full-screen KYC form: name (the only real field), a pre-ticked "minst 13 år" box that cannot be
  unticked, "Hur mycket tänker du förlora ikväll?" chips and a money-origin field that goes nowhere.
  Then the **bonus reveal** pop-up (1 000 RM count-up). The **cookie banner** shows once per device;
  all three buttons accept (the settings pop-up has every category locked on).
- **Shell**: bonus bar, header (player label, balance that flashes green/red on change, debt,
  pulsing Snabblån button when broke, connection pill), offline banner, bottom tabs.
- **Spela** by race status: no race / loading / offline states; paddock shows full race cards with
  morning-line odds; betting shows selectable rows with live odds and pools. Tapping a horse opens
  the sticky **bet slip**: chips 10/25/50/100/250 stack (capped at the balance), ALL IN, Rensa,
  potential payout, then a non-dismissible **confirm** with live odds. The toast after placing
  shows the odds the server captured. If the GM closes betting while the confirm is open, it closes
  with a toast. Closed and running show a status panel, the final odds and "Dina spel på loppet";
  finished/void show the top 3 and ruling text.
- **Result reveal** (from any tab): once per race per device (seen race id in localStorage), only
  after all of the player's bets on the race are settled. Win (payout count-up), loss (stake),
  refund (GM cancel), house kept stakes (inquiry void), or "watch" for players without bets. Not
  shown for races settled before the player signed up, or for cancelled races they had no bets on.
- **Snabblån**: opens automatically when balance < 10 RM and no bets are still open, never over a
  reveal or the bet confirm; "Inte nu" snoozes it for 90 s; the header button reopens it.
- **Mina spel**: staked / paid / net for the night, bets grouped per race with outcome chips.
- **Topplista**: Toppen (balance) and Kvällens största förlorare (balance minus debt, debt and loan
  count shown); own row highlighted, and pinned below the list when outside the top 20.
- `src/lib`: `useRaces()` hook; `loadSeenResult`/`saveSeenResult` and cookie flag helpers in
  `identity.ts`.
- Pure modules with tests: `src/client/slip.ts`, `src/client/outcome.ts` (86 tests total).
- Verified: build, test, lint; `npm run smoke -- --reset` against the local stack. Headless Chromium
  (throwaway `playwright-core` script) against the local stack with the GM at 1180x820 and three
  phones at 390x844: cold start to first placed bet in about 10 s of script time (connect sequence
  included), odds moving on the other phone, all-in, betting closed under an open confirm, running
  view, Snabbspola + auto-publish, loss and win reveals with correct payouts, no reveal again after a
  reload, Snabblån with debt in the header and the losers list, Mina spel, both leaderboards, GM
  cancel with refund reveal, offline banner and recovery. No horizontal overflow and no console
  errors. Hosted data was not touched.

**Deviations from META_PLAN**

- Tabs are local state, not routes (the client stays on `/`).
- A guest can place several bets per race, on any horses (the RPC always allowed it).
- Toasts sit at the top on the phone (the bet slip and tabs own the bottom).

**Open issues**

- The cookie banner covers the KYC submit button until it is tapped (one tap, any button).
- The header balance keeps its green/red colour until the next change (same as `OddsValue`).
- Bundle is 587 kB now; Stage 7 lazy-loading `/gm` still applies.

**Notes for Stage 6**

- Pop-up offers must stay out of the way of the shell's `blocked` state (bonus reveal, result reveal,
  bet confirm); add the offer engine in `ClientShell` next to `LoanOffer`.
- Fake win toasts can reuse `toast({ tone: 'win' })`; the client `Toaster` is top-anchored.
- `TOAST_NAMN` and `fakeWinToast` in `parody.ts` are still unused; `LEGAL_TEXT` only appears on the
  KYC screen.

**Manual steps for Simon**

- None. Optional: `npm run dev` and open http://localhost:5173 on a phone-sized window.

**Next:** Stage 6 (Parody layer + polish). Start a fresh session with:

> Read CLAUDE.md, docs/META_PLAN.md and docs/STATUS.md, then plan and execute Stage 6.

## Stage 6: Parody layer + polish (done, 2026-09-15)

Simon's choices: **moderate** pop-up pacing; optional extras **big-win celebration** and
**"Utbetalt i kväll" on the iPad**. The GM loser award screen was skipped.

**Done**

- **Pop-up offers** (`useOffers.ts`, `OfferPopup.tsx`, pure `offers.ts`): 7 offers in `OFFERS`
  (`parody.ts`): free spins for a slot that does not exist, VIP Platinum Diamant, deposit 0 RM get
  0 RM, cashback paid in comfort, "Alla hästar vinner" superboost, refer a friend, Leffe's sure tip.
  First offer 45 s after the shell opens, then 2 to 3 min after each close, never the same offer
  twice in a row. The countdown restarts with a new length (30 to 90 s) when it runs out and flashes
  "Förlängt! Bara för dig". One tap closes it (X, backdrop or "Nej tack, jag gillar att förlora").
  Accepting shows a joke toast or jumps to Spela. Nothing touches the DB.
- Offers are blocked by the shell's `blocked` (bonus reveal, result reveal, bet confirm), an open
  bet slip, being broke (Snabblån) and the cookie banner. If a reveal pops while an offer is open, the
  offer closes. After any block clears, the next offer waits at least 15 s. Snabblån also waits
  while an offer is open.
- **Fake social proof** (`useSocialProof.ts`, pure `proof.ts`): fake win toasts ("Kerstin från
  Tierp vann just 31 573 RM") every 18 to 35 s, and real toasts for other guests' bets on the active
  race ("Anna #36 satsade 100 RM på ..."; more than 2 at once fold into one). Bets already on the race
  at load are not announced. Quiet while `blocked`, offline, or the tab is hidden.
- **Social strip** under the phone header: a viewer count doing a bounded random walk and
  "Utbetalt i kväll" = a clock-grown fake base (from noon, like the jackpot) plus the real payouts.
- **iPad attract screen**: "Utbetalt i kväll" next to the logo, same number as the phones.
- **Small print** (`SmallPrint` in `src/ui`): a rotating `SMALL_PRINT` line plus `LEGAL_TEXT` at the
  bottom of Spela, Mina spel and Topplista. Longer `BONUS_BAR`.
- **Big-win celebration**: yellow RM plates rain over the win reveal (`CoinBurst.tsx`, `coin-fall`
  keyframes); more of them and the title "Storvinst!" when the payout is 1 000 RM or more, or at
  least 5x the stake (`isBigWin` in `outcome.ts`). Vibrates where the browser supports it (Android;
  iOS Safari has no vibration API).
- Sleazier copy in a handful of client, status and GM lines.
- `src/lib`: `getNightPaid()` (sum of winning payouts) and `useNightPaid()`, refetched on `races`
  changes only (settlement always updates the race, so bet inserts do not trigger refetches).
- `src/ui`: `RollingNumber` (the jackpot odometer, moved out of `Jackpot.tsx`), `NightPaidNumber`,
  `SmallPrint`; all three added to `/styleguide`.
- `src/shared/game/hype.ts`: `secondsSinceNoon`, `nightPaidDisplay`, `stepViewers`.
- `ClientShell` now owns `useRaceBets` for the active race and shares it as `raceBets` in `useGuest()`
  (Home no longer opens its own channel). The cookie accepted flag lives in `ClientApp`.
- Tests: `hype.test.ts`, `offers.test.ts`, `proof.test.ts`, `isBigWin` (109 tests total).
- Verified: build, test, lint; `npm run smoke -- --reset` against the local stack. Headless Chromium
  (throwaway `playwright-core` script, fake clock on one phone) against the local stack, GM at
  1180x820 and 1024x768, two phones at 390x844: no offer while the slip was open, none 10 s after it
  closed, one at 16 s; countdown restarted instead of reaching 0:00; one tap closed it; fake win toast
  shown; the other phone got real bet toasts; viewer count moved; win reveal with falling plates;
  "Utbetalt i kväll" rose after the race; small print on all tabs. No horizontal overflow, no console
  errors. Hosted data was not touched.

**Deviations from META_PLAN**

- The bonus bar was already there (Stage 3); this stage only lengthened its text.
- The jackpot number on the attract screen now also scales with the viewport width (`7vw`) so
  "RallyMynt" no longer slides under the QR code at 1024x768.
- No GM loser award screen (optional, not chosen).

**Open issues**

- Toasts on the phone are top-anchored and can briefly cover the header balance when several arrive
  together (bet toasts last 3.5 s, wins 4 s).
- `getNightPaid` reads at most 1 000 winning bets (PostgREST default row limit). Far above a party
  night, but the real part of the number would stop growing past that.
- Bundle is 598 kB; lazy-loading `/gm` in Stage 7 still applies.

**Manual steps for Simon**

- None. Optional: `npm run dev` and leave the guest app open for a minute to meet the first offer.

**Next:** Stage 7 (Deploy + dress rehearsal). Start a fresh session with:

> Read CLAUDE.md, docs/META_PLAN.md and docs/STATUS.md, then plan and execute Stage 7.
