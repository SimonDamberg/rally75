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

## Stage 7a: display/control split (done, 2026-09-16)

Simon's change before the deploy stage: the iPad becomes a **pure display** and his **phone** becomes
the admin device. The META_PLAN Decisions table (Devices, Race view, GM auth) was updated to match.

**Done**

- **Two GM roles behind one password gate**, one lazy chunk, routed in `src/gm/GmApp.tsx`:
  `/gm` = control phone (`src/gm/control/`), `/gm/display` = iPad (`src/gm/display/`). Separate URLs
  so each device's home-screen icon opens straight into its role. Shared logic stays at `src/gm/`.
- **Server-authoritative race clock.** `races.started_at` is now the only start time. New migration
  `20260916000006_race_clock.sql` adds `server_now()` (clock-offset measurement, security invoker)
  and `gm_skip_race(password, race_id, run_ms)` (Snabbspola moves `started_at` back). `src/lib/clock.ts`
  + `useServerClock()` correct for device clock drift. `loadRaceStart`/`saveRaceStart` and the
  `rally75.gmRaceStart` key are gone. This also retires the Stage 4 open issue about a second GM
  device replaying with clock skew.
- **Display** (`DisplayShell`): view is a pure function of race status. `Attract` idle,
  `FieldBoard` in paddock/closed, rotating `Spotlight` while betting, `RaceScreen` running,
  `ResultDisplay` for 45 s after settlement, then back to attract. `Attract` is now the standing
  chrome (join QR + trot parade) with a swappable left panel as `children`.
- **Horse spotlight** while betting: one horse at a time beside the QR, with story, kusk, form, note,
  tip, live odds and pool, plus a progress bar. `spotlight.ts` is pure and tested, keyed off
  `betting_at`, so a reload lands on the horse the room was already looking at. It does **not** reuse
  `HorseRow size="tv"`: those sizes overflow a 1024x768 iPad once the trot parade takes its share,
  so the card scales with the viewport instead.
- **Control phone** (`ControlShell`): bottom tab bar copied from `ClientShell`, all four tabs made
  phone-first. `BetsTab`'s 24rem sidebar stacked, `PlayersTab`'s 5-column table became cards,
  `KuskarTab` single column, `Login` no longer renders one unbreakable 64px word, `ResultPanel` took
  a `size: 'tv' | 'md'` prop. No `tv` sizes remain under `src/gm/control/`.
- **Publishing moved to the phone.** Auto-publish left `RaceScreen` for `control/RunningRace.tsx`;
  the display never publishes in the normal path. `InquiryOverlay` split into `display/InquiryDrama`
  (accusation + "domarna tittar", no buttons) and `control/InquiryRulings` (the three rulings).
  `display/useFallbackPublish.ts` publishes `'none'` ~12 s late **only** if the phone never did
  (flat battery); a late second publish is rejected by the server since it requires status `running`.
- Third manifest `public/display.webmanifest` (`start_url: /gm/display`, landscape);
  `gm.webmanifest` is now portrait. Both GM roles reuse the pink icon set (they live on different
  devices, so there is no confusion).

**Verified**

- `npm run build`, `npm test` (123), `npm run lint` pass.
- `npm run smoke -- --reset` passes against the **local** stack, including three new steps:
  `server_now` offset sanity, `gm_skip_race` (moves `started_at` back by the run length, wrong status
  and bad `run_ms` rejected, race still settles), and `night_paid` matching the winning payouts.
- Three-window headless run (control 390x844 + display 1180x820 and 1024x768) through a full race:
  attract, paddock on both, spotlight rotating, betting, closed, race starting on the display
  **426 ms** after the tap, Snabbspola on the phone reaching the display, result on both.
  **Publish calls: control 1, display 0.** No console errors, no horizontal overflow on any tab.
- Both migrations pushed to the hosted project; `night_paid()`, `server_now()` and `gm_skip_race`
  confirmed present there.

**Open issues**

- **The `GM_PASSWORD` in `.env.local` does not match the hosted project.** `npm run smoke` against
  hosted fails at `gm auth` with `gm_unauthorized`. The hosted `gm_auth` row is a valid bcrypt hash,
  so the password simply drifted (nothing in this stage touched it; only the local stack's password
  was set). Fix by running `supabase/snippets/set_gm_password.sql` in the Supabase SQL editor and
  updating `.env.local`. Until then, hosted smoke and `gm_reset_night` cannot run.
- Hosted still holds old rehearsal data (`night_paid()` = 548). Clear it with "Nollställ kvällen"
  once the password is sorted.
- Stage 7 proper is still open: load script, `docs/REHEARSAL.md`, `docs/PARTY_DAY.md`, and the
  deploy itself. Nothing is pushed to `main` yet.

**Manual steps for Simon**

1. Reset the GM password (see the open issue above) so hosted smoke and the night reset work.
2. On the iPad open `https://rally75.vercel.app/gm/display` in Safari and "Lägg till på hemskärmen";
   on your phone do the same with `https://rally75.vercel.app/gm`. Both ask for the password once.

## Playtest fixes: display bet feed, net-of-debt topplista, Bank tab (done, 2026-09-16)

Three notes from Simon's playtest, plus a broken migration found on the way.

**Done**

- **Bet toasts on the display iPad.** `useBetToasts` (`src/gm/display/`) announces every bet as it
  lands, folding more than one at a time into a single line. `freshBets` moved from
  `src/client/proof.ts` to `src/lib/realtime.ts` so both apps can use it (client and gm may not
  import each other); its tests moved with it. `<Toaster>` gained `size="tv"`: bigger text, lifted
  clear of the trot parade, and rendered as plain `<div>`s rather than buttons, since the display is
  pure output. It moved out of `GmApp`'s root into the two route components so only one mounts at a
  time (they share one store, so two would double every toast).
- **The spotlighted horse lists who is on it.** New pure `bettorsOn` in `src/gm/book.ts`: one row
  per player with repeat bets summed, biggest first, voids dropped, ties in arrival order. Capped at
  5 with "och N till"; the kusk note dropped to `line-clamp-3` to pay for the space.
- **"Toppen" ranks on saldo minus skuld.** New `netWorth` in `src/shared/game/economy.ts`, with
  `nightNet` re-expressed through it so the two cannot drift. `byBalance` became `byNetWorth`. The
  row shows an "Efter skuld" label whenever the player owes something, and goes red below zero.
- **New "Bank" tab** (4th tab, `src/client/Bank.tsx`): saldo, skuld and netto for the night, then
  repayment with chips 100/500/1000 plus "Allt", a "kvar efter" preview and a Snabblån button that
  is disabled until you are actually broke (the loan pop-up stays shell-owned). Pure maths and tests
  in `src/client/repay.ts` (named for the action, like `slip.ts`; `bank.ts` would collide with
  `Bank.tsx` on a case-insensitive filesystem). New RPC `repay_debt` in
  `supabase/migrations/20260916000009_repay_debt.sql`, with codes `bad_amount`, `no_debt` and
  `repay_too_large`, plus a smoke step covering all three.

**Deviations from META_PLAN**

- Debt repayment is a new mechanic; the Decisions table describes the Snabblån as one-way. It is
  deliberately **not** a way up either leaderboard: repaying moves saldo and skuld by the same
  amount, so `netWorth` and `nightNet` are both unchanged (asserted in `repay.test.ts` and in
  smoke). The Bank small print says so out loud.

**Fixed on the way (not asked for, worth knowing)**

- `20260916000008_kusk_seed_2.sql` **had a SQL syntax error** (a trailing comma before `]` in Emma's
  notes) and had therefore never applied anywhere. `npx supabase db reset` aborted on it, so no
  kuskar from it were ever in any database. One character removed; all nine now seed.
- That migration and `src/shared/content/kuskar.ts` had drifted apart, which is what
  `kuskSeed.test.ts` was failing on (already red before this work). Per Simon, the **seed file is
  the source of truth**, so `NAMED_KUSKAR` was regenerated from it and the file header now says
  which way that dependency runs.
- `field.test.ts` asserted exactly seven notes per kusk. The seed roster has 3 to 6, and
  `buildRaceCard` only needs one to pick from, so the rule is now "at least 3".

**Open issues**

- **Emma has 3 notes where everyone else has 5 or 6**, and the syntax error sat in exactly that
  block. It looks like an edit that was interrupted, not a decision. Worth a look before the party;
  add the missing notes to the seed file first, then rerun `npm test`.
- The hosted `GM_PASSWORD` drift from Stage 7a is still open, so all verification here was against
  the local stack. `20260916000008` and `20260916000009` are **not pushed** to hosted yet.

