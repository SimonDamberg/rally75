// The race as the room sees it on the display iPad: four lanes, the commentary strip, and the
// staging around them (upplopp banner, photo finish, winner stamp, skräll). Purely presentational:
// everything comes in as props, so the dev race lab at /styleguide/race can play any seed.
import { useMemo, type CSSProperties, type ReactNode } from 'react'
import { COMMENTARY } from '../../shared/content/commentary'
import { GM_RACE } from '../../shared/content/gm'
import { UI_LABELS } from '../../shared/content/ui'
import { fmtInt, fmtRm } from '../../shared/game/format'
import { createRng } from '../../shared/game/rng'
import { commentAt, SKRALL_ODDS } from '../../shared/game/sim'
import type { GagKind, HorsePublic, RaceTimeline } from '../../shared/game/types'
import { cx, HorseBadge } from '../../ui'
import type { LaneBackers } from '../book'
import type { RacePhase } from '../raceClock'
import { GagProps, GagSticker } from './GagSprite'
import { MrGreenBug } from './MrGreenBug'

const START_LEFT = 6
const FINISH_LEFT = 91
/** How far back the placing arrow looks, in ticks. */
const PLACE_LOOKBACK = 4
/** The upplopp banner holds this many ticks. */
const BANNER_TICKS = 8
/** How the badge itself moves while a gag runs; the props around it are GagProps. */
const GAG_MOTION: Partial<Record<GagKind, string>> = {
  backwards: '-scale-x-100',
  nap: 'rotate-[-20deg] brightness-75',
  banana: 'animate-spin-fast',
  husvagn: 'animate-shake',
  serverkrasch: 'animate-glitch',
  eckero: 'opacity-40 grayscale',
  rallyhafte: 'animate-rock',
}
/** Gags where the horse is not trotting, so it kicks up no dust. */
const STANDING: readonly GagKind[] = ['backwards', 'nap', 'serverkrasch', 'fatbyte', 'eckero', 'hjalprebus']
/** Kommitte: the two badges lean into each other across the lane line. */
const LEAN = { up: '-translate-y-[0.22em] rotate-[-10deg]', down: 'translate-y-[0.22em] rotate-[10deg]' } as const

export interface RaceTrackProps {
  raceNo: number
  field: readonly HorsePublic[]
  timeline: RaceTimeline | null
  tick: number
  /** done also covers a settled race. */
  phase: RacePhase
  backers: readonly LaneBackers[]
  /** Shown in the strip before the timeline has loaded. */
  loadingText: string
  /** Above the header (the connection banner). */
  banner?: ReactNode
  /** Overlays on top of everything (inquiry drama). */
  children?: ReactNode
}

function placesAt(timeline: RaceTimeline, tick: number): Map<number, number> {
  const runners = timeline.frames[Math.max(0, Math.min(tick, timeline.frames.length - 1))].runners
  return new Map([...runners].sort((a, b) => b.pos - a.pos).map((r, i) => [r.n, i + 1]))
}

