// Full-screen race on the display iPad. Pure output: no buttons, and it never publishes.
// The timeline is replayed from the stored seed against races.started_at, so a reload mid-race
// resumes at the same tick and the control phone's Snabbspola lands here too.
import { useEffect, useEffectEvent, useState } from 'react'
import { useConnection, useServerClock } from '../../lib/hooks'
import type { RaceRow } from '../../lib/types'
import { GM_RACE } from '../../shared/content/gm'
import { UI_LABELS } from '../../shared/content/ui'
import { fmtInt } from '../../shared/game/format'
import { commentAt } from '../../shared/game/sim'
import { ConnectionBadge, cx, SilkBadge } from '../../ui'
import { raceView } from '../raceClock'
import { useRaceTimeline } from '../useRaceTimeline'
import { InquiryDrama } from './InquiryDrama'

const CLOCK_MS = 100
const START_LEFT = 6

export function RaceScreen({ race }: { race: RaceRow }) {
  const connection = useConnection()
  const { timeline, error } = useRaceTimeline(race)
  const { now: serverNow } = useServerClock()
  const start = race.started_at ? Date.parse(race.started_at) : serverNow()
  const [now, setNow] = useState(serverNow)

  const settled = race.status !== 'running'
  const tick = useEffectEvent(() => setNow(serverNow()))
  useEffect(() => {
    if (settled) return
    const id = setInterval(() => tick(), CLOCK_MS)
    return () => clearInterval(id)
  }, [settled])

  const last = timeline ? timeline.frames.length - 1 : 0
  const view = timeline ? raceView(now - start, timeline) : null
  const phase = settled ? 'done' : view?.phase
  const frame = timeline && view ? timeline.frames[settled ? last : view.tick] : null
  const comment = timeline && view ? (phase === 'running' ? commentAt(timeline, view.tick) : timeline.finishComment) : null

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-night-deep">
      <ConnectionBadge status={connection} variant="banner" size="tv" />

      <header className="flex shrink-0 items-center gap-6 px-8 py-4">
        <span className="plate rounded-lg bg-plate px-4 py-1 font-display text-tv-md font-black text-night uppercase">
          <span className="unplate">
            {UI_LABELS.race} {race.race_no}
          </span>
        </span>
        {!settled && (
          <span className="flex items-center gap-3 rounded-full bg-sleaze px-5 py-1.5 font-display text-tv-sm font-black text-white uppercase">
            <span className="size-4 animate-pulse-live rounded-full bg-white" />
            {UI_LABELS.live}
          </span>
        )}
        {frame && (
          <span className="font-display text-tv-md font-black text-ink tabular-nums">{GM_RACE.clock(fmtInt(frame.meters))}</span>
        )}
      </header>

      <div className="relative flex min-h-0 flex-1 flex-col gap-2 px-6 pb-3">
        {race.field.map((h, i) => {
          const runner = frame?.runners[i]
          const left = runner ? (settled && timeline ? (timeline.finalLeft[h.n] ?? runner.left) : runner.left) : START_LEFT
          return (
            <div
              key={h.n}
              className="relative min-h-0 flex-1 rounded-2xl bg-[linear-gradient(180deg,rgb(11_58_140/0.55),rgb(7_18_58/0.85))] ring-1 ring-white/10 ring-inset"
            >
              <div className="absolute inset-y-0 left-[91%] w-2 bg-[repeating-linear-gradient(0deg,#fff_0_10px,#111_10px_20px)] opacity-85" />
              <span className="absolute bottom-1.5 left-4 max-w-[55%] truncate text-2xl font-extrabold text-white/35 [font-stretch:82%]">
                {h.name}
              </span>
              <div
                className="absolute inset-0 transition-transform ease-linear will-change-transform"
                style={{ transform: `translateX(${left}%)`, transitionDuration: `${timeline?.tickMs ?? 300}ms` }}
              >
                <span className="absolute top-1/2 left-0 -translate-x-1/2 -translate-y-1/2">
                  <SilkBadge n={h.n} silk={h.silk} size="tv" lead={frame?.leader === h.n} broke={runner?.broke} />
                </span>
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex min-h-40 shrink-0 items-center border-t-4 border-plate/40 bg-black/60 px-10 py-5">
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
          <p className="text-tv-sm font-bold text-ink-dim">{error ? error.message : GM_RACE.loading}</p>
        )}
      </div>

      {/* Drama only: the ruling buttons live on the control phone. */}
      {phase === 'done' && !settled && timeline?.inquiry && <InquiryDrama text={timeline.inquiry.text} />}
    </div>
  )
}