**Manual steps for Simon**

1. `npx supabase db push` to apply the kusk seed fix and `repay_debt` to the hosted project. The
   seed migration has never applied there, so this is also the first time the current kuskar land.
2. Decide on Emma's missing notes (see above).

## Butik: the black market (done, 2026-09-16)

Simon's addition after the playtest: RM should buy something real at the party. A fifth guest tab
where guests spend winnings on beer, shots and the right to pick the next song, plus a rack of
digital nonsense, with the whole catalogue editable from the control phone.

Simon's choices: **no fulfilment tracking** (a purchase is a receipt, not an order with a status),
**optional stock per item**, digital items are **jokes and cosmetics only**, and purchases are
**excluded from both existing leaderboards**, with a new "Kvällens största slösare" list instead.

**Done**

- Migration `20260916000010_shop.sql`: `shop_items` (namn, blurb, pris, `stock` null = obegränsat,
  `kind` physical/digital, `effect` none/title/badge, `sort`, `active`) and `purchases` (a receipt
  with `item_name`/`kind`/`price` snapshotted, so it survives the GM editing or deleting the item).
  Both public read, RLS as `kusks`, both added to the Realtime publication. New columns on
  `players`: `spent`, `title`, `badge`. Seeded with 10 physical and 9 digital items to edit.
- RPCs: `buy_item` (locks the item then the player, checks active/stock/balance, decrements stock,
  moves the price from `balance` to `spent`, applies a cosmetic, writes the receipt),
  `gm_upsert_shop_item`, `gm_delete_shop_item`, `gm_refund_purchase` (Ångra: RM back, shelf back,
  receipt gone, any granted title or badge kept). New codes in `errors.ts`: `item_not_found`,
  `item_inactive`, `out_of_stock`, `bad_price`, `bad_stock`, `bad_kind`, `bad_effect`,
  `purchase_not_found`.
- **Rank neutrality.** `netWorth` is now `balance - debt + spent`, so buying moves neither Toppen
  nor the förlorarlista, exactly as `repay_debt` moves neither. New `bySpending` sorter and a third
  `spenders` list on `useLeaderboard`. Asserted in `buy.test.ts`, `economy.test.ts`,
  `realtime.test.ts` and the smoke script.
- Guest: `src/client/Butik.tsx` (two shelves, stock pills, confirm modal, receipt modal, "Mina
  köp" with a night total) and pure `src/client/buy.ts` + tests (`checkBuy`, `stockLeft`,
  `shelves`, `afterBuy`, `purchaseTotal`). Fifth tab in `ClientShell` (`grid-cols-5`, labels
  dropped to `text-xs`); an open purchase confirm blocks pop-up offers the way the bet slip does.
- Cosmetics on show: `badgedLabel` in `format.ts` puts the bought emoji in front of the name on the
  Topplista, in the header and in the bet toasts on both apps; `players.title` shows as a pink line
  under the name on the Topplista. A third segment "Slösare" ranks on `spent`.
- GM control phone: `src/gm/control/ShopTab.tsx`, fifth tab. **Varor** is CRUD in the `KuskarTab`
  shape (stacked rows, since a name plus three buttons does not fit across 390 px) with mid-party
  shortcuts **+1** and **Slut**; **Sålt i kväll** is the live feed with **Ångra** per row, which is
  how Simon knows there is a beer to pour. `parsePrice`/`parseStock` added to `src/gm/parse.ts`
  with tests (an empty lager field is `undefined` = obegränsat, not an error).
- Display iPad: `usePurchaseToasts` announces every purchase to the room
  ("Kopare #89 köpte En kall öl för 500 RM"), folding a rush into one line, in the existing
  `<Toaster size="tv" />`.
- `gm_reset_night` needed no change: the catalogue survives (like kuskar) and receipts cascade off
  the deleted players. Asserted in smoke.

**Verified**

- `npm run build`, `npm test` (170), `npm run lint` pass.
- `npx supabase db reset` applies the new migration from scratch, then `npm run smoke -- --reset`
  passes all 20 steps against the local stack, including two new ones: **butiken** (`item_not_found`,
  `item_inactive`, `invalid_token`, `out_of_stock`, `insufficient_balance`, the happy purchase with
  `netWorth` unchanged, a cosmetic setting `badge`, the receipt in both feeds, and a refund putting
  the RM, the shelf and the receipt back) and **gm butik management** (upsert, update, every
  validation code, delete, `item_not_found`). The RLS step now also proves anon cannot write
  `shop_items` or `purchases`.
- Headless Chromium against the local stack, three windows (guest 390x844, control 390x844,
  display 1180x820): five tabs on both shells with no horizontal overflow, both shelves, an
  unaffordable item not buyable, buy to receipt to "Mina köp", the purchase toast on the iPad, the
  row in the GM feed, **+1 lager** reaching every device, Ångra removing the receipt and restoring
  both the balance and the shelf, and the buyer still ranked at 1 000 RM on Toppen after spending.
  No console errors on any of the three.

**Deviations from META_PLAN**

- The Butik is a new mechanic; the Decisions table has no shop row. It is deliberately not a way up
  or down either existing leaderboard (see the rank-neutrality note above), and no item can touch
  odds, bets or the balance beyond its own price.
- `netWorth` changed shape (`{balance, debt, spent}`). Every caller was updated; there is no SQL
  mirror of it, only of the constants.
- The guest tab bar is now five columns with `text-xs` labels. Checked at 390 px on both shells.

**Open issues**

- A purchase cannot be undone by the guest, only by the GM. That is deliberate (the beer is gone),
  but it does mean a mis-tap needs Simon.
- `getPurchases` reads the latest 200 receipts. Far above a party night, but the GM feed and the
  iPad toasts would miss anything older.
- The hosted `GM_PASSWORD` drift from Stage 7a is still open, so all verification here was against
  the local stack. `20260916000008`, `20260916000009` and `20260916000010` are **not pushed** to
  hosted yet.

**Manual steps for Simon**

1. Reset the GM password (`supabase/snippets/set_gm_password.sql` in the Supabase SQL editor, then
   update `.env.local`), then `npx supabase db push` to apply the kusk seed fix, `repay_debt` and
   this shop migration to the hosted project in one go.
2. Open the **Butik** tab on the control phone and set real prices and stock against what is
   actually in the fridge. The seeded catalogue is a starting point, not a decision.

## Kuponger: printed QR tickets (done, 2026-09-18)

Simon's addition: friends run physical games at the party (dart, beer pong), and winning one should
pay in RallyMynt. Printed tickets with a QR at `/k/<code>`, made and printed days in advance.

Simon's choices: **stacks of one-time tickets** (not a poster per game, not a code generated on a
member's phone), **250 / 500 / 1 000 RM** as Brons / Silver / Guld, minted and printed from a
**page at `/gm/kuponger`** on a laptop, and monitored through **iPad toasts plus that page**, so the
control phone keeps its five tabs.

**The security model** (the question that drove the design: can these be pre-printed without being
farmable?)

1. One-time use is enforced in SQL. `redeem_coupon` locks the row `for update` and the update
   carries `and redeemed_at is null`, so two phones scanning the same ticket in the same
   millisecond cannot both win.
2. Codes are 8 Crockford base32 characters from `gen_random_bytes`: 2^40 possibilities for the
   hundred-odd tickets that exist, with no sequence to increment. Fishing for a valid code through
   the RPC is hopeless, so there is no rate limiting to maintain.
3. Plaintext codes live in `coupon_secrets`, which has no grants and no policies (the
   `player_secrets` / `race_secrets` pattern) and is deliberately **not** in the Realtime
   publication. `coupons` is public read but holds no code. Proven in smoke.

The residual risk is physical: a ticket is a bearer token, so the stacks are handed out one at a
time and kept face down.

**Done**

- Migration `20260918000011_coupons.sql`: `coupons` (tier, amount, label, batch, redeemed_by,
  redeemed_at; public read, in the Realtime publication) and `coupon_secrets` (no grants). RPCs
  `redeem_coupon`, `gm_create_coupons`, `gm_batch_codes` (reprint a lost sheet), `gm_void_claim`
  (Ångra: RM back, ticket freed) and `gm_delete_coupon_batch`. New codes in `errors.ts`.
- `COUPON_TIERS`, `COUPON_MAX_AMOUNT` (5 000), `COUPON_MAX_BATCH` (200) and `COUPON_CODE_LENGTH` in
  `economy.ts`, mirrored in SQL and asserted byte for byte by `economy.test.ts`.
