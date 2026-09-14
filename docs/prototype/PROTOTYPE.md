# Nat Casino Derby: prototype context

Context document for an agent building the full web app. Describes what exists today in
`natcasino-derby.html`, the decisions behind it, the exact models it uses, and what a
production version needs to add.

---

## 1. The situation this is built for

Simon and a group of friends are attending a party with an **online casino theme**. Every
guest wears an outfit that other guests can *interact with*. One group of three is dressing
as a slot machine: each person is one reel, they spin, and you "play" by having them pull an
object from their pockets.

Simon's outfit is **horse racing**. He carries an iPad running this app. Guests walk up,
look at the race card, place a bet, and watch the race resolve on screen.

Design consequences that follow from the venue, not from software taste:

- **The audience is standing, holding drinks, in a loud room.** Screen text must be readable
  from roughly two metres. Interactions must complete in under two minutes.
- **Guests are not users.** They will tap once or twice, be handed the iPad by someone else,
  and walk away mid-flow. Nothing may require a tutorial or a correct sequence of steps.
- **The night is long.** The same guest comes back four or five times. Repetition across
  races is the main failure mode, not a lack of features.
- **Venue wifi will be bad or absent.** The app must work with the iPad in flight mode.

## 2. Decisions already made

These were settled with Simon and should be treated as fixed unless he reopens them.

| Decision | Choice | Why |
|---|---|---|
| Race resolution | **The app simulates it.** | Considered and rejected: a physical track worn on the outfit, and guests-as-horses with Simon commentating. Simon chose the simulated version. |
| Language | **Swedish**, throughout. | Swedish party in Uppsala/Västerås. The trotting-commentator register is funnier in Swedish, and the local place-name jokes only land in Swedish. |
| Audio | **None.** No speech synthesis, no sound. | Was prototyped with `speechSynthesis` and a sv-SE voice, then removed at Simon's request. All race drama now has to be carried visually. |
| Network | **Fully offline.** | No API calls at runtime. All text is generated from word pools baked into the file. |
| Build order | **Core loop first.** | Field and stories, odds, bets, race, payouts. Chips, QR and persistence come after. |

The removal of audio is the most load-bearing of these. Because nothing is spoken, the
commentary strip is the only narrator, which is why it is oversized and animated. Any
redesign that shrinks it breaks the race.

## 3. What exists today

One file, `natcasino-derby.html`, about 1 120 lines. Vanilla HTML, CSS and JavaScript in a
single document. No build step, no dependencies, no network calls, no browser storage. Opens
by double-clicking. Tested headlessly in Chromium across a dozen full race cycles with no
console errors, and at 400px width with no horizontal scroll.

### Visual direction

The app impersonates a **sleazy offshore betting site**. This is the thematic hook that ties
a horse race to an *online* casino, and it is where most of the comedy lives. Current
elements:

- A scrolling bonus bar: "Välkomstbonus 500 %, omsättningskrav 40x, licensierad i Curaçao".
- A fake connect sequence on launch, ending with "Hittade dig. Det är okej."
- A fake KYC gate before the first bet that accepts any input and verifies nothing.
- Fake win toasts: "Bosse från Östhammar vann just 31 573 kr", every ~11 seconds.
- A fluctuating fake viewer count.
- Small-print legalese in the lobby: "Vinster betalas ut i handling, sällskap eller inget alls."

Palette: dark casino felt green, gold, neon green for numbers, hot pink for the LIVE
elements. A faint CRT scanline overlay. Dark only, no light theme, since it runs on one iPad
in a dim room.

### Screen flow

A five-state machine. Only one screen is visible at a time.

```
lobby ──"Starta nytt lopp"──> paddock ──"Öppna spel"──> betting
  ^                              ^  |                      │
  │                              └──┘ "Nytt startfält"     │ "Loppet börjar"
  │                                                        v
  └──"Till lobbyn"──── result <──(ev. bandomarutredning)── race
                          │                                 │
                          └──"Nästa lopp"──> paddock         │ "Snabbspola"
```

- **lobby**: branding, three counters (races tonight, bets placed, turnover), one big button.
- **paddock**: the race card. Six horses, each with number, silk colour, name, kusk and
  epithet, backstory, kusk note, form line, comment and expert tip. Tapping a horse
  highlights it, for marking which one Simon is presenting. "Nytt startfält" rerolls the
  whole field, which is the escape hatch when a field comes out unfunny.
- **betting**: two panels. Left is place-a-bet (name field, horse list with live odds, chip
  denominations 10/25/50/100/250). Right is the running bet slip. Odds move as money lands.
- **race**: six lanes, one moving numbered badge per horse, a static dim lane label, the
  leader outlined in gold. An oversized commentary strip at the bottom. A "Snabbspola"
  button that fast-forwards to the finish.
- **result**: podium of three, then a payout row per bet, win rows in green.

### Race card data model

