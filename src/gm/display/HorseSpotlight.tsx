// One horse at a time on the display iPad while betting is open, so the room has something to
// study and argue about. Which horse is showing is a pure function of the server clock
// (spotlight.ts), so a reload does not restart the rotation.
//
// This does not reuse HorseRow size="tv": those sizes are fixed, and the full card is taller than
// a 1024x768 iPad can give it once the trot parade has its share. Everything here scales with the
// viewport instead, so the card always fits between the header and the parade.
import { useEffect, useEffectEvent, useState } from "react";
import { useServerClock } from "../../lib/hooks";
import type { BetRow, RaceRow } from "../../lib/types";
import { ATTRACT, UI_LABELS } from "../../shared/content/ui";
import { fmtRm } from "../../shared/game/format";
import { OddsValue, SilkBadge } from "../../ui";
import { summarizeBook } from "../book";
import { SPOTLIGHT_MS, spotlightIndex, spotlightRemaining } from "./spotlight";

const TICK_MS = 100;

export function Spotlight({
  race,
  bets,
}: {
  race: RaceRow;
  bets: readonly BetRow[] | undefined;
}) {
  const { now: serverNow } = useServerClock();
  const [now, setNow] = useState(serverNow);
  const tick = useEffectEvent(() => setNow(serverNow()));
  useEffect(() => {
    const id = setInterval(() => tick(), TICK_MS);
    return () => clearInterval(id);
  }, []);

  // Count from when betting opened so every device lands on the same horse.
  const from = race.betting_at
    ? Date.parse(race.betting_at)
    : Date.parse(race.created_at);
  const elapsed = now - from;
  const count = race.field.length;
  const i = spotlightIndex(elapsed, count);
  const horse = race.field[i];
  const book = summarizeBook(race.field, bets ?? []);
  const progress = 1 - spotlightRemaining(elapsed) / SPOTLIGHT_MS;

  if (!horse) return null;
  const hb = book.horses[i];

  return (
    <div className="flex min-h-0 min-w-0 flex-col gap-[1.5vh] overflow-hidden">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="font-display text-[min(2.5rem,3.6vw)] leading-none font-black tracking-wide text-plate uppercase">
          {ATTRACT.spotlightTitle}
        </h2>
        <span className="font-display text-[min(1.5rem,2.2vw)] font-bold text-ink-dim uppercase">
          {ATTRACT.spotlightOf(i + 1, count)}
        </span>
      </div>

      {/* Keyed so the card re-enters on every handover. */}
      <div
        key={horse.n}
        className="flex min-h-0 animate-pop-in flex-col gap-[1vh] overflow-hidden rounded-2xl border-l-[0.6rem] bg-tote/60 p-[1.6vh] ring-1 ring-white/10 ring-inset"
        style={{ borderLeftColor: horse.silk.edge }}
      >
        <div className="flex min-w-0 items-center gap-[1.5vw]">
          <SilkBadge n={horse.n} silk={horse.silk} size="lg" />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="line-clamp-2 text-[min(2.6rem,4vw)] leading-tight font-extrabold text-balance [font-stretch:82%]">
              {horse.name}
            </span>
            <span className="truncate text-[min(1.6rem,2.4vw)] text-plate">
              {UI_LABELS.kusk}: {horse.jockey}
            </span>
          </span>
          <span className="flex shrink-0 flex-col items-end">
            <OddsValue value={hb.odds} size="lg" label />
            <span className="text-[min(1.2rem,1.8vw)] whitespace-nowrap text-ink-dim tabular-nums">
              {UI_LABELS.pool} {fmtRm(hb.pool)}
            </span>
          </span>
        </div>

        <p className="line-clamp-4 text-[min(1.4rem,2.1vw)] leading-snug text-ink-dim">
          {horse.jnote}
        </p>
        {/* <p className="line-clamp-1 text-[min(1.2rem,1.9vw)] leading-snug text-ink-dim/80 italic">{horse.jnote}</p> */}
        <p className="text-[min(1.3rem,2vw)] text-ink-dim italic">
          {horse.note}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        {race.field.map((h, j) => (
          <span
            key={h.n}
            className="relative h-2 flex-1 overflow-hidden rounded-full bg-white/15"
            aria-hidden
          >
            <span
              className="absolute inset-y-0 left-0 rounded-full bg-plate"
              style={{
                width:
                  j < i
                    ? "100%"
                    : j === i
                      ? `${Math.round(progress * 100)}%`
                      : "0%",
              }}
            />
          </span>
        ))}
      </div>
    </div>
  );
}