export function RaceTrack({ raceNo, field, timeline, tick, phase, backers, loadingText, banner, children }: RaceTrackProps) {
  const last = timeline ? timeline.frames.length - 1 : 0
  const frame = timeline ? timeline.frames[phase === 'running' ? tick : last] : null
  const running = phase === 'running' && tick > 0
  const finished = phase !== 'running'
  const stretch = !!frame?.stretch && !finished
  const slowmo = !!frame?.slowmo && !finished
  // Frame index where the upplopp starts: frames are not ticks, since a gag's ultrarapid adds some.
  const stretchStart = useMemo(() => timeline?.frames.findIndex((f) => f.stretch) ?? -1, [timeline])
  const winnerN = timeline?.finishOrder[0]
  const winner = field.find((h) => h.n === winnerN)
  const photo = !!timeline?.photo && finished
  // Once the photo is read, the strip names the winner instead of repeating "MÅLFOTO!".
  const comment = !timeline
    ? null
    : running || tick === 0
      ? commentAt(timeline, tick)
      : photo && phase === 'done' && winner
        ? { text: COMMENTARY.win(winner, raceNo), hype: true }
        : timeline.finishComment
  const skrall = finished && !!winner && winner.baseOdds >= SKRALL_ODDS
  const stake = backers.reduce((s, b) => s + b.pool, 0)

  const places = timeline && frame ? placesAt(timeline, frame.tick) : null
  const before = timeline && frame && frame.tick > PLACE_LOOKBACK ? placesAt(timeline, frame.tick - PLACE_LOOKBACK) : null

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-night-deep">
      {banner}
      <header className="flex shrink-0 items-center gap-6 px-8 py-4">
        <span className="plate rounded-lg bg-plate px-4 py-1 font-display text-tv-md font-black text-night uppercase">
          <span className="unplate">
            {UI_LABELS.race} {raceNo}
          </span>
        </span>
        {!finished && (
          <span className="flex items-center gap-3 rounded-full bg-sleaze px-5 py-1.5 font-display text-tv-sm font-black text-sleaze-ink uppercase">
            <span className="size-4 animate-pulse-live rounded-full bg-white" />
            {UI_LABELS.live}
          </span>
        )}
        {frame && <span className="font-display text-tv-md font-black text-ink tabular-nums">{GM_RACE.clock(fmtInt(frame.meters))}</span>}
        {slowmo && (
          <span className="animate-pop-in rounded-full bg-tote-hi px-5 py-1.5 font-display text-tv-sm font-black tracking-widest text-white uppercase ring-2 ring-white/60">
            {GM_RACE.slowmo}
          </span>
        )}
        <div className="ml-auto flex items-center gap-6">
          {stake > 0 && (
            <span className="rounded-full bg-black/40 px-5 py-1.5 font-display text-tv-sm font-black text-plate tabular-nums ring-2 ring-plate/60">
              {GM_RACE.atStake(fmtRm(stake))}
            </span>
          )}
          <MrGreenBug />
        </div>
      </header>

      <div
        className={cx(
          'relative flex min-h-0 flex-1 flex-col gap-2 px-6 pb-3 transition-[transform,filter] duration-[1500ms] ease-out',
          photo && phase === 'finishing' && 'grayscale',
          // Ultrarapid: the trot and the dust slow down with the field.
          slowmo && '[&_.animate-puff]:[animation-duration:1.8s] [&_.animate-trot]:[animation-duration:1s]',
        )}
        style={{ transform: stretch ? 'scale(1.04)' : 'none', transformOrigin: `${FINISH_LEFT}% 50%` }}
      >
        {field.map((h, i) => {
          const runner = frame?.runners[i]
          const left = runner ? (finished && timeline ? (timeline.finalLeft[h.n] ?? runner.left) : runner.left) : START_LEFT
          const gag = running ? runner?.gag : undefined
          const partnerLane = gag && runner?.partner !== undefined ? field.findIndex((x) => x.n === runner.partner) : -1
          const toward = partnerLane < 0 ? undefined : partnerLane < i ? 'up' : 'down'
          const lane = backers.find((b) => b.n === h.n)
          const place = places?.get(h.n)
          const was = before?.get(h.n)
          const won = finished && h.n === winnerN
          return (
            <div key={h.n} className="relative min-h-0 flex-1">
              {/* Turf: stripes scroll while the field moves, slower in the slow-motion upplopp. */}
              <div
                className={cx(
                  'absolute inset-0 rounded-2xl ring-1 ring-white/10 ring-inset',
                  'bg-[repeating-linear-gradient(90deg,rgb(255_255_255/0.05)_0_60px,transparent_60px_120px),linear-gradient(180deg,rgb(11_58_140/0.55),rgb(7_18_58/0.85))]',
                  running && 'animate-rail',
                )}
                style={{ animationDuration: slowmo ? '2.1s' : stretch ? '1.5s' : '0.7s' }}
              />
              <div className="absolute inset-y-0 left-[91%] w-2 bg-[repeating-linear-gradient(0deg,#fff_0_10px,#111_10px_20px)] opacity-85" />
              <div className="absolute inset-y-1 left-40 flex max-w-[60%] flex-col justify-between">
                <span className="truncate text-2xl font-extrabold text-white/35 [font-stretch:82%]">{h.name}</span>
                <span className="truncate text-xl font-bold text-plate/75">
                  {lane && lane.top.length > 0 ? (
                    <>
                      {GM_RACE.backers(fmtRm(lane.pool))} {lane.top.map((b) => b.label).join(', ')}
                      {lane.more > 0 && ` ${GM_RACE.moreBackers(lane.more)}`}
                    </>
                  ) : (
                    <span className="text-white/25 italic">{GM_RACE.noBackers}</span>
                  )}
                </span>
              </div>

              <div
                className="absolute inset-0 transition-transform ease-linear will-change-transform"
                style={{ transform: `translateX(${left}%)`, transitionDuration: `${timeline?.tickMs ?? 300}ms` }}
              >
                <span className="absolute top-1/2 left-0 z-10 -translate-x-1/2 -translate-y-1/2">
                  <span
                    className={cx(
                      'relative block size-[1em] text-[6.5rem] transition-[scale] duration-500',
                      won && !(photo && phase === 'finishing') && 'scale-125',
                    )}
                  >
                    {running && !(gag && STANDING.includes(gag)) && (
                      <>
                        <span className="absolute top-[55%] right-[70%] size-[0.35em] animate-puff rounded-full bg-white/30 blur-[3px]" />
                        <span className="absolute top-[65%] right-[75%] size-[0.28em] animate-puff rounded-full bg-white/25 blur-[3px] [animation-delay:0.3s]" />
                      </>
                    )}
                    <span
                      className={cx(
                        'block size-full',
                        running && !gag && 'animate-trot',
                        gag && GAG_MOTION[gag],
                        toward && LEAN[toward],
                      )}
                    >
                      <HorseBadge horse={h} size="tv" lead={frame?.leader === h.n && !finished} broke={gag === 'galopp'} />
                    </span>
                    {gag && <GagProps kind={gag} toward={toward} />}
                    {place && frame && frame.tick > 0 && !finished && (
                      <span
                        className={cx(
                          'plate absolute -top-[0.06em] -left-[0.14em] rounded-[0.12em] px-[0.14em] font-display text-[0.26em] leading-tight font-black tabular-nums shadow-[0.06em_0.06em_0_rgb(0_0_0/0.5)]',
                          place === 1 ? 'bg-plate text-night' : 'bg-night-deep text-ink ring-1 ring-white/30',
                        )}
                      >
                        <span className="unplate">
                          {GM_RACE.place(place)}
                          {was && was > place && <span className={place === 1 ? 'text-night' : 'text-cash'}> ▲</span>}
                          {was && was < place && <span className="text-drift"> ▼</span>}
                        </span>
                      </span>
                    )}
                    {/* A couple shares one sticker, on the upper lane. */}
                    {gag && toward !== 'up' && <GagSticker key={`${h.n}-${gag}`} kind={gag} />}
                  </span>
                  {won && <WinnerStamp delay={photo && phase === 'finishing'} />}
                </span>
              </div>
            </div>
          )
        })}

        {stretch && frame && frame.tick < stretchStart + BANNER_TICKS && (
          <div className="pointer-events-none absolute inset-0 z-20 grid place-items-center">
            <p className="plate animate-slam rounded-2xl bg-plate px-12 py-3 font-display text-[8rem] leading-none font-black text-night uppercase shadow-[0_0_4rem_rgb(255_214_10/0.6)]">
              <span className="unplate">{GM_RACE.stretchBanner}</span>
            </p>
          </div>
        )}
        {photo && phase === 'finishing' && <PhotoFinish />}
      </div>

      {/* Vignette on the upplopp: the rest of the world goes dark. */}
      <div
        className="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(ellipse_at_70%_50%,transparent_45%,rgb(0_0_0/0.6))] transition-opacity duration-1000"
        style={{ opacity: stretch ? 1 : 0 }}
      />

      <div
        className={cx(
          'relative z-10 flex min-h-40 shrink-0 items-center border-t-4 px-10 py-5 transition-colors duration-700',
          stretch ? 'border-plate bg-[linear-gradient(90deg,rgb(255_214_10/0.18),rgb(0_0_0/0.7))]' : 'border-plate/40 bg-black/60',
        )}
      >
        {comment ? (
          <p
            key={comment.text}
            className={cx(
              'animate-pop-in text-tv-md leading-tight font-black [text-shadow:0_0.1em_0.4em_rgb(0_0_0/0.8)]',
              comment.hype ? 'text-plate' : 'text-ink',
            )}
          >
            {comment.text}
          </p>
        ) : (
          <p className="text-tv-sm font-bold text-ink-dim">{loadingText}</p>
        )}
      </div>

      {finished && winner && (!photo || phase === 'done') && <CoinRain seed={timeline?.seed ?? 0} />}
      {skrall && (!photo || phase === 'done') && (
        <div className="pointer-events-none absolute inset-x-0 top-24 z-20 grid place-items-center">
          <p className="animate-shake">
            <span className="block animate-stamp rounded-2xl bg-drift px-10 py-2 font-display text-tv-xl font-black text-white uppercase shadow-[0.4rem_0.4rem_0_rgb(0_0_0/0.5)]">
              {GM_RACE.skrall}
            </span>
          </p>
        </div>
      )}

      {children}
    </div>
  )
}

