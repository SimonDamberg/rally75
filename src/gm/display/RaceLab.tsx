// Dev-only race lab at /styleguide/race: the display's RaceTrack on a local timeline, no backend and
// no GM password. Pick a seed, or jump to the next seed with a given storyline or gag, and scrub.
// ?seed=42&t=24000 opens a seed paused at a moment (ms from the start); &panel=0 hides the controls.
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { GM_RACE, GM_RACE_LAB } from "../../shared/content/gm";
import { NAMED_KUSKAR } from "../../shared/content/kuskar";
import { buildRaceCard } from "../../shared/game/field";
import { distMeters } from "../../shared/game/format";
import { createRng } from "../../shared/game/rng";
import {
  COMIC_GAGS,
  SCRIPT_WEIGHTS,
  simulateRace,
  STRETCH_GAG_TICK,
} from "../../shared/game/sim";
import type { RaceScript, RaceTimeline } from "../../shared/game/types";
import { pauseMs, raceView, runMs } from "../raceClock";
import type { LaneBackers } from "../book";
import { RaceTrack } from "./RaceTrack";

const RACE_NO = 3;
const FAKE_BACKERS = [
  "Kalle #12",
  "👑 Lisa #3",
  "Simon #42",
  "Moa #7",
  "GP #1",
  "Erik #99",
];

function build(seed: number) {
  const card = buildRaceCard(NAMED_KUSKAR, createRng(seed));
  const timeline = simulateRace({
    horses: card.horses,
    stats: card.stats,
    seed,
    raceNo: RACE_NO,
    meters: distMeters(card.dist),
  });
  return { card, timeline };
}

function nextSeed(from: number, test: (t: RaceTimeline) => boolean): number {
  for (let s = from + 1; s < from + 5000; s++)
    if (test(build(s).timeline)) return s;
  return from;
}

export default function RaceLab() {
  const [params] = useSearchParams();
  const at = params.get("t");
  const [seed, setSeed] = useState(() => Number(params.get("seed")) || 75);
  const [elapsed, setElapsed] = useState(() => Number(at) || 0);
  const [playing, setPlaying] = useState(at === null);
  const { card, timeline } = useMemo(() => build(seed), [seed]);
  const total = runMs(timeline) + pauseMs(timeline) + 1500;

  useEffect(() => {
    if (!playing) return;
    let last = performance.now();
    const id = setInterval(() => {
      const now = performance.now();
      setElapsed((e) => Math.min(total, e + now - last));
      last = now;
    }, 100);
    return () => clearInterval(id);
  }, [playing, total]);

  const backers = useMemo<LaneBackers[]>(() => {
    const r = createRng(seed + 1);
    return card.horses.map((h) => {
      const top = r
        .shuffle(FAKE_BACKERS)
        .slice(0, r.int(4))
        .map((label) => ({ label, stake: 10 * (1 + r.int(30)) }));
      return {
        n: h.n,
        pool: top.reduce((s, b) => s + b.stake, 0),
        top,
        more: r.int(3),
      };
    });
  }, [seed, card]);

  const go = (s: number) => {
    setSeed(s);
    setElapsed(0);
    setPlaying(true);
  };
  const view = raceView(elapsed, timeline);
  const btn = "rounded bg-tote px-2 py-1 font-bold hover:bg-tote-hi";

  return (
    <div className="theme-rally75 relative">
      <RaceTrack
        raceNo={RACE_NO}
        field={card.horses}
        timeline={timeline}
        tick={view.tick}
        phase={view.phase}
        backers={backers}
        loadingText={GM_RACE.loading}
      />
      {params.get("panel") !== "0" && (
        <div className="fixed right-2 bottom-44 z-50 flex max-w-[30rem] flex-col gap-2 rounded-xl bg-black/85 p-3 text-sm text-ink ring-1 ring-white/20">
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1">
              {GM_RACE_LAB.seed}
              <input
                type="number"
                value={seed}
                onChange={(e) => go(Number(e.target.value) || 1)}
                className="w-24 rounded bg-night px-2 py-1 text-ink"
              />
            </label>
            <button
              className={btn}
              onClick={() => go(1 + Math.floor(Math.random() * 1e6))}
            >
              {GM_RACE_LAB.random}
            </button>
            <button className={btn} onClick={() => go(seed)}>
              {GM_RACE_LAB.replay}
            </button>
            <button className={btn} onClick={() => setPlaying((p) => !p)}>
              {playing ? GM_RACE_LAB.pause : GM_RACE_LAB.play}
            </button>
            <span className="text-ink-dim">
              {GM_RACE_LAB.scripts[timeline.script]},{" "}
              {timeline.gags.map((g) => GM_RACE.gag[g.kind]).join(" ")}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={total}
            value={elapsed}
            onChange={(e) => {
              setElapsed(Number(e.target.value));
              setPlaying(false);
            }}
          />
          <div className="flex flex-wrap gap-1">
            <span className="text-ink-dim">{GM_RACE_LAB.script}:</span>
            {(Object.keys(SCRIPT_WEIGHTS) as RaceScript[]).map((s) => (
              <button
                key={s}
                className={btn}
                onClick={() => go(nextSeed(seed, (t) => t.script === s))}
              >
                {GM_RACE_LAB.scripts[s]}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1">
            <span className="text-ink-dim">{GM_RACE_LAB.gag}:</span>
            {(["galopp", ...COMIC_GAGS] as const).map((k) => (
              <button
                key={k}
                className={btn}
                onClick={() =>
                  go(nextSeed(seed, (t) => t.gags.some((g) => g.kind === k)))
                }
              >
                {GM_RACE.gag[k]}
              </button>
            ))}
            <button
              className={btn}
              onClick={() =>
                go(
                  nextSeed(seed, (t) =>
                    t.gags.some((g) => g.tick === STRETCH_GAG_TICK),
                  ),
                )
              }
            >
              {GM_RACE_LAB.upplopp}
            </button>
            <button
              className={btn}
              onClick={() => go(nextSeed(seed, (t) => t.photo))}
            >
              {GM_RACE.photoStamp}
            </button>
            <button
              className={btn}
              onClick={() =>
                go(
                  nextSeed(seed, (t) =>
                    t.finishComment.text.startsWith("SKRÄLL"),
                  ),
                )
              }
            >
              {GM_RACE.skrall}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