- Guest: route `/k/:code`, `ClientApp` parks the code and cleans the URL, `useCoupon` +
  `CouponReveal` (two beats: acknowledge the ticket, then the money lands, with `CoinBurst` over a
  guldkupong). Queues behind the bonus and result reveals and blocks offers while open. Bank has a
  typed-code fallback for a ticket whose QR will not scan.
- GM: `/gm/kuponger` (`src/gm/coupons/`), a third role behind the same password gate. Mint a run,
  print A4 sheets of twelve with cut lines, reprint a batch, delete a batch, and the "Inlösta i
  kväll" feed with Ångra. The QR address defaults to `window.location.origin` and warns when that
  looks like a dev server.
- Display iPad toasts every redemption (`useCouponToasts`), diffing on redeemed ids because a
  redemption arrives as an UPDATE, not an INSERT.
- First `@media print` in the repo, at the end of `src/index.css`.

**Verified**

- `npm run build`, `npm test` (192, up from 170) and `npm run lint` pass.
- `npx supabase db reset` applies the migration from scratch; `npm run smoke -- --reset` passes all
  21 steps against the local stack, including the new **kuponger** step (code shape, every error
  code, the happy redemption with `netWorth` up by the amount, `coupon_used` from both the same and
  a second guest, reprint returning the same codes, Ångra restoring the balance and freeing the
  ticket, batch delete taking the codes with it) and an extended **RLS** step proving anon cannot
  write `coupons` or read `coupon_secrets` at all.
- Headless Chromium against the local stack, four windows (laptop 1280x900, two phones 390x844,
  iPad 1180x820), 25 checks green: minting and the sheet, a **brand new** phone scanning `/k/<code>`
  through onboarding and the bonus reveal to a 2 000 RM balance, a reload not claiming twice, the
  same ticket refused for the second guest in Swedish, a hand-typed lowercase dashed code paying
  out, the iPad toast (and no toast for redemptions predating the load), the GM counts, Ångra
  freeing a ticket and the next guest then claiming it. No horizontal overflow anywhere; the only
  console error is the intended 400 behind the `coupon_used` toast.
- Print: 14 kuponger render as exactly 2 A4 pages (no trailing blank), a ticket is 66 mm in a
  264 mm page, and print media puts the body and the QR on white with the page chrome hidden.

**Deviations from META_PLAN**

- Kuponger are a new mechanic; the Decisions table has no row for them.
- **They are deliberately not rank neutral**, unlike the Butik and `repay_debt`. The RM lands in
  `balance` alone and lifts Toppen and `nightNet`, because winning at dart should be worth
  something. That makes this the only RM the GM can mint, hence the two SQL caps.
- Pure code helpers went to `src/shared/game/coupon.ts`, not `src/client/`: the printed ticket has
  to format a code the same way the guest's phone does, and `src/gm` may not import `src/client`.
- `useGuestAction(self?)` takes an optional explicit identity. `ClientShell` renders `GuestContext`,
  so it sits above its own context and could not otherwise use the standard guest RPC path; the
  alternative was duplicating the toast and sign-out logic. Found because the first browser run
  went blank with "useGuest utanför GuestContext".
- **Brand rule override, Simon's call:** the ticket carries a parody Mr Green logo
  (`public/kupong-logo.png`) as a colour corner mark, against the "no real gambling brand" rule in
  CLAUDE.md. Flagged before it went in. It is confined to the printed paper: it is not on the guest
  app, the iPad or anything reachable from a public URL, and the rule in CLAUDE.md now records the
  exception.

**Open issues**

- The ticket is colour in one corner and black elsewhere. Off a mono printer the frog prints as a
  dark block; print the stacks in colour, or use coloured paper per valör.
- `getCoupons` reads at most 500 rows, so a night with more printed tickets than that would show
  incomplete counts on `/gm/kuponger`. Far above a party.
- `gm_void_claim` clamps the balance at zero rather than going negative (the guest may already have
  spent the RM), so a claw-back after the money is gone is only partial. Deliberate.
- Untracked `.claude/` in the repo root (local settings plus a leftover worktree from an earlier
  session). Not committed here; worth a `.gitignore` line if it is not wanted.

**Manual steps for Simon**

1. Still open from Stage 7a: the hosted `GM_PASSWORD` has drifted, and `20260916000008`,
   `20260916000009`, `20260916000010` were never pushed. Reset the password with
   `supabase/snippets/set_gm_password.sql`, update `.env.local`, then `npx supabase db push` to
   apply those three plus this coupon migration in one go. Nothing here works on hosted until then.
2. On a laptop open `https://rally75.vercel.app/gm/kuponger`, check the address field says the
   Vercel host (not localhost), and print one run per game with that game's name as the etikett.
   Cut along the dashed lines and give each friend their stack, face down.
3. Delete any rehearsal batch before the party so nobody turns up holding a test ticket.

## Mr Green Nätcasino: umbrella rebrand of the guest client (done, 2026-09-19)

Simon's change: the guest phone is getting **meta functionality that is not horse racing** (a
Triss-parody skraplott tab is next), so the client stopped being a racing app. The model is now
**Mr Green Nätcasino is the site, Rally75 is the trotting product inside it**. Only the client
changed; `/gm`, `/gm/display` and `/gm/kuponger` are untouched, and the race visuals are identical.

Simon's choices: the blue **inset panel** (not a fully blue tab), the racing tab renamed **Rally75**,
the frog **mark in the header and the full lockup on the splash**, **guest-facing icons rebranded**,
**RallyMynt kept**, and the leftover hot pink accent switched to the **logo mint**.

**Approach: retheme by remapping CSS custom properties, not by editing components**

Tailwind v4 compiles `bg-tote` and friends to `var(--color-*)`, so redeclaring the variables on an
ancestor recolours everything below it. Verified against the installed `tailwindcss@4.3.3` before any
component was touched, and again in `dist/assets/*.css` after.

- `@theme` now names the Rally75 set (`--color-night-blue`, `--color-tote-blue`, `--color-sleaze-pink`,
  ...) and points the semantic tokens at it, so `.theme-rally75` restores the blues by reference and
  cannot drift. `#0d2a78`, the only colour literal left in `@layer base`, became `--color-night-glow`.
- Two unlayered scopes: `:root[data-brand='mrgreen'], .theme-mrgreen` (the greens) and
  `.theme-rally75` (back to blue for a nested subtree). Unlayered beats `@layer theme` on layer
  order, so no specificity games.
- Moved by brand: `night`, `night-deep`, `night-glow`, `tote`, `tote-hi`, `void`, `ink`, `ink-dim`,
  `sleaze`, `sleaze-shade`, `sleaze-ink`. Never `plate`, `cash` or `drift`.
- `index.html` sets `data-brand` on `<html>` in one inline script guarded on `!pathname.startsWith('/gm')`,
  before React mounts, so there is no flash of blue and GM never sees the attribute.
- `dialog::backdrop` got an explicit `[data-brand='mrgreen']` rule rather than a `var()`: `::backdrop`
  only inherits from its originating element on Chrome 122+ / Safari 17.4+, and on anything older the
  var would resolve to nothing and the scrim would go transparent.

**Done**

- **Brand asset**: `public/mrgreen-logo.jpg` (1200x800, 167 kB; the PNG source was 1.1 MB and the art
  has no transparency). New `src/ui/MrGreenLogo.tsx` with `mark` / `lockup` / `full`. `mark` crops the
  frog's head out of the same file in CSS (`background-size: 274% auto; background-position: 49% 0`),
  so there is no second asset, and the wordmark is drawn as text so it stays sharp at header size.
  `src/ui/Logo.tsx` is untouched and is now **Rally75 only**.
- **Client chrome**: header and both onboarding logos swapped; tab bar moved from `grid-cols-5` to
  `grid-flow-col auto-cols-fr` so the skraplott tab needs no class edit; `CLIENT_TABS.home` renamed
  "Spela" to "Rally75". Bank, Butik, Topplista, the pop-ups and the cookie banner needed **no edits**:
  they are built from tokens and went green on their own.
- **Rally75 panel**: `theme-rally75` on four existing elements, never a new wrapper (the bet slip is
  `sticky mt-auto` inside a flex column): the race panel in `Home.tsx` (which also covers `BetSlip`'s
  confirm modal by DOM inheritance), the `BetSlip` root, `MyBets.tsx`, and the `ResultReveal` modal,
  which needs its own because `ClientShell` renders it as a sibling. The panel got a real inset look:
  rounded blue ground, ring, and a lockup strip with `<Logo>` plus "Officiell travpartner".
  `SmallPrint` forces `theme-mrgreen` on itself, since the legal footer is the site, not the product.