function WinnerStamp({ delay }: { delay?: boolean }) {
  return (
    <span
      className="pointer-events-none absolute top-1/2 right-full z-20 mr-10 -translate-y-1/2 animate-stamp rounded-xl border-4 border-plate bg-night-deep/85 px-4 py-1 font-display text-tv-md font-black whitespace-nowrap text-plate uppercase"
      style={{ animationDelay: delay ? '1.9s' : undefined }}
    >
      {GM_RACE.winnerStamp}
    </span>
  )
}

/** White flash, a MÅLFOTO stamp and a scan line sweeping to the finish while the lanes go grey. */
function PhotoFinish() {
  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      <div className="absolute inset-0 animate-flash bg-white" />
      <div
        className="absolute inset-y-0 w-1.5 animate-scan bg-drift shadow-[0_0_1.5rem_0.4rem_rgb(255_90_60/0.7)]"
        style={{ left: `${FINISH_LEFT}%` }}
      />
      <p className="absolute top-4 left-1/2 -translate-x-1/2 animate-stamp rounded-xl border-6 border-white px-8 py-1 font-display text-tv-xl font-black tracking-widest text-white uppercase">
        {GM_RACE.photoStamp}
      </p>
    </div>
  )
}

/** RM coins rain over the finish. Seeded, so a re-render does not reshuffle the rain. */
function CoinRain({ seed }: { seed: number }) {
  const coins = useMemo(() => {
    const r = createRng(seed)
    return Array.from({ length: 36 }, () => ({
      left: r.float(0, 100),
      delay: r.float(0, 1.4),
      duration: r.float(1.8, 3.2),
      size: r.float(2.2, 4),
      spin: (r.next() < 0.5 ? -1 : 1) * r.float(360, 1080),
    }))
  }, [seed])
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
      {coins.map((c, i) => (
        <span
          key={i}
          className="absolute -top-16 grid animate-coin-fall place-items-center rounded-md bg-plate font-display leading-none font-black text-night shadow-[0.15rem_0.15rem_0_var(--color-sleaze)]"
          style={
            {
              left: `${c.left}%`,
              width: `${c.size}rem`,
              height: `${c.size * 0.75}rem`,
              fontSize: `${c.size * 0.42}rem`,
              animationDelay: `${c.delay}s`,
              animationDuration: `${c.duration}s`,
              '--coin-spin': `${c.spin}deg`,
            } as CSSProperties
          }
        >
          RM
        </span>
      ))}
    </div>
  )
}