```js
{
  n: 1,                        // startnummer, 1..6
  name: "Åskans Hemförsäkring",
  jockey: "GP",
  title: "intensiteten själv", // visas inom parentes efter kusknamnet
  story: "...",                // hästens bakgrund, 1-2 meningar
  jnote: "...",                // en rad om kusken
  form: "6-d-5-1-5",           // fem senaste, g = galopp, d = diskad
  note: "Kan vinna om allt stämmer.",
  tip:  "Vår expert: skippa.",
  strength: 1.07,              // dold, 0.72-1.32
  stamina:  0.94,              // dold, 0.80-1.20, biter efter 55 % av loppet
  temper:   0.11,              // dold, 0.02-0.16, galoppbenägenhet
  silk: { bg: "...", edge: "..." },
  baseOdds: 3.77,              // morgonlinjen
  odds: 2.59,                  // aktuella odds
  pool: 350,                   // insatta kronor på hästen
  pos: 0, broke: false         // löpande under loppet
}
```

`strength`, `stamina` and `temper` are never displayed. The form line, comment and tip are
pure flavour and deliberately uncorrelated with actual strength, so the race card lies to you
the way a real one does.

## 4. Content generation

Everything is combinatorial and offline. This is the part worth preserving verbatim in any
rewrite, because it is the part that took judgement rather than engineering.

### Horse names

Three patterns, weighted:

| Weight | Pattern | Pool sizes | Example |
|---|---|---|---|
| 42 % | `<ort> <epitet>` | 30 x 30 | Bålsta Blixten, Skutskär Turbo |
| 41 % | `<storslaget förled> <vardagligt efterled>` | 20 x 33 | Åskans Hemförsäkring, Frostens Julbord |
| 17 % | `Den <adjektiv> <substantiv>` | 20 x 20 | Den Dyra Anmälan, Den Trötta Utsikten |

About 1 960 combinations. The joke in pattern two is the collision of an epic Swedish
genitive with the dreariest possible piece of adult admin: *Nordens Tvättstuga*, *Stormens
Parkeringsböter*, *Ödets Bilbesiktning*. The `EFTERLED` pool is where new jokes should be
added first.

Two constraints are enforced per field, both learned from bad output:

- No duplicate full names.
- **No duplicate final word.** Without this you get *Sorgens Soptunna* racing *Nordens
  Soptunna* in the same six-horse field, which reads as a bug.

Pattern three requires the noun in definite form. `Ångest` and `Blygsamhet` had to become
`Ångesten` and `Blygsamheten`, otherwise "Den Hungriga Blygsamhet" is ungrammatical. Any
noun added to `SUBST` must be definite.

### Kusks

Two sources, mixed in the same field.