- **Mint accent**: the pink was the one off-brand colour left on the green pages. In the Mr Green
  scope `sleaze` is now `#7fe3b1` (the logo's NÄTCASINO mint). Mint needs dark text where pink needed
  white, so text on a solid sleaze surface became the new `--color-sleaze-ink` token (white by
  default, `#052b12` under Mr Green) across eight components. The three GM pink badges keep
  `text-white` and are unaffected.
- **Copy**: `LEGAL_TEXT` and one `SMALL_PRINT` line now name Mr Green (Rally23 Holdings stays, which
  ties the two brands together), `errors.ts` `config`, `TICKET.brand`, and a new `BRAND` constant in
  `content/ui.ts` so no component spells either brand out.
- **Head, manifest, icons**: `index.html` title/OG/apple title and `theme-color` `#033317`;
  `manifest.webmanifest` renamed and recoloured. `scripts/icons.mjs` grew a `pageArt()` branch and a
  `guest` argument: `npm run icons -- guest` rewrites only `favicon`, `apple-touch-icon`,
  `icon-192/512`, `icon-maskable-192/512` and `og.png`. The maskable pair insets the mark inside a
  felt margin instead of zooming, so Android's circle crop cannot eat the hat. The OG card `contain`s
  the whole lockup on the art's own felt, so the letterboxing is invisible.
- `src/gm/useGmManifest.ts` also restores `theme-color` to `#07123a` while a GM route is mounted, since
  `index.html` now ships the green one. Its `setHref` became a general `setAttr`.
- `/styleguide` gained a **Varumärken** section: the Mr Green palette and all three logo variants
  inside `.theme-mrgreen`, with a nested `.theme-rally75` panel showing the same `HorseRow` in blue.

**Verified**

- `npm run build`, `npm test` (197, up from 192) and `npm run lint` pass.
- New `src/ui/theme.test.ts` reads `src/index.css` and asserts the two scopes declare the same
  `--color-*` names, that only surfaces/neutrals/sleaze move, that `plate`/`cash`/`drift` never get a
  brand override, and that `.theme-rally75` contains no hex.
- Compiled CSS checked in `dist`: `.bg-tote{background-color:var(--color-tote)}`, both scope blocks
  present, and all eight `--color-*-blue` tokens survived Tailwind's tree-shaking.
- Headless Chromium against the **local** stack (a seeded race in `betting`), guest at 390x844: cold
  onboarding through KYC to the shell, every tab, the bet slip, no horizontal overflow and no console
  errors. `/gm`, `/gm/display` and `/gm/kuponger` all reported `data-brand=none` and
  `--color-tote=#0b3a8c`, that is, unchanged. Screenshots kept out of the repo.

**Deviations from META_PLAN**

- The Decisions table says "Brand: Rally75". It is now two brands, with Rally75 as the racing product.
- This overrides the `CLAUDE.md` rule that kept the parody Mr Green mark on the printed ticket only.
  Simon asked for it directly; `CLAUDE.md` was rewritten rather than left contradicting the code. The
  GM surfaces still may not show it.
- `sleaze` is no longer "pink" by definition. It is the brand accent: pink on Rally75, mint on Mr Green.

**Open issues**

- Mr Green's mint `sleaze` (`#7fe3b1`) and the win colour `cash` (`#3dffa8`) share a hue and differ
  mainly in brightness. They never collide in practice (sleaze is a surface, cash is a number), but if
  a win ever reads as chrome, shift one of them. `cash` was deliberately left alone.
- `bg-tote/40`-style opacity utilities carry an inlined-hex fallback outside their
  `@supports (color: color-mix(in lab, ...))` guard, so on pre-Safari-16.4 they would paint Rally75
  blue inside the green shell. Accepted: party phones are well past that.
- `public/kupong-logo.png` (440px) and `public/mrgreen-logo.jpg` (1200px) are the same art at two
  sizes. The printed ticket was left pointing at the old file on purpose, to keep the print surface
  out of this change. Worth collapsing to one asset next time the kupong sheet is touched.
- `mrgreen-logo.jpg` is 167 kB on the guest path, which matters on a cold QR scan. A WebP would be
  about a third of that, but `sips` on this Mac cannot write WebP and there is no image library in
  the repo.
- Untouched from earlier stages: the hosted `GM_PASSWORD` drift, and `20260916000008`,
  `20260916000009`, `20260916000010`, `20260918000011` still not pushed to hosted.

**Manual steps for Simon**

1. Look at the green on a real phone before the party. The tokens are eleven lines in `src/index.css`
   under `:root[data-brand='mrgreen']`; changing the felt or the mint is a one-line edit each.
2. The guest home-screen icon and name changed ("Mr Green"). If you already added the guest app to a
   home screen, remove it and add it again to pick up the new icon. `/gm` and `/gm/display` are
   unaffected.
3. Still open from before: reset the GM password and `npx supabase db push` the four unpushed
   migrations.

### Follow-up pass, same day (Simon's notes from the screenshots)

- **"Mina spel" was entirely blue.** It is the site's ledger, not a race surface (the skraplott's
  results will land here too), so the tab chrome is Mr Green and **each per-race group is its own
  Rally75 panel**, the same inset the Rally75 tab uses. This is the rule the rest of the app follows;
  the first pass had put `theme-rally75` on the whole tab.
- **Pop-ups kept a pink glow.** `Modal`'s `sleaze` tone had the glow hardcoded as
  `rgb(255_46_136/0.45)`, so it did not follow the token when the accent went mint. It is now
  `shadow-[0_0_3rem] shadow-sleaze/45`, which compiles to a `var(--color-sleaze)` reference.
- **The scrolling marquee is now a gold band** with felt-green lettering and bulbs, instead of
  sharing the mint accent and shouting louder than the logo. It needed three tokens of its own
  (`marquee`, `marquee-ink`, `marquee-bulb`), because the bulbs and the `★` are plate yellow
  everywhere else and would have vanished on gold. The defaults keep GM's bar exactly as it was:
  verified in the browser that `/gm`, `/gm/display` and `/gm/kuponger` still resolve
  `--color-marquee: #ff2e88`, `--color-marquee-ink: #ffffff`, `--color-marquee-bulb: #ffd60a`.
- The `bulbs` utility now reads `var(--color-bulb, var(--color-plate))`, so a surface can pick its
  own bulb colour. Only `BonusBar` sets it; the seven other `bulbs` users are unchanged.

## Plånko: a Plinko tab in the Mr Green client (done, 2026-09-19)

The umbrella rebrand was made for a Triss-parody skraplott, but a guest is already coming dressed as
Triss, so Simon swapped it for **Plinko**: drop a ball through twelve rows of pegs, it lands in a
multiplier slot. Named **Plånko** (plånbok + Plinko, "Töm plånboken, en kula i taget").

Simon's choices: **Plinko only** (not Mines), **~90 % back**, the GM side gets **iPad toasts for big
hits and a stats card** (no controls), and Plånko gets **its own colour scheme**, embedded in the green
site the way the Rally75 panel is.

**Done**

- Migration `20260919000012_plinko.sql`: `plinko_drops` (public read, Realtime) and the guest RPC
  `plinko_drop`, which draws 12 random bits, pays and records the drop in one transaction. New code
  `stake_too_high`. `gm_reset_night` needed no change (drops cascade off players).
- Rules in `src/shared/game/plinko.ts`, mirrored in SQL and checked by string: 13 slots at
  100x / 12x / 4x / 1,5x / 1x / 0,5x / 0,3x (symmetric), RTP 3735,2 / 4096 = 91,2 %, stake 10 to 250,
  chips 10/25/50/100/250. Integer payout maths like `payoutFor`.
- Guest tab (second, after Rally75): an SVG board, balls animated with the Web Animations API along
  the server's path, several at once (max 8), the landing slot flashes, coins rain on 10x and up,
  last-drop line, history pills, night totals. `.theme-plinko` is a third token scope (violet
  ground, magenta pegs, same 14 tokens, never `plate`/`cash`/`drift`); `theme.test.ts` checks all three.
- **No spoilers**: the header holds the balance while balls fall (`heldBalance` from the new
  `balance_after` column, so it is right whichever of the RPC reply and the Realtime update comes
  first); the history ignores drops that have not landed on this phone; the iPad waits the fall time
  (`PLINKO_FALL_MS`) before toasting.
- GM: `PlinkoCard` at the bottom of the control phone's Spel tab (balls, in, out, house, best hit),
  and `usePlinkoToasts` on the iPad for hits of 10x and up.

**Verified**

