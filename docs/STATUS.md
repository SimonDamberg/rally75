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
