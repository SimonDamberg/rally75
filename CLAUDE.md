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
src/gm/              Game master app. control/ = phone (/gm), display/ = iPad (/gm/display).
supabase/migrations/ SQL migrations. (Stage 2)
```

- `src/shared/` never imports React, the DOM, or Supabase. It must run in Node (tests).
- `src/shared/game` is **pure and deterministic**: all randomness goes through an `Rng` from
  `createRng(seed)`. Never call `Math.random` there. `randomSeed()` is the one impure helper.
- Every change in `src/shared/game` comes with tests. Key invariants that must stay green:
  money on a horse always shortens it; same seed gives the same field and race timeline;
  no duplicate horse names or final words in a field; every slot in a field is a named kusk
  (`NAMED_KUSKAR_PER_FIELD`), capped by how many active kuskar exist.
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
  `netWorth` takes `{balance, debt, spent}`: debt counts against you, Butik spending does not.
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

## GM app (Stages 4 and 7)

Two devices, one password gate, one lazy-loaded chunk (`src/gm/GmApp.tsx` routes between them):

- **`/gm/display`**, the iPad on its stand: `src/gm/display/`. Pure output, nothing to tap, and it
  **never publishes a result**. `DisplayShell` picks the view from the race status alone: `Attract`
  when idle, `FieldBoard` in paddock and closed, the rotating `Spotlight` while betting, `RaceScreen`
  while running, `ResultDisplay` for 45 s after settlement. `Attract` is the standing chrome (join QR
  plus trot parade); its `children` are the swappable left panel.
- **`/gm`**, Simon's phone: `src/gm/control/`. Phone-first (bottom tab bar like `ClientShell`, `md`
  sizes, never `tv`). Every control lives here, including Snabbspola, the inquiry rulings and
  **auto-publish** (`RunningRace.tsx`).
- Shared between them stays at `src/gm/`: `gmAuth`, `useRaceControl`, `useRaceTimeline`, `raceClock`,
  `book`, `parse`, `ResultPanel` (takes `size: 'tv' | 'md'`).
- GM RPCs go through `useGmAction().run((gm, pw) => ...)` (`src/gm/gmAuth.ts`): errors become
  toasts, `gm_unauthorized` logs out. `run` resolves to `undefined` on failure, so a call that
  returns nothing must return `true`.
- **The race clock is server-authoritative.** `races.started_at` is the only start time; both devices
  replay `simulateRace` against it and correct for their own clock drift with `useServerClock()`
  (`src/lib/clock.ts` + the `server_now()` RPC). Snabbspola is the `gm_skip_race` RPC, which moves
  `started_at` back so the skip reaches the iPad over Realtime. Never store a race start locally.
- No inquiry: the control phone publishes automatically after the finish pause, and the display
  publishes as a fallback ~12 s later only if the phone never did (`useFallbackPublish.ts`).
  Inquiry: only the phone rules; the iPad just shows the drama.
- GM copy lives in `src/shared/content/gm.ts`; display copy in `ATTRACT` (`src/shared/content/ui.ts`).

## Client app (Stage 5)

- `src/client/ClientApp.tsx`: no identity shows `Onboarding` (fake connect, KYC), otherwise
  `ClientShell` (header, tabs Spela / Mina spel / Bank / Butik / Topplista). `CookieBanner` floats over both.
- `ClientShell` fetches the player, the player's bets and the active race once and shares them via
  `useGuest()` (`src/client/guest.ts`). Guest RPCs go through `useGuestAction().run((api, identity) => ...)`:
  errors become toasts, `player_not_found`/`invalid_token` sign out.
- Pop-ups owned by the shell: bonus reveal after sign-up, result reveal (once per race, seen id in
  localStorage, waits until the player's bets are settled), Snabblån (broke with no open bets,
  never over a reveal or the bet confirm). Stage 6 pop-ups must respect the same `blocked` rule.
- Pure logic with tests: `slip.ts` (chips, stake checks, `marketOdds` from open bets) and
  `outcome.ts` (bet outcome, reveal kind, totals, history grouping).
- Guest copy lives in `src/shared/content/client.ts`.

## Parody layer (Stage 6)

- Pop-up offers: `useOffers(blocked)` + `OfferPopup` in `ClientShell`; timing and the restarting
  countdown are pure in `src/client/offers.ts`. Offers are blocked by `blocked`, an open bet slip,
  being broke and the cookie banner. Offer copy is `OFFERS` in `src/shared/content/parody.ts`.
  Offers never change the balance.
- Social proof: `useSocialProof` (fake win toasts, real bet toasts from `raceBets` in `useGuest()`),
  `SocialStrip` (viewer count, "Utbetalt i kväll"). Pure helpers in `src/client/proof.ts` and
  `src/shared/game/hype.ts`. "Utbetalt i kväll" is `nightPaidDisplay(now, useNightPaid())` on both apps.
- New parody copy goes in `parody.ts` (`OFFERS`, `OFFER_UI`, `PROOF`, `SMALL_PRINT`).
- Stödlinje: a `tel:` link to a friend in costume. Number and lead lines are `STODLINJE` in
  `parody.ts`; render with `StodlinjeLink`/`StodlinjeNote` from `src/ui`. Placed in `SmallPrint`
  (every tab), the Snabblån modal, Bank (when in debt), the loss reveal and the KYC form.

## Butik (black market)

- `shop_items` (namn, blurb, pris, `stock` null = obegränsat, `kind` physical/digital, `effect`
  none/title/badge) and `purchases` (a receipt, with the item name snapshotted). Both are public
  read, written only by `buy_item` / `gm_upsert_shop_item` / `gm_delete_shop_item` /
  `gm_refund_purchase`, and both are in the Realtime publication so stock drops on every phone.
- **Buying is rank neutral.** `buy_item` moves the price from `players.balance` to `players.spent`,
  and `netWorth` adds `spent` back, so nothing bought can move you on Toppen or the förlorarlista.
  Spending has its own list, "Kvällens största slösare" (`bySpending`). Asserted in `buy.test.ts`,
  `economy.test.ts` and smoke.
- **Digital items are jokes or cosmetics only.** An item may set `players.title` or `players.badge`
  (shown by `badgedLabel` and on the Topplista) and nothing else. Never odds, bets or free RM.
- No fulfilment status: a purchase is a receipt the guest shows in the bar. The control phone's
  Butik tab has the live "Sålt i kväll" feed and Ångra (`gm_refund_purchase`); the display iPad
  toasts each purchase (`usePurchaseToasts`). `gm_reset_night` keeps the catalogue (like kuskar) and
  drops the receipts with the players.
- Guest copy is `BUTIK` in `client.ts`, GM copy `GM_SHOP` in `gm.ts`, display copy `ATTRACT`.
  Pure logic: `src/client/buy.ts`, `parsePrice`/`parseStock` in `src/gm/parse.ts`.

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