- `npm run build`, `npm test` (216, up from 197) and `npm run lint` pass.
- `npx supabase db reset` + `npm run smoke -- --reset`: all 22 steps pass against the local stack,
  including the new **plånko** step (error codes, 50 drops with SQL payout = TS payout and
  `slot = popcount(path)`, `balance_after` tracking, the final balance) and RLS proving anon cannot
  insert a drop.
- Headless Chromium against the local stack: guest at 390x844 (six tabs fit, no overflow, violet
  panel; mid-fall the header read 950 while the DB already said 975, then matched on landing; five
  balls in flight at once; history only after landing), control phone card totals, iPad toast only
  after the fall time, `/gm` still without `data-brand`, no console errors.

**Deviations from META_PLAN**

- A second game is a new mechanic; the Decisions table has only races. Like a bet, it is not rank
  neutral.
- `night_paid()` ("Utbetalt i kväll") still counts race payouts only.

**Open issues**

- Plånko drops are not in "Mina spel"; the tab has its own history and night totals.
- `getPlinkoDrops` reads the latest 1 000 drops, so the control card undercounts past that. Spam
  dropping could get there on a long night; raise the limit or add an SQL sum if it matters.
- The local GM password was reset to a throwaway by `db reset` + smoke; set your own locally if needed.

**Manual steps for Simon**

1. `npx supabase db push` to apply this migration (with the four still-unpushed ones) to hosted.

## Snabblån under 50 RM, Plånko title fix (done, 2026-09-19)

- Plånko pays odd amounts, so guests were stranded on 23 or 41 RM: not broke enough for a Snabblån,
  too poor to play. New `LOAN_THRESHOLD` (50) in `economy.ts`, mirrored in
  `20260919000013_loan_threshold.sql` (`take_loan` refuses at 50 and up) and checked by
  `economy.test.ts`. The shell's `broke` (header button, the automatic pop-up, the Bank button) uses it,
  and the Bank's locked text names the amount. Smoke asserts 50 is refused and 49 gets the loan.
- The italic PLÅNKO title lost its last O on Safari: a `drop-shadow` filter clips paint outside the
  element box, and the synthesized italic leans past it. `pr-3` gives the slant room.
- Verified: build, 217 tests, lint, smoke (local, all steps), and a headless run where a guest on
  40 RM got the pop-up, the header button and a 540 RM balance after the loan.

**Manual step for Simon:** `npx supabase db push` for `20260919000013_loan_threshold.sql`. Until then the
client offers the loan between 10 and 49 RM but the server still refuses it.

## Landing page for new guests (done, 2026-09-19)

Simon wanted a landing page in front of the sign-up, so a scanned QR code no longer drops a guest
straight into the fake connect sequence. His choices: an **overhyped casino homepage** parody,
shown **only to phones with no account**, and a **kupong banner** on it when the guest arrived by
scanning a ticket.

**Done**

- `src/client/Landing.tsx`: gold marquee, sticky header (lockup + "Logga in", which like every other
  button just starts onboarding), `SocialStrip`, the kupong banner, a jackpot-sign hero (the
  `WELCOME_BONUS` rolls up inside chasing bulbs, with the offers' restarting countdown under the CTA),
  a ticker of invented wins (`fakeWinText`), the product shelf (Rally75 in its blue
  `theme-rally75` inset, Plånko in `theme-plinko`, Butiken on the green), three steps, swipeable fake
  reviews, CSS-drawn trust seals, a `<details>` FAQ with the Stödlinje, a final CTA, `SmallPrint` and an
  extra paragraph of fine print.
- `ClientApp`: a `started` flag in memory. No identity and not started shows `Landing`; its buttons
  set the flag and scroll to the top, and the connect + KYC flow runs unchanged. A reload goes back
  to the landing, which is fine. `hasKupong` is `code || loadPendingCode()`, because the effect that
  parks a scanned code runs after the first render.
- Copy: `LANDING` in `parody.ts`, plus `STODLINJE.lead.landing`. Nothing new in `src/ui`.
- Tests: `content.test.ts` checks every landing section has content, no "kr"/"kronor", and the step
  "Få 1 000 RM" equals `fmtRm(WELCOME_BONUS)` (with the no-break spaces), so the copy cannot drift
  from the economy.

**Verified**

- `npm run build`, `npm test` (220) and `npm run lint` pass.
- Headless Chromium against a production build (`vite preview`, hosted backend, read only, no player
  created) at 390x844: no horizontal overflow, no console errors, real "Utbetalt i kväll", the ticker
  and countdown tick, a CTA leads to the connect screen at the top of the page. `/k/TESTCODE1` cleans
  to `/` and shows the kupong banner. `/gm` still has no `data-brand`. Desktop at 1280 is a centred
  column.

**Deviations from META_PLAN**

- None from the Decisions table. The plan's styleguide entry was skipped: `/styleguide` imports no
  `src/client` component, and the page is easy to see by clearing site data.

**Open issues**

- On desktop the `SocialStrip` spans the full width while the page is a centred `max-w-md` column.
  Phones are the target, so it was left.
- The cookie banner still covers the lower half of the first screen until accepted, as it does over
  onboarding.

**Manual steps for Simon**

1. Open the guest URL in a private window (or clear site data) on a real phone to see the page.
   Nothing to push: no migration.

## Display iPad missed the race start (done, 2026-09-19)

**Bug (playtest):** after "Starta loppet" the iPad on `/gm/display` stayed on the closed field board
through the whole race and then went straight to the result.

**Cause:** the RPC was fine; the iPad missed the Realtime push. A start is one `races` UPDATE, and the
display only refetched on a push, a (re)subscribe or a visibility change. An idle iPad's WebSocket can
die quietly, and realtime-js only notices after a missed heartbeat (every 25 s by default, so up to
about 50 s). A race is about 20 s, so the reconnect came after the finish and the refetch found it
`finished`. The connection badge stayed "online" all along. A smaller hole: overlapping refetches in
`useLive` could land out of order.

**Done**

- `useLive` drops any fetch result that is not the newest one.
- `useLive` takes `pollMs`; `/gm/display` polls the active race every 3 s while visible. A late start
  is still in step, because `RaceScreen` replays against `started_at`. Guests and the control phone
  do not poll.
- Realtime heartbeat lowered to 10 s in `createSupabase`, so dead sockets reconnect (and refetch
  everything) sooner, on every device.

**Manual steps for Simon**

1. Deploy. No migration. To test: on the display tab, block `realtime/v1/websocket` in DevTools and
   reload, then start a race from `/gm`. The display should go live within about 3 s.

## Kusk faces instead of number plates (done, 2026-09-19)

Simon's call: the horses are shown by their kusk's face, and the stable is exactly the eight
friends (random kuskar were already off, `RANDOM_KUSKAR_PER_FIELD = 0`).

**Done**

- `public/kuskar/<slug>.jpg`: the eight faces, square crops at 512px (35 to 80 KB each), made by
  `scripts/kuskar.mjs` (`npm run kuskar -- ~/Downloads`) with `sips`, no new dependency. sips writes a
  black square if `--cropOffset` shares a call with a resize or format change, so the script does two passes.
- `KUSK_PHOTOS` + `kuskPhoto(name)` in `src/shared/content/kuskar.ts`. Lookup is by the stored
  `horse.jockey`, so there is no DB or `HorsePublic` change, and races already created show faces too.
- `SilkBadge` takes `photo` (+ `kusk` for the label): a round face in a ring of the silk gradient,
  the start number on a small yellow slanted plate at the lower right. Lead keeps the yellow glow; galopp
  uses a new `animate-rock` (the wobble without the skew). Without a photo it is the old plate.
- `HorseBadge horse={h}` does the lookup and now draws every horse: `HorseRow`, `ResultPanel`,
  display `RaceScreen`/`TrotParade`/`HorseSpotlight`, control `BetsTab`/`RunningRace`, client
  `Home`/`BetLine`/`BetSlip`/`ResultReveal`, styleguide. The attract parade shows four random friends.
- The display iPad preloads all eight faces on mount, so the first race's lanes do not pop in.
- Travpensionären Bengt is gone: removed from `NAMED_KUSKAR` and by the new
  `20260919000014_kusk_seed_3.sql` (delete the eight + Bengt by name, reinsert the eight unchanged, so
  hand-added kuskar survive and `kuskSeed.test.ts` reads the current roster).
- `kuskPhotos.test.ts`: every stable kusk has a photo, every mapped file exists, unknown names fall back.

**Open issues**

- `npm run lint` fails on this machine because the leftover worktrees in `.claude/worktrees/` give
  typescript-eslint several tsconfig roots. Remove them (`git worktree remove`) or run
  `npx eslint . --ignore-pattern '.claude/**'` (clean). This predates this change.
- Simon's photo is very tight (the face fills the whole frame), so his badge is mostly nose.

**Manual steps for Simon**

1. `npx supabase db push` (removes Bengt from the hosted `kusks` table). Then deploy.

## Scripted races: fair odds, drama and slapstick on the display (done, 2026-09-19)

Simon asked how the result is decided and whether the race on `/gm/display` could be more exciting
and funnier. His calls: the winner is drawn to match the odds, full slapstick, about 30 s per race,
and lanes show who has money on each horse.

**Before:** every tick each horse added `strength * noise` to its distance, and the biggest total won.
The stronger horse gained on every tick, so over 3000 seeds the favourite won **84 %** at average odds
2.26 (a flat favourite bet returned 1.86 RM per RM, so the house bled). The leader at 60 % won 90 % of
the time, 58 % of races were wire to wire, and only 10 % had a late lead change.

**Done**

- `simulateRace` draws the result first: Plackett-Luce over `winWeights(stats)` (new in `odds.ts`,
  also used by `buildField` for the morning line, which is unchanged). Then it draws a storyline
  (`wire`, `comeback`, `collapse`, `duel`, `pack`) and keyframes each horse's gap to the leader so
  the race tells it and ends on the drawn order. A smooth seeded wobble goes on top. Position never
  drops except during the `backwards` gag.
- Gags: galopp (from temper, as before) plus `backwards`, `graze`, `wave`, `selfie`, `seagull` and
  `turbo`. They happen between ticks 12 and 55, recover before the upplopp, and each gets its own
  commentary line. `RunnerFrame.gag`, `RaceTimeline.script` and `RaceTimeline.gags` are new;
  `broke` is kept for galopp.
- 100 ticks of 300 ms (30 s). From `STRETCH_TICK` (76) the last 15 % runs at half speed, a slow-motion
  upplopp done without touching `raceClock`. `RaceFrame.stretch` flags it.
- Commentary is built from state and script: storyline lines, "favoriten ligger sist", the turn, the
  upplopp, "NOS MOT NOS!", skräll (winner at morning line 4.0 or longer), and "... och vann ändå"
  when the winner had a gag. Lines are ranked by priority and kept at least 7 ticks apart.
- Finish pause raised to 3.0 s (4.2 s on a photo) so the room gets the stamp and the coins.
- Display (`RaceScreen` = data, new `RaceTrack` = drawing, `GagSprite`):
  - scrolling turf, trotting badges and dust
  - a live placing chip with ▲/▼
  - gag props and stickers
  - lane backers ("250 RM: Kalle #12, ...", via `laneBackers` in `book.ts`) and "X RM står på spel"
  - an upplopp banner with zoom and vignette
  - a photo finish with flash, grayscale, scan line and a delayed VINNARE stamp
  - winner stamp plus coin rain, and a SKRÄLL banner
- Dev-only race lab at `/styleguide/race`: any seed, scrub, and buttons for "next seed with this
  script or gag".

**Measured (5000 seeds, favourite first)**

| | before | now |
|---|---|---|
| Win rate by odds rank | 84 / 14 / 2 / 0 % | 38 / 29 / 19 / 13 % (win chance 39 / 28 / 20 / 13) |
| Flat bet return per RM | 1.86 on the favourite | 0.84 to 0.91 on every rank |
| Lead change in the last quarter | 10 % | 71 % |
| Wire to wire | 58 % | 11 % |
| Photo finish | 14 % | 24 % |
| Races with a gag (galopp included) | 65 % galopp | 84 % |

**Verified:** build, tests (228) and `npx eslint . --ignore-pattern '.claude/**'` all pass. I
screenshotted every gag, the upplopp, a photo and a skräll in the race lab at 1180x820. Then I ran a
full race on the local stack: 4 guest bets, the display showed the backers, a mid-race reload resumed
in step with the phone, Snabbspola from the phone, an inquiry (dismissed from the phone), and the
winner shown on the display was the one settled and paid.

**Deviations:** none from META_PLAN's Decisions. The sim is no longer the prototype's model, so
`simulateRace`'s description in META_PLAN ("gap-based screen positions, MÅLFOTO under 1.6, 10 %
inquiry") still holds, but the winner is now drawn rather than emergent.

**Open issues**

- The house result changes a lot: favourites win about 40 % instead of 84 %. That is the point, but
  guests who learned "always the favourite" will lose more.
- Lane text (name and backers) sits under the horses for the first few seconds, as the names did
  before.
- Races created before this deploy replay with the new engine (same seed and stats, a new story and
  possibly a new winner). Harmless between races.

**Manual steps for Simon**

1. Deploy **between races**, then reload both GM devices. If the phone and the iPad run different
   builds during a race, they can show different races. No migration.


## Race gags, round two: the party in-jokes (done, 2026-09-19)

Simon's picks. Graze, wave and seagull are gone (and a first draft's wheel, phone, wasps, UFO and
proposal never shipped). The comic set is now:

