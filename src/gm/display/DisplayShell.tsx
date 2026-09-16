// The iPad. Pure output, driven entirely by the race status arriving over Realtime: there is
// nothing to tap, so it can be propped up across the room and left alone all night.
// Every control lives on the phone at /gm.
import { useEffect, useMemo, useState } from "react";
import { useActiveRace, useLeaderboard, useRaceBets } from "../../lib/hooks";
import type { PlayerRow } from "../../lib/types";
import { ATTRACT } from "../../shared/content/ui";
import { Attract } from "./Attract";
import { FieldBoard } from "./FieldBoard";
import { RaceScreen } from "./RaceScreen";
import { ResultDisplay } from "./ResultDisplay";
import { Spotlight } from "./HorseSpotlight";
import { useFallbackPublish } from "./useFallbackPublish";

/** How long a finished race holds the screen before the attract loop takes over again. */
const RESULT_MS = 45_000;

export function DisplayShell() {
  const { data: race } = useActiveRace();
  const { data: board } = useLeaderboard();
  const { data: bets } = useRaceBets(race?.id ?? null);
  const players = useMemo(
    () =>
      new Map<string, PlayerRow>((board?.players ?? []).map((p) => [p.id, p])),
    [board?.players],
  );

  // Safety net if the control phone dies between the finish and the publish.
  useFallbackPublish(race);

  // Hold the result, then fall back to attract. Keyed on the race so a new one resets the timer.
  const settledId =
    race && (race.status === "finished" || race.status === "void")
      ? race.id
      : null;
  const [dismissed, setDismissed] = useState<string | null>(null);
  useEffect(() => {
    if (!settledId) return;
    const id = setTimeout(() => setDismissed(settledId), RESULT_MS);
    return () => clearTimeout(id);
  }, [settledId]);

  if (race?.status === "running") return <RaceScreen race={race} />;

  if (race && settledId && dismissed !== settledId) {
    return <ResultDisplay race={race} bets={bets} players={players} />;
  }

  if (race?.status === "betting") {
    return (
      <Attract>
        <Spotlight race={race} bets={bets} />
      </Attract>
    );
  }
  if (race?.status === "closed") {
    return (
      <Attract>
        <FieldBoard
          race={race}
          bets={bets}
          title={ATTRACT.closedTitle}
          subtitle={ATTRACT.closedSub}
        />
      </Attract>
    );
  }

  return <Attract />;
}
