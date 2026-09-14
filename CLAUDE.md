# Rally75

V75/V85 parody betting site (with casino sleaze) for Simon's online-casino-themed party.
Guests bet on their phones (`/`), Simon runs races as game master on an iPad (`/gm`),
Supabase is the shared backend.

- `docs/META_PLAN.md`: the contract between stages. Its Decisions table is fixed.
- `docs/STATUS.md`: handoff log. Read it first, append your stage's section when done.
- `docs/prototype/`: the original single-file prototype + its context doc. Reference only,
  never import from it or edit it.

## Hard rules

- **Swedish** in all user-facing text, including errors, empty states and loading states.
- **No em dash** (U+2014) anywhere under `src/`, in any language. A test enforces this. Use a
  comma, a period or parentheses instead. In source code write `'\u2014'` if you must refer to it.
- **No audio.** No sounds, no speech synthesis. Drama is carried visually.
- Never use ATG's real name or logo. The brand is Rally75.
- Balance is authoritative in the DB and changes **only** through server-side RPCs.
- Network is required; show clear "Ingen anslutning" states with auto-retry, no offline mode.

## Stack and commands

Vite 8 + React 19 + TypeScript + Tailwind v4 (`@tailwindcss/vite`, `@import "tailwindcss"` in
`src/index.css`) + React Router 7 (`react-router` package) + Vitest 4 + ESLint 10 (flat config).
Supabase via `@supabase/supabase-js` (from Stage 2). Deployed on Vercel (`vercel.json` SPA rewrite).

```
npm run dev      # dev server
npm test         # vitest run (all src/**/*.test.ts)
npm run lint
npm run build    # tsc -b && vite build
npm run smoke -- --reset   # end-to-end backend check; WIPES players, bets, races
npx supabase start         # local stack (Docker); `npx supabase db reset` reapplies migrations
npx supabase db push       # apply new migrations to the linked hosted project
```

Env: copy `.env.example` to `.env.local`. Only `VITE_`-prefixed vars reach the browser.
Smoke against the local stack: set `SMOKE_SUPABASE_URL=http://127.0.0.1:54321`,
`SMOKE_SUPABASE_KEY=<local publishable key from supabase start>`, `SMOKE_GM_PASSWORD` (set the
local password with `supabase/snippets/set_gm_password.sql` via psql on port 54322).

## Folder rules

```
src/shared/content/  Swedish word pools and copy. Data plus string templates only.
src/shared/game/     Pure game logic: rng, field, odds, sim, format, types.
src/lib/             Supabase client, typed RPC wrappers, realtime hooks. (Stage 2)
src/ui/              Design-system components shared by both apps. (Stage 3)
src/ui/styleguide/   Dev-only gallery at /styleguide (phone + iPad frames). Not in prod builds.
src/client/          Guest app, route "/".
src/gm/              Game master app, route "/gm/*".
supabase/migrations/ SQL migrations. (Stage 2)
```

- `src/shared/` never imports React, the DOM, or Supabase. It must run in Node (tests).
- `src/shared/game` is **pure and deterministic**: all randomness goes through an `Rng` from
  `createRng(seed)`. Never call `Math.random` there. `randomSeed()` is the one impure helper.
- Every change in `src/shared/game` comes with tests. Key invariants that must stay green:
  money on a horse always shortens it; same seed gives the same field and race timeline;
  no duplicate horse names or final words in a field; 2 to 4 named kuskar per field.
- Game copy lives in `src/shared/content`, not inline in components. New horse-name jokes go
  in `EFTERLED` first. `SUBST` nouns must be in definite form.
- `computeOdds` / `roundOdds` / `payoutFor` are mirrored in SQL (`place_bet`, settlement).
  Change both sides together.
- `src/client` and `src/gm` never import each other; share through `src/ui`, `src/lib`, `src/shared`.
- Only `src/lib` imports Supabase. Components use the hooks in `src/lib/hooks.ts` and the
  wrappers from `getApi()`; RPC errors arrive as `RallyError` with Swedish copy from
  `src/shared/content/errors.ts` (add a code there when adding a `raise exception`).
- Migrations are append-only once pushed: never edit an applied file, add a new one.
- Economy constants (`src/shared/game/economy.ts`) are mirrored in SQL; a test checks both.
- Tests are colocated as `*.test.ts`. They are type-checked via `tsconfig.node.json` (Node
  types available), while `tsconfig.app.json` covers app code with DOM types only.

## Design system (Stage 3)

- Tokens live in `@theme` in `src/index.css`: colours `night`, `tote`, `tote-hi`, `plate` (yellow),
  `sleaze` (pink), `cash` (green, wins, odds shortening), `drift` (red, errors, odds lengthening),
  `void`, `ink`, `ink-dim`; fonts `font-display` (Big Shoulders Display) and `font-body` (Archivo,
  use `[font-stretch:82%]` for condensed names); GM sizes `text-tv-sm/md/lg/xl`. Use tokens, not
  raw Tailwind colours. Dark only.
- Build screens from `src/ui` (import from `'../ui'`): `Logo`, `Button`, `Modal` (native
  `<dialog>`, stacks), `toast()` + `<Toaster />`, `SilkBadge`, `OddsValue`, `HorseRow`,
  `StatusBanner`, `BonusBar`, `ConnectionBadge`, `QrCode`. Most take `size` with a `tv` variant for the iPad.
- Component copy lives in `src/shared/content/ui.ts`. Check new components in `/styleguide`.

## Conventions

- Code, identifiers and code comments in English; content pools keep their Swedish names
  (`ORTER`, `EFTERLED`, ...) to match the prototype.
- Currency is **RallyMynt (RM)**, never kronor/kr, in all user-facing text.
- Formatting: `fmtRm`, `fmtOdds`, `fmtInt`, `playerLabel` in `src/shared/game/format.ts`
  (no-break space thousands separator, decimal comma).
- Devices: client is phone portrait (usable on desktop); GM is iPad landscape, readable at 2 m.

## End of every stage

1. `npm run build`, `npm test` and `npm run lint` pass.
2. Append a section to `docs/STATUS.md`: done, deviations from META_PLAN, open issues,
   manual steps for Simon.
3. Commit. Then stop; the next stage starts in a fresh session.