- **Kept:** fel håll, selfie and turbo
- **New slapstick:** sover, bananskal and Snabblån
- **Party in-jokes:** Husvagnspanik, Kommitté-incest, Serverkrasch, Fatbyte, Eckerölinjen, Glömde
  rallyhäftet and Hjälprebus

Galopp is unchanged.

**Done**

- `GagKind`, the sim tables (`COMIC_GAGS`, `GAG_DRAG`, `GAG_TICKS`), `GAG_LINES`/`GAG_WIN`, the
  stickers in `GM_RACE.gag` and the `GagSprite` props, all for the new set.
- Kommitté-incest is the first **two-horse gag**. Two losers in adjacent lanes both slow down, and
  the one ahead gives up extra ground so they end up level. `RaceGag.partner` and
  `RunnerFrame.partner` name the other horse. The badges lean into each other, the couple gets one
  commentary line (`KOMMITTE_LINES`) and shares one sticker.
- Serverkrasch freezes the horse, then gives the lost ground back in a single tick (a new per-gag
  `recover`), with a glitch animation and a 404 chip.
- `BOOSTS` (turbo, husvagn) never land on the winner. The stop gags (sover, serverkrasch, fatbyte,
  Eckerölinjen) now truly stand still, and so kick up no dust.
- Comic gags are a bit more frequent: 70 % of races get one, and 30 % of those a second. 87 % of
  races now have some gag, galopp included.
- New tests: kommitte is always an adjacent pair of losers, boosts never hit the winner, and a
  server crash snaps back. The race stats (win rates, house edge, late lead changes, photos) are
  unchanged.

**Manual steps for Simon:** as before, deploy between races and reload both GM devices.

### Follow-up: more gags (Simon's call, 2026-09-19)

- Every race now gets at least one comic gag, 70 % get a second and 30 % a third, with up to four gag
  moments per race counting galopp.
- 5000 seeds: comic gag in 99.7 % of races, and gag moments per race 1: 9 %, 2: 34 %, 3: 39 %,
  4+: 18 %. Results unchanged: favourite 38 %, late lead change 71 %, photo 24 %, wire to wire 9 %.
- Gag lines outrank the early and halfway lines, so on busy races the commentary is mostly gags.

## The display credits Mr Green (done, 2026-09-19)

Simon's call: the iPad should show that Rally75 is part of Mr Green Nätcasino, since guests play
on the Mr Green site on their phones. The display stays Rally75 blue and never gets `data-brand`.
It credits its owner in four places:

- **Marquee:** the top `BonusBar` carries `theme-mrgreen`, so it is the guest app's gold band with
  green lettering and bulbs. The text is `ATTRACT.marquee`.
- **Credit line:** "En del av Mr Green Nätcasino" with the frog under the Rally75 logo
  (`AttractMain`).
- **QR:** the frog and "på Mr Green Nätcasino" under "Skanna och spela". It stays up in every view
  except the race itself.
- **Corner logo:** `MrGreenBug` (the frog at 80 % opacity) at the right of the `RaceTrack` header and
  top right of `ResultDisplay`. `DisplayShell` preloads the art with the kusk faces.

**Deviation:** relaxes the Two brands rule in CLAUDE.md, which has been rewritten to allow these four
and nothing else. `/gm` and `/gm/kuponger` stay pure Rally75.

### Follow-up: longer gags instead of slow motion (Simon's call, 2026-09-19)

- An ultrarapid mode (the whole race slowing to a third around each gag) was tried and reverted
  (`84cafad` reverts `297c48d`). Instead, every gag now lasts a fixed 7 ticks (2.1 s, up from 3 to 7
  ticks) so the sticker and the line can be read.
- Drag per tick was scaled down for the gags that keep moving (galopp, selfie, banana and so on), so
  a gag costs about the same ground as before. The standing gags (sover, serverkrasch, fatbyte,
  Eckerölinjen) still stand still.
