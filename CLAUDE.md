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
- **Two brands.** The guest app (`/`, `/k/:code`) is **Mr Green Nätcasino**, a parody umbrella
  casino: deep felt green, cream wordmark, the frog in the suit. **Rally75** is the trotting product
  inside it, and the brand of every GM surface. Never use ATG's real name or logo.
  Mr Green art belongs on the guest app, the guest icons and the printed kupong, and **nowhere on
  `/gm` or `/gm/kuponger`**, which stay tote blue. `/gm/display` stays Rally75 blue too (never
  `data-brand`), but credits its owner in exactly four places: the marquee (`BonusBar` with
  `theme-mrgreen`), "En del av Mr Green Nätcasino" under the Rally75 logo, the frog by the join QR,
  and `MrGreenBug` in the corner of the race and result screens. (Simon's calls, see `docs/STATUS.md`.)
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

- Tokens live in `@theme` in `src/index.css`: colours `night`, `night-deep`, `night-glow`, `tote`,
  `tote-hi`, `plate` (yellow), `sleaze` (accent) + `sleaze-ink` (text on a solid sleaze surface),
  `cash` (green, wins, odds shortening), `drift` (red, errors, odds lengthening), `void`, `ink`,
  `ink-dim`; fonts `font-display` (Big Shoulders Display) and `font-body` (Archivo, use
  `[font-stretch:82%]` for condensed names); GM sizes `text-tv-sm/md/lg/xl`. Use tokens, not raw
  Tailwind colours. Dark only.
- **Theming is token remapping, not component variants.** The `@theme` defaults are Rally75. The
  greens live in one unlayered scope, `:root[data-brand='mrgreen'], .theme-mrgreen`, and
  `.theme-rally75` restores the blues from the named `--color-*-blue` set for a nested subtree.
  `index.html` sets `data-brand` on `<html>` for every path that is not `/gm`, so GM never sees it.
  - Moved by brand: `night`, `night-deep`, `night-glow`, `tote`, `tote-hi`, `void`, `ink`,
    `ink-dim`, `sleaze`, `sleaze-shade`, `sleaze-ink`. **Never** `plate`, `cash` or `drift`: money,
    odds and alerts must mean the same colour in both brands. `src/ui/theme.test.ts` enforces that
    the scopes (Mr Green, `.theme-rally75`, `.theme-plinko`) declare the same token names, so add a
    token to all of them or none.
  - Anything outside the React tree (the `body` gradient, `dialog::backdrop`) needs its own
    `[data-brand='mrgreen']` rule. `::backdrop` cannot read a custom property on older Safari, so it
    is written out longhand.
  - `bg-tote/40`-style opacity utilities theme correctly only where `color-mix(in lab, ...)` is
    supported (Safari 16.4+). Fine for party phones; do not rely on it elsewhere.
- Build screens from `src/ui` (import from `'../ui'`): `Logo` (**Rally75 only**), `MrGreenLogo`
  (the site brand: `mark` / `lockup` / `full`, from `public/mrgreen-logo.jpg`), `Button`, `Modal`
  (native `<dialog>`, stacks), `toast()` + `<Toaster />`, `SilkBadge`, `OddsValue`, `HorseRow`,
  `StatusBanner`, `BonusBar`, `ConnectionBadge`, `QrCode`. Most take `size` with a `tv` variant for the iPad.
- Draw a horse with `HorseBadge horse={h}`, not a bare `SilkBadge`: it looks up the kusk's face by
  `horse.jockey` in `KUSK_PHOTOS` (`src/shared/content/kuskar.ts`) and draws it in a ring of the silk
  with the start number on a small plate. A kusk with no photo (added in the GM app, or renamed)
  falls back to the plain number plate. Faces are 512px JPEGs in `public/kuskar/`, cropped by
  `npm run kuskar -- <folder with the PNGs>` (crop table in `scripts/kuskar.mjs`). They are Rally75
  content, so they appear on `/gm` too. New friend: add a crop, run the script, add the name to
  `KUSK_PHOTOS` (`kuskPhotos.test.ts` checks that every kusk in the stable has one).
- Component copy lives in `src/shared/content/ui.ts` (`BRAND` holds both brand names). Check new
  components in `/styleguide`, whose `Varumärken` section shows the two brands side by side.
- Guest icons and `og.png` are generated from the frog art: `npm run icons -- guest` regenerates the
  guest set only and leaves the `gm-*` PNGs untouched.

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
- Realtime has no replay, so the display also re-reads the active race every 3 s
  (`useActiveRace({ pollMs })`): an idle iPad's socket can die quietly for longer than a race lasts.
- No inquiry: the control phone publishes automatically after the finish pause, and the display
  publishes as a fallback ~12 s later only if the phone never did (`useFallbackPublish.ts`).
  Inquiry: only the phone rules; the iPad just shows the drama.
- **Races are scripted, not emergent** (`src/shared/game/sim.ts`). The finish order is drawn first
  from `winWeights` (`odds.ts`, the same strength curve the morning line uses, so the odds tell the
  truth and the house keeps its edge), then a storyline (`RaceScript`) is keyframed to end on it, and
  gags (`GagKind`, galopp plus slapstick) bend a horse's curve mid-race. 100 ticks of 300 ms; the
  upplopp (`STRETCH_TICK`) runs at half speed. `sim.test.ts` asserts the win rates, the house edge and
  the excitement targets; keep them green when tuning. Commentary pools and gag lines are in
  `commentary.ts`.
- The display's race is `RaceScreen` (clock, secrets, bets) around the presentational `RaceTrack`.
  Tune it in the dev-only race lab at `/styleguide/race` (`?seed=&t=` opens a frame, `&panel=0`).
- GM copy lives in `src/shared/content/gm.ts`; display copy in `ATTRACT` (`src/shared/content/ui.ts`).

## Client app (Stage 5)

- `src/client/ClientApp.tsx`: no identity shows `Landing` (a parody casino homepage; every button
  leads on), then `Onboarding` (fake connect, KYC), otherwise
  `ClientShell` (header, tabs Rally75 / Mina spel / Bank / Butik / Topplista). `CookieBanner` floats over both.
- The client is **Mr Green green**; the trotting surfaces are a **blue Rally75 inset panel**. The rule:
  anything showing a horse, a silk, odds or a race number carries `theme-rally75`. Today that is the
  race panel in `Home.tsx`, the `BetSlip` root (its confirm modal inherits), `MyBets.tsx` and the
  `ResultReveal` modal (a shell sibling, so it needs its own). `SmallPrint` forces itself back to
  `theme-mrgreen`: the legal footer is the site talking, not the product.
  Put the class on an element that already exists. A new wrapper div in the
  `ClientShell` > `main` > `RaceView` > `BetSlip` chain breaks the sticky slip's `flex-1`/`mt-auto`.
- Game tabs are named after products (`Rally75`, `Plånko`), so the shelf reads as a shelf. The tab
  bar is `grid-flow-col auto-cols-fr`: adding a tab to `TABS` needs no class edit, but check the
  labels at 390px, where the six tabs leave about 62px each (checked for Plånko).
- `ClientShell` fetches the player, the player's bets and the active race once and shares them via
  `useGuest()` (`src/client/guest.ts`). Guest RPCs go through `useGuestAction().run((api, identity) => ...)`:
  errors become toasts, `player_not_found`/`invalid_token` sign out.
- Pop-ups owned by the shell: bonus reveal after sign-up, result reveal (once per race, seen id in
  localStorage, waits until the player's bets are settled), Snabblån (broke with no open bets,
  never over a reveal or the bet confirm). Stage 6 pop-ups must respect the same `blocked` rule.
- Pure logic with tests: `slip.ts` (chips, stake checks, `marketOdds` from open bets) and
  `outcome.ts` (bet outcome, reveal kind, totals, history grouping).
- Guest copy lives in `src/shared/content/client.ts`.

## Plånko (Plinko)

Mr Green's own arcade game, the second product tab (`src/client/Plinko.tsx` + `PlinkoBoard.tsx`).

- **One RPC per ball.** `plinko_drop` draws a 12-bit path with `gen_random_bytes`, pays out and writes
  the `plinko_drops` row in one transaction. No round state, nothing secret: the row is public read
  and in the Realtime publication. The phone only animates a path it already knows.
- The rules live in `src/shared/game/plinko.ts` and are mirrored in `*_plinko.sql`: 12 rows, the
  multiplier table in integer tenths (`PLINKO_M10`, about 91 % back), `PLINKO_MAX_STAKE`, and the
  payout `floor((stake * m10 + 5) / 10)`. `plinko.test.ts` checks the SQL by string. Change both sides.
- **Never spoil the fall.** The server has paid before the ball appears, so: the header shows
  `heldBalance` (`src/client/drop.ts`: the newest row's `balance_after` minus the payouts still in
  the air) via `ClientShell`'s `plinkoHold`; the history only lists drops that were there when the
  tab opened or have landed on this phone; and the iPad waits `PLINKO_FALL_MS` before a big-hit toast.
- Not rank neutral (it is gambling, like a bet). Balls in flight block offers and Snabblån.
- Own inset panel: `.theme-plinko` (neon violet, magenta pegs) on the tab's existing `<section>`.
  GM surfaces stay blue: a read-only `PlinkoCard` on the control phone's Spel tab and
  `usePlinkoToasts` on the iPad (10x and up).
- Copy: `PLINKO` in `client.ts`, `GM_PLINKO` in `gm.ts`, the iPad lines in `ATTRACT`.

## Parody layer (Stage 6)

- Pop-up offers: `useOffers(blocked)` + `OfferPopup` in `ClientShell`; timing and the restarting
  countdown are pure in `src/client/offers.ts`. Offers are blocked by `blocked`, an open bet slip,
  being broke and the cookie banner. Offer copy is `OFFERS` in `src/shared/content/parody.ts`.
  Offers never change the balance.
- Social proof: `useSocialProof` (fake win toasts, real bet toasts from `raceBets` in `useGuest()`),
  `SocialStrip` (viewer count, "Utbetalt idag"). Pure helpers in `src/client/proof.ts` and
  `src/shared/game/hype.ts`. "Utbetalt idag" is `nightPaidDisplay(now, useNightPaid())` on both apps.
- New parody copy goes in `parody.ts` (`OFFERS`, `OFFER_UI`, `PROOF`, `SMALL_PRINT`, `LANDING`).
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
  Spending has its own list, "Dagens största slösare" (`bySpending`). Asserted in `buy.test.ts`,
  `economy.test.ts` and smoke.
- **Digital items are jokes or cosmetics only.** An item may set `players.title` or `players.badge`
  (shown by `badgedLabel` and on the Topplista) and nothing else. Never odds, bets or free RM.
- No fulfilment status: a purchase is a receipt the guest shows in the bar. The control phone's
  Butik tab has the live "Sålt idag" feed and Ångra (`gm_refund_purchase`); the display iPad
  toasts each purchase (`usePurchaseToasts`). `gm_reset_night` keeps the catalogue (like kuskar) and
  drops the receipts with the players.
- Guest copy is `BUTIK` in `client.ts`, GM copy `GM_SHOP` in `gm.ts`, display copy `ATTRACT`.
  Pure logic: `src/client/buy.ts`, `parsePrice`/`parseStock` in `src/gm/parse.ts`.

## Kuponger (printed QR tickets)

Printed tickets the guests running the physical games hand out, scanned at `/k/<code>` for RM.

- **The code never reaches a browser.** Plaintext lives in `coupon_secrets` (no grants, no policies,
  like `player_secrets`); `coupons` is public read and in the Realtime publication but holds only
  tier, amount, label, batch and redemption state. Never grant `coupon_secrets` or publish it.
- **One ticket, one claim**, enforced by `redeem_coupon`: the row is locked `for update` and the
  update carries `and redeemed_at is null`. `redeemed_at` is the authority on "spent";
  `redeemed_by` is only who, and goes null if the GM deletes the player.
- Codes are 8 Crockford base32 characters from `gen_random_bytes` (one byte per character, 256 is a
  multiple of 32 so there is no bias). `normalizeCode` in `src/shared/game/coupon.ts` and
  `private.clean_coupon_code` in SQL must stay in step: both map I and L to 1, O to 0.
- **A kupong is not rank neutral**, unlike a Butik purchase or a repayment: the RM lands in
  `balance` alone, so it lifts Toppen and `nightNet`. It is the only RM the GM can mint, hence the
  `COUPON_MAX_AMOUNT` / `COUPON_MAX_BATCH` caps in `economy.ts`, mirrored in SQL and tested.
- `/gm/kuponger` (`src/gm/coupons/`) is a third GM surface behind the same password: a laptop page
  for minting a run, printing A4 sheets (12 per page), reprinting a lost one, and the "Inlösta
  idag" feed with Ångra (`gm_void_claim`, which also frees the ticket). The QR address field must
  be the real host: a sheet printed from `localhost` is waste paper.
- The guest side is shell-owned like the other pop-ups: `ClientApp` parks a scanned code in
  localStorage (so the scan survives onboarding) and cleans the URL, `useCoupon` + `CouponReveal`
  do the claim, and it queues behind the bonus and result reveals. Bank has a typed-code fallback.
- Coupons survive `gm_reset_night` (they are physical objects). Clear a rehearsal run with
  `gm_delete_coupon_batch`.
- Guest copy `KUPONG` in `client.ts`, GM copy `GM_COUPONS` in `gm.ts`, shared tier and ticket copy
  in `src/shared/content/coupons.ts`, iPad toast in `ATTRACT`. Print CSS lives at the end of
  `src/index.css` and is the only light surface in the app.

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