**Random kusks**: `FORNAMN` (38, deliberately unfashionable Swedish first names: Kenneth,
Ann-Christin, Stig-Åke, Maj-Britt) x `EFTERNAMN` (30), plus one of 14 epithets ("avstängd
hela 2019", "aldrig nykter före start") and one of 8 generic notes.

**Named kusks**: eight of Simon's friends, each with a fixed epithet and seven dedicated
lines built around one running joke. **Two to four per six-horse field**, in random slots, so
everyone appears often without the friend jokes crowding out the random ones.

| Kusk | Epithet | Running joke |
|---|---|---|
| Jesper | banans äldsta | how old he is |
| GP | intensiteten själv | intense, and forgets everything |
| Emma | kör med slutna ögon | her eyes are always closed |
| Axel | gentlemannen | old-fashioned, conservative, courteous |
| Erik | avstängd på tre banor | wild and reckless |
| Kajsa | hästexpert av annat slag | knows an alarming amount about animal droppings |
| Simon | webbansvarig | computer nerd keeping a crashing site alive |
| Palm | ekonomiansvarig | money, always money |

This list will grow as more friends are added. Keep the shape: `{ name, title, notes: [...] }`,
seven lines each, all jokes on one theme per person so the character is legible after two
sightings.

### Backstories

Ten sentence templates with slot substitution, drawing on pools for occupations (16),
triggering events (10), achievements (10), circumstances of birth (8), refusals (7), former
careers (7) and stable quotes (7). Templates take the horse name and kusk name as arguments,
so backstories can name the kusk and stay consistent with the race card.

Comments and expert tips are dealt without replacement within a field, so no two horses in
one race carry the same line.

## 5. The odds model

This is a **parimutuel totalisator with virtual seed money**, and it went through one wrong
version worth knowing about.

```js
const VIRTUAL_POOL = 700;   // kr the house has notionally staked along the morning line
const TAKEOUT      = 0.87;  // house margin

// implied probability from the morning line, normalised
p_i    = (1/baseOdds_i) / Σ(1/baseOdds)
eff_i  = VIRTUAL_POOL * p_i + realPool_i
odds_i = clamp(TAKEOUT / (eff_i / Σeff), 1.15, 80)
```

Properties this gives you:

- With no bets placed, displayed odds equal the morning line.
- Money on a horse shortens it and lengthens the others, smoothly and proportionally.
- A horse nobody backs drifts out gradually rather than exploding.
- The book sums to about 115 %, so the house holds roughly 13 %, which is thematically correct.

**The bug that preceded it**, because it is easy to reintroduce: blending the morning line
with `1/max(share, 0.02)` means a horse with an empty pool is treated as a 2 % chance and
slammed to 40.00. In testing, a single 100 kr bet *on* a horse lengthened it from 3.77 to
18.26, which is backwards. Any odds model must be checked against the invariant: **money on a
horse always shortens that horse.**

Bets are settled at the odds captured **at the moment the bet was placed**, not the final
odds. This is fixed-odds settlement on a parimutuel display, which is not how a real
totalisator works, but it is fairer at a party and much easier to explain to a drunk guest.

`VIRTUAL_POOL = 700` was tuned against expected volume: five to ten bets of 10 to 250 kr per
race. Raise it to damp movement, lower it to make the market swing harder.

## 6. The race simulation

68 ticks at 300 ms, roughly 20 seconds. Tunable via `TICKS` and `TICK_MS`.

Per tick, per horse:

```js
stam  = 1 - max(0, progress - 0.55) * (1.25 - stamina) * 0.9   // fade in the last 45 %
speed = strength * stam * rand(0.72, 1.3) * (broke ? 0.25 : 1)
pos  += speed
```

Breaks (galopp) fire at probability `temper * 0.045` per tick, last three to six ticks at
25 % speed, wobble the badge, and interrupt the commentary. They are the main source of upset
and the main source of shouting.

**Screen positions are computed from gaps in lengths, not from position ratios.** The leader
is placed at `6 + progress * 85` percent and everyone else at
`leaderLeft - (maxPos - pos) * 2.2`, floored at 4 %. The first version used `pos / maxPos`,
which makes the field converge visually as the race goes on, so a close finish and a
thrashing look identical. Gap-based placement means a photo finish looks like a photo finish.

Commentary fires at five fixed milestones (ticks 12, 26, 40, 52, 60), on every break, and on
**every change of leader** provided seven ticks have passed since the last line. The
lead-change lines were added when audio was removed, to keep the strip alive.

Finishes within 1.6 units trigger a "MÅLFOTO" line and a longer pause before the result.

**Stewards' inquiry**: 10 % of races. An overlay accuses the winning kusk of something
("vägrat lämna in urinprov till huset"), holds for 3.2 seconds, then demotes the winner to
last and pays out on the horse that came second. The house keeps the stakes. This is the
single most on-theme feature in the app and should survive any rewrite.

## 7. Known limitations of the prototype

These are the reasons a full web app is wanted, in rough order of how much they hurt.

1. **No persistence.** All state is in memory. A reload wipes the night's bets, balances and
   counters. Nothing is written to storage.
2. **One screen for everyone.** Guests have to crowd the iPad. There is no second-screen path.
3. **No chip economy.** Each bet is settled and forgotten. There is no running balance per
   guest, so there is no reason to come back other than goodwill.
4. **No race history.** You cannot look up what won in race 4, and horses never recur, so
   there are no returning champions to build affection for.
5. **Names are typed by hand every bet.** Slow, and it means "Simon", "simon" and "Sim" are
   three different people.
6. **The field is always six.** Not configurable from the UI.
7. **No way to add friends without editing the source.** The named kusk list is a code
   constant.

## 8. What the full web app should add

Roughly the order that maximises party value per unit of work.

**Persistence and a chip economy.** A guest registry with a running balance, surviving
reloads. This is the change that turns single interactions into a night-long game, and it
makes a leaderboard and a "kvällens största förlorare" award possible. Local storage is
enough; a backend is only needed for the next item.

**Second screen.** A QR code that opens the race card and betting on a guest's own phone.
Solves crowding, and lets several people bet at once while Simon talks. This is the one
feature that genuinely needs a server or a peer connection, and the one that breaks the
offline guarantee, so it should degrade cleanly to the single-iPad mode when there is no
network.

**Odds ticker.** Show the drift direction and the money behind each horse. The CSS classes
`.oddsval.up` and `.oddsval.down` and the `h.drift` field already exist and are unused. Makes
the market feel alive and encourages late betting.

**Recurring horses and a stable.** Let a horse that wins keep its record and come back in a
later race with a longer form line. Costs almost nothing and creates the thing that makes
real racing work, which is that you know the horse.

**A field editor.** Let Simon add friends, edit joke lines and reroll individual horses from
the UI rather than the source file.

**Photo finish.** A camera capture at the line, or a slow-motion replay of the last ticks.
Pure spectacle, but spectacle is the product here.

## 9. Constraints to carry forward

- Swedish, everywhere, including error states.
- No audio.
- Must work offline on an iPad in landscape, with any online features degrading gracefully.
- Readable at two metres. When in doubt, make the type bigger.
- Any interaction a guest performs must complete in under two minutes.
- Keep the sleazy betting site framing. It is the theme, not decoration.
- Do not use the em dash in any user-facing Swedish or English text.