- 5000 seeds: comic gag in 99 % of races, and gag moments per race 2: 34 %, 3: 42 %, 4+: 15 %.
  Results unchanged: favourite 38 %, late lead change 70 %, photo 24 %, wire to wire 9 %.

### Follow-up: a gag in the upplopp (Simon's call, 2026-09-19)

- In 40 % of races the winner or the runner-up (50/50) gets a gag on the way home: it starts at
  `STRETCH_GAG_TICK` (82, six ticks after the UPPLOPPET line), lasts the usual 2.1 s, drags half as
  hard (the field is at half speed), and the ground comes back over 10 ticks, before the line.
- A stalled winner gets passed about half the time and storms back; the last-100 m line becomes
  "X ÄR TILLBAKA!" and the finish line uses the upplopp gag ("... och vann ändå!"). A stalled
  runner-up is why it loses; a turbo on the runner-up can send it into the lead before it fades.
- Never kommitte, never a boost on the winner. The result is untouched (the order is still drawn
  first). Late lead changes rose from 70 % to 75 %; photos and win rates are unchanged.

### Follow-up: closed keeps the horse spotlight (Simon's call, 2026-09-19)

- The static `FieldBoard` on the display while betting is closed was dull, so it is gone. `closed`
  now shows the same rotating `Spotlight` as `betting`. The rotation is clocked from `betting_at`, so
  it carries on without a jump; only the header changes from "Spelet är öppet" to "Spelet är stängt".
- `FieldBoard.tsx` and the `ATTRACT.closedSub` line are deleted.

### Follow-up: red "stängt" and a held start (Simon's call, 2026-09-19)

- The display's closed header now reads "Spelet är **stängt**" with the last word in `drift` red,
  with "Loppet startar strax" under it (`ATTRACT.closedTitleLead` / `closedTitleWord` / `closedSub`,
  the name reused for a new line). The spotlight rotation itself is unchanged.
- The start is held: `gm_set_status` stamps `started_at` three seconds into the future
  (`20260919000016_start_countdown.sql`, mirrored by `START_COUNTDOWN_MS` in `src/gm/raceClock.ts`
  with a test on the SQL string). The countdown is therefore the negative side of the same server
  clock the race replays against, not a local delay, so both devices count to the same zero and
  tick 0 is still the first stride.
- The display shows `StartCountdown` (3, 2, 1 in plate over a dimmed track, then KÖR on cash green
  for 0.8 s) as an overlay child of `RaceTrack`; the control phone's phase line says "Startar om 3"
  and "Och de är iväg" so Simon knows why the field is standing still.
- Auto-publish, the display's fallback publish and Snabbspola all measure from `started_at`, so they
  shift with it and needed no change. Smoke passes against the local stack.

**Manual step for Simon:** `npx supabase db push` before the party, otherwise the hosted database
still starts races without the countdown (the screens handle that fine, they just cut straight in).

## Playtest fixes: a shorter guest screen (Simon's play session, 2026-09-20)

Seven notes from Simon's playtest, all on the guest phone. Nothing touches the GM iPad or the GM
phone; the two shared components got new optional props, so every other call site is untouched.

- **Bets are marked in the field.** `HorseRow` takes a new `mine?: number` (the RM this guest has on
  the horse): the row gets a plate ring and a plate line "Du 150 RM" under the pool. `Home.tsx`
  builds a `Map` from the player's bets on the race (summed, since the same horse can be backed
  twice) and passes it to both the bet list and `FieldSummary`, so the marking survives the betting
  close and the result. "Dina spel på loppet" stays where it was.
- **A smaller status banner.** `StatusBanner.raceNo` is now optional; without it the dashed "LOPP N"
  ticket is not drawn. The client passes none, the GM surfaces pass it as before. At `md` the title
  is `text-2xl` (was `text-3xl`) with tighter padding; every `tv` class is untouched.
- **"Mina spel" removed.** The tab, `MyBets.tsx`, `CLIENT_TABS.bets`, `EMPTY_BETS`, `useRaces` and
  `groupByRace` (with its test block) are gone. `totals` stays: `revealFor` uses it. `MY_BETS` is
  cut down to the two keys `BetLine` still reads. Five tabs in the row now.
- **"Slösare" removed from the Topplista.** The view, `bySpending`, `Leaderboard.spenders` and
  `BOARD.spenders*` are gone, and `BUTIK.smallPrint` no longer promises a list that does not exist.
  `players.spent` and `netWorth` are unchanged: buying is still rank neutral, and the tests that say
  so (`buy.test.ts`, `economy.test.ts`, smoke) were left alone.
- **Plånko fits.** The tagline is gone, the board is `max-w-[17rem]` centred (the viewBox and the
  `drop.ts` geometry are untouched, so the fall and `drop.test.ts` are unchanged) and the panel's
  `gap-3` is now `gap-2`.
- **The horse's story is gone in the client.** `HorseRow` takes `story?: boolean` (on by default).
  The paddock in `Home.tsx` passes `story={false}` and keeps the kusk's line and the form row; the
  GM surfaces and the styleguide pass nothing and keep the story.

`npm run build`, `npm test` (230 tests) and `npm run lint` are green. The styleguide shows both new
variants (a status banner without the ticket, a bet list with marked bets).

## Gags with consequence: the gag decides the race (2026-09-20)

Simon: the gags are funny but they do not show up in the result. A horse that took a gag in the
upplopp dropped to fourth and sprinted back to win. Now a gag costs places.

**The idea.** The result is still drawn first, from `winWeights`, so the morning line tells the truth
and the house edge is untouched (that test is unchanged and green). What changed is that gags are
aimed at horses that were going to lose anyway, and that the ground they take does not come back:
every gag has a `kept`, summed per horse into `hold`, and `planScript` pays for it by drawing that
horse exactly that much further up the road for the whole race. `gapAt(plan, 1) + hold === final`, so
the line lands on the drawn order to the decimal. A boost is the same translation with the sign
flipped: the horse is drawn further back and keeps what it gains.

- **The upplopp gag** never goes to the winner any more. It takes `order[2]` (the first horse outside
  the top two), pins it in front at the entry to the upplopp and lets it stand still for seven ticks
  while the field goes past. It loses 3 to 5 lengths for good (2 to 3.5 in a pack race). Never
  serverkrasch: its one-tick snap back is the wrong shape for the gag that decides the race.
- **Hard gags** (`HARD_GAGS`: backwards, nap, serverkrasch, fatbyte, eckerö) only go to a horse that
  finishes in the back half. **Boosts** (turbo, husvagn) only to one that finishes in the top two, and
  they may therefore land on the winner now, which used to be forbidden. **Light gags**
  (`LIGHT_GAGS`, galopp included) are the only ones a winner can run off, so the "vann ändå" lines
  are still there but rarer.
- **A horse keeps ground once.** A second gag on the same horse is pure slapstick and is run off
  completely.
- `drawGags` is split into `pickGags` (who, when, what, how much stays lost) and `planDrags` (the one
  drag that needs the finished plan, the kommitté pair levelling out). The comeback turbo is a real
  boost now, not just for show, and the boosts' surge is shorter (`BOOST_RECOVER`) so it is over
  before the upplopp.
- The last tick's reference line is now lifted clear of every horse's second to last position, not
  just the leader's, so the old `Math.max` clamp at the line could go: everyone takes a real stride
  over it.

**Copy.** `COMMENTARY.backAgain` ("är tillbaka!") is gone, it can never happen. New
`COMMENTARY.stalled` at the hundred metre mark and new `STRETCH_ROBBED` at the line. `GAG_WIN` is
cleared of the five hard gags and has gained `husvagn`.

**Numbers after the change** (3000 seeds): late lead changes 0.71 (the requirement was 0.35), photo
finish 0.235, upplopp gag 0.403, and the upplopp victim is at most 1.16 lengths behind at the entry
to the upplopp. The scripts still hold: in a wire to wire race the winner leads at the mid-race line
in 83 percent of races, in a comeback race 0 percent, in a collapse race 3 percent.

**New in the lab.** `/styleguide/race` has an Upploppsgag button that jumps to the next seed with
one. Use it to watch the stall.

`npm run build`, `npm test` (232 tests) and `npm run lint` are green. Nothing in `types.ts`, the
database or `RaceTrack.tsx` changed: `RaceGag` has the same shape and the timeline is always
recomputed from the seed.

**For Simon:** no manual step. Run a couple of races in the lab and say if the upplopp gag should
cost more or less (`UPPLOPP_DROP` in `sim.ts`).

