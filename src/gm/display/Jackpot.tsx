// Fake, ever-growing jackpot on a tote board. Derived from the local clock (resets at noon) so a
// reload never resets it mid-party.
import { useEffect, useState } from "react";
import { ATTRACT } from "../../shared/content/ui";
import { fmtInt } from "../../shared/game/format";
import { secondsSinceNoon } from "../../shared/game/hype";
import { RollingNumber } from "../../ui";

const BASE = 4_750_000;
const PER_SECOND = 17;
const TICK_MS = 1100;

function jackpotAt(ms: number): number {
  return BASE + secondsSinceNoon(ms) * PER_SECOND;
}

export function Jackpot() {
  const [amount, setAmount] = useState(() => jackpotAt(Date.now()));
  useEffect(() => {
    const id = setInterval(() => setAmount(jackpotAt(Date.now())), TICK_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="bulbs self-start rounded-2xl bg-night-deep px-8 pt-5 pb-4 ring-2 ring-plate/60">
      <p className="font-display text-tv-sm font-black tracking-[0.2em] text-sleaze uppercase">
        {ATTRACT.jackpotLabel}
      </p>
      <p
        aria-label={`${fmtInt(amount)} RM`}
        className="mt-1 flex items-baseline font-display text-[min(6rem,12dvh,7vw)] leading-none font-black text-plate tabular-nums drop-shadow-[0_0_1.5rem_rgb(255_214_10/0.4)]"
      >
        <RollingNumber value={amount} />
        <span className="ml-4 text-[min(4rem,4.6vw)] text-ink">RallyMynt</span>
      </p>
      <p className="mt-2 text-lg text-ink-dim">{ATTRACT.jackpotSmallPrint}</p>
    </div>
  );
}
