// The display iPad's standing layout: a swappable left panel beside the join QR, with the trotting
// field along the bottom and a fanfare for every new sign-up. DisplayShell decides what goes on the
// left (idle attract, the field, or the horse spotlight); the QR never leaves, so a guest who walks
// in halfway through the night can always scan.
import { useEffect, useState, type ReactNode } from "react";
import { useConnection, useLeaderboard, useNightPaid } from "../../lib/hooks";
import type { PlayerRow } from "../../lib/types";
import { ATTRACT } from "../../shared/content/ui";
import { WELCOME_BONUS } from "../../shared/game/economy";
import { fmtRmLong, playerLabel } from "../../shared/game/format";
import { BonusBar, ConnectionBadge, Logo, NightPaidNumber, QrCode } from "../../ui";
import { Jackpot } from "./Jackpot";
import { JoinFanfare } from "./JoinFanfare";
import { TrotParade } from "./TrotParade";

const LINE_MS = 4500;

function RotatingLine() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(
      () => setI((x) => (x + 1) % ATTRACT.lines.length),
      LINE_MS,
    );
    return () => clearInterval(id);
  }, []);
  return (
    <p key={i} className="animate-pop-in text-tv-sm font-semibold text-ink">
      {ATTRACT.lines[i]}
    </p>
  );
}

function PlayerCount({
  players,
}: {
  players: readonly PlayerRow[] | undefined;
}) {
  if (!players) return null;
  const last = players.reduce<PlayerRow | undefined>(
    (a, p) => (!a || p.created_at > a.created_at ? p : a),
    undefined,
  );
  return (
    <div className="flex flex-col gap-1">
      <p className="flex items-center gap-4 text-tv-sm text-ink">
        <span className="size-4 shrink-0 animate-pulse-live rounded-full bg-cash" />
        {players.length === 0 ? (
          ATTRACT.noPlayers
        ) : (
          <span
            key={players.length}
            className="inline-block origin-left animate-count-pop font-bold"
          >
            {ATTRACT.players(players.length)}
          </span>
        )}
      </p>
      {last && (
        <p className="truncate pl-8 text-2xl text-ink-dim">
          {ATTRACT.lastIn(playerLabel(last.name, last.tag))}
        </p>
      )}
    </div>
  );
}

function NightPaid() {
  const { data } = useNightPaid();
  return (
    <p className="flex flex-col items-end font-display leading-none font-black uppercase">
      <span className="text-2xl tracking-[0.12em] text-ink-dim">{ATTRACT.nightPaid}</span>
      <span className="mt-1 text-[min(2.5rem,3.6vw)] whitespace-nowrap text-cash drop-shadow-[0_0_1rem_rgb(61_255_168/0.35)]">
        <NightPaidNumber realPaid={data ?? 0} /> RM
      </span>
    </p>
  );
}

/** Between races: the jackpot, the sleaze lines and who has joined. */
export function AttractMain() {
  const { data } = useLeaderboard();
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex items-end justify-between gap-6">
        <Logo size="lg" />
        <NightPaid />
      </div>
      <Jackpot />
      <RotatingLine />
      <PlayerCount players={data?.players} />
    </div>
  );
}

/** The standing chrome. `children` fills the left column. */
export function Attract({ children }: { children?: ReactNode }) {
  const connection = useConnection();
  const { data } = useLeaderboard();
  const joinUrl = `${window.location.origin}/`;
  const host = window.location.host;

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden">
      <BonusBar />
      <ConnectionBadge status={connection} variant="banner" size="tv" />

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_auto] items-center gap-10 overflow-hidden px-12 py-[1vh]">
        {children ?? <AttractMain />}

        <div className="flex flex-col items-center gap-4">
          <div className="plate rounded-3xl bg-plate p-4 shadow-[0.6rem_0.6rem_0_var(--color-sleaze)]">
            <div className="unplate overflow-hidden rounded-xl">
              <QrCode
                value={joinUrl}
                label={ATTRACT.qrLabel(host)}
                className="size-[min(16rem,30dvh)]"
              />
            </div>
          </div>
          <p className="mt-2 font-display text-tv-md font-black text-plate uppercase">
            {ATTRACT.scan}
          </p>
          <p className="rounded-full bg-sleaze px-5 py-1.5 font-display text-tv-sm font-black text-white uppercase">
            {ATTRACT.bonus(fmtRmLong(WELCOME_BONUS))}
          </p>
          <p className="text-2xl font-semibold text-ink-dim">{host}</p>
        </div>
      </div>

      <TrotParade />
      <JoinFanfare players={data?.players} />
    </div>
  );
}