## Five more gags: Frossa, Vaniljsås, Sänka skepp, Olvisvep, Goblin mode (2026-09-20)

Simon's order. Three new mishaps and two new boosts, with the tiers he picked:

- **Frossa** (light): the kusk has the chills, the horse shivers on the spot and asks for a blanket.
- **Vaniljsås** (hard): the kusk drinks vanilla sauce straight from the carton mid-race and regrets
  it immediately.
- **Sänka skepp** (light): the kusk calls "E5?" and nobody answers. A solo gag on purpose, the
  loneliness is the joke, so no pair like the kommitté.
- **Olvisvep** (boost): the kusk downs an Olvi and finds another gear.
- **Goblin mode** (boost): the horse loses every last manner and pulls away.

**Done**

- `GagKind` has five new members, which is what makes TypeScript point at every place that needs a
  line: `GAG_LINES`, `GAG_WIN` and `GM_RACE.gag`.
- Tiers in `sim.ts`: `LIGHT_GAGS` gains frossa and sänka skepp (so they can reach the winner and have
  their own "vann ändå" lines), `HARD_GAGS` gains vaniljsås (only a horse that was going to lose
  anyway), `BOOSTS` gains olvisvep and goblin (only a horse that finishes in the top two). The
  catalogue is now 8 light (galopp included), 6 hard, 4 boosts and 1 pair, 19 kinds in all.
- `GAG_DRAG`: frossa 0.85, sänka skepp 0.95, vaniljsås 1.7, olvisvep -0.65, goblin -0.78. Every drag
  covers what its tier keeps over the seven gag ticks (1.2 light, 3.6 hard, -2.8 boost) with room to
  spare, and the boosts' drags sit in the same band as turbo and husvagn so the surge is over before
  the upplopp.
- Sprites in `GagSprite.tsx`: 🥶 plus rising ❄️, 🥛 plus 🤢, 🚢 plus an "E5?" chip (the same shape as
  the 404 chip), 🍺 with speed lines and 👺 with speed lines. `GAG_MOTION` shakes frossa and goblin
  and rocks vaniljsås and olvisvep. Vaniljsås and sänka skepp stand still, so they kick up no dust.
- The three mishaps are automatically candidates for the upplopp gag (it draws from `COMIC_GAGS`
  minus kommitté, serverkrasch and the boosts).
- New test: per gag kind, the mean ground lost must be positive for every mishap and negative for
  every boost. That is the invariant a drag that is too small would break. The older tests cover the
  rest by themselves: tier exhaustiveness, that every kind shows up over 3000 seeds, and that hard
  gags land behind while boosts land in front.

**Numbers** (3000 seeds): each new kind appears in 10 to 13 percent of races, in the middle of the
band the old ones sit in. The race statistics are unchanged, and every excitement and house edge test
is green.

`npm run build`, `npm test` (233 tests) and `npm run lint` are green. Nothing in the database, the
RPCs or the `RaceGag` shape changed.

**For Simon:** no manual step. Open the lab at `/styleguide/race` and click the five new gag buttons
to see them. One thing to look at: with four boosts, 43 percent of races now get a boost, and in 24
percent it sits on the winner. Say the word if that is too many and we move one of them down to the
light gags.

## Vinstkort: reusable prize QR cards, scanned in the app (done, 2026-09-23)

Simon's addition, **next to** the one-time kuponger (which are unchanged): each friend running a
physical game carries one printed card worth **100 / 500 / 1 000 RM** (Brons / Silver / Guld) and
flashes it only at whoever just won. The winner scans it with a **scanner inside the Mr Green app**
and the RM lands. The card is never used up. A guest can claim at most once every **5 seconds**
(Simon's number).

**The security model, stated honestly**

1. The server cannot tell a camera scan from a replayed string, so the in-app scanner is friction,
   not a lock. The QR holds `MRG1:<code>`, not a URL, so a phone's camera app does nothing with it,
   and the app never shows the decoded code. The code is not printed as text on the card either.
2. Codes live in `prize_card_secrets` (no grants, no policies, not published), like `coupon_secrets`.
3. The 5 s cooldown is per guest across all cards, enforced in `claim_prize_card` under a lock on the
   player row. It stops a double scan of one flash, not farming.
4. **Residual risk:** a guest who photographs a card can farm it every 5 s (12 000 RM a minute off a
   guldkort). The countermeasures are the GM's: the feed tags repeat claims ("3:e gången på det här
   kortet"), **Pausa** stops a card, **Ny kod** kills every photo of it (reprint the card), and
   **Ångra** takes a claim back. Keep the cards in a pocket between wins.

**Done**

- Migration `20260923000017_prize_cards.sql`: `prize_cards` (tier, amount checked against the tier,
  label, active; public read, Realtime), `prize_card_secrets`, `prize_claims` (snapshot of tier,
  amount, label; `card_id` set null on card delete so tonight's payouts stay in the feed; cascades
  off players, so `gm_reset_night` needs no change). RPCs `claim_prize_card`, `gm_create_prize_card`,
  `gm_prize_card_code` (reprint), `gm_rotate_prize_card`, `gm_set_prize_card_active`,
  `gm_delete_prize_card`, `gm_void_prize_claim`. New error codes in `errors.ts`.
- `PRIZE_CARD_TIERS` and `PRIZE_CARD_COOLDOWN_S` in `economy.ts`, mirrored in SQL and asserted by
  `economy.test.ts`, which also checks that no statement grants, publishes or adds a policy on the
  secrets table.
- `src/shared/game/scan.ts`: `cardPayload` / `parseScan`. The scanner also recognises a **kupong**
  QR (`…/k/<code>`) and hands it to the existing `coupon.redeem`, so a guest already in the app can
  cash a kupong without the camera app. That is the only touch on the kupong flow.
- Guest: `Scanner.tsx` (qr-scanner, **lazy chunk**, 16 kB plus a 44 kB worker; Swedish states for
  starting, blocked camera and no camera), `usePrizeCard`, `PrizeReveal` (one beat, `CoinBurst` for
  a guldkort). Entry point: the **Skanna QR-kod** button in Bank's kupong section (a header pill
  was tried and removed at Simon's request). The scanner and the reveal both join the shell's `blocked`.
- GM: a **Vinstkort** section at the bottom of `/gm/kuponger` (create, list with payout totals,
  Pausa/Aktivera, Skriv ut, Ny kod, Radera, "Vinstkort idag" feed with Ångra and a repeat tag).
  `PrizeCardSheet` prints one big card per A4 (70 mm QR, frog corner mark as on the kupong).
- iPad: `usePrizeClaimToasts` ("Kortis #21 vann 1 000 RM i Dart").

**Verified**

- `npm run build`, `npm test` (243) and `npm run lint` pass.
- `npm run smoke -- --reset` against the local stack: all 23 steps, including the new **vinstkort**
  step (tier guard, payout lifts netWorth, immediate re-scan `card_cooldown`, a second guest right
  away is fine, same guest again after 5 s, pause, rotate kills the old code, Ångra, delete keeps
  the claims) and the RLS step extended to the three new tables.
- Headless Chromium with a fake camera fed a video of a card QR: a phone at 390 scans, the reveal
  shows Guldkort 1 000 RM, the header goes to 2 000 RM, an immediate re-scan shows the cooldown
  toast, the iPad toasts, the GM feed lists the claim, a paused card is refused on a second phone and
  pays after Aktivera, Ångra takes it back live, and a kupong QR through the same scanner redeems.
  No horizontal overflow at 360 or 390.
- **Not verified on a real phone.** Camera permission on iOS Safari needs HTTPS, so test on the
  Vercel deploy.

**Deviations / notes**

- Vinstkort are a new mechanic, with no row in the Decisions table. Not rank neutral, like kuponger.
- The header is tight: at 360 px with a six-digit balance the Mr Green lockup runs under the
  Stödlinje chip. That predates this change and is still open.
- `eslint.config.js` now ignores `.claude/`: the leftover worktree in there made `npm run lint`
  fail with a tsconfigRootDir error.
- New dependency: `qr-scanner` (MIT, uses the native `BarcodeDetector` when present).

**Manual steps for Simon**

1. `npx supabase db push` to apply `20260923000017_prize_cards.sql` to hosted (plus anything still
   unpushed from earlier stages).
2. On the deploy, open `/gm/kuponger`, scroll to Vinstkort, make one card per game, print, cut,
   laminate if you can.
3. Test one scan on a real iPhone and an Android over HTTPS: the first scan asks for the camera.
4. During the party, watch the "Vinstkort idag" feed for repeat tags. If a card leaks: Ny kod,
   reprint, swap.
