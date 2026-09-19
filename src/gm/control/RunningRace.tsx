// The race as the control phone sees it: a compact readout of what the room is watching, plus the
// only controls that matter while it runs. This side owns publishing (the display never does), so
// the auto-publish that used to live in RaceScreen lives here.
import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { useServerClock } from '../../lib/hooks'
import type { RaceRow } from '../../lib/types'
import { GM_RACE } from '../../shared/content/gm'
import { UI_LABELS } from '../../shared/content/ui'
import { fmtInt } from '../../shared/game/format'
import { commentAt } from '../../shared/game/sim'
import type { Ruling } from '../../shared/game/types'
import { Button, cx, HorseBadge } from '../../ui'
import { raceView, runMs } from '../raceClock'
import type { RaceControl } from '../useRaceControl'
import { useRaceTimeline } from '../useRaceTimeline'
import { InquiryRulings } from './InquiryRulings'

const CLOCK_MS = 200

const PHASE_LABEL = {
  running: GM_RACE.phaseRunning,
  finishing: GM_RACE.phaseFinishing,
  done: GM_RACE.phaseDone,
} as const

export function RunningRace({ race, control }: { race: RaceRow; control: RaceControl }) {
  const { timeline, error } = useRaceTimeline(race)
  const { now: serverNow } = useServerClock()
  const [now, setNow] = useState(serverNow)
  const [publishFailed, setPublishFailed] = useState(false)
  const attempted = useRef(false)

  const start = race.started_at ? Date.parse(race.started_at) : serverNow()
  const tick = useEffectEvent(() => setNow(serverNow()))
  useEffect(() => {
    const id = setInterval(() => tick(), CLOCK_MS)
    return () => clearInterval(id)
  }, [])

  const view = timeline ? raceView(now - start, timeline) : null
  const phase = view?.phase
  const frame = timeline && view ? timeline.frames[view.tick] : null
  const comment = timeline && view ? (phase === 'running' ? commentAt(timeline, view.tick) : timeline.finishComment) : null
  const leader = frame ? race.field.find((h) => h.n === frame.leader) : undefined

  const publish = async (ruling: Ruling, inquiryText: string | null) => {
    if (!timeline) return
    const res = await control.publish(race, timeline.finishOrder, ruling, inquiryText)
    setPublishFailed(!res)
  }

  // No inquiry: the result goes out by itself once the finish pause is over.
  const autoPublish = useEffectEvent(() => void publish('none', null))
  const needsAutoPublish = phase === 'done' && timeline !== null && !timeline.inquiry
  useEffect(() => {
    if (!needsAutoPublish || attempted.current) return
    attempted.current = true
    autoPublish()
  }, [needsAutoPublish])

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-2 rounded-full bg-sleaze px-3 py-1 font-display text-sm font-black text-white uppercase">
          <span className="size-2.5 animate-pulse-live rounded-full bg-white" />
          {UI_LABELS.live}
        </span>
        <span className="font-display text-xl font-black text-ink uppercase">{GM_RACE.liveTitle}</span>
        <span className="flex-1" />
        {frame && <span className="font-display text-2xl font-black text-plate tabular-nums">{GM_RACE.clock(fmtInt(frame.meters))}</span>}
      </div>

      <p className="text-xs font-bold tracking-[0.14em] text-ink-dim uppercase">
        {phase ? PHASE_LABEL[phase] : GM_RACE.loading}
      </p>

      {leader && (
        <div className="flex items-center gap-3 rounded-xl bg-tote/60 px-3 py-2 ring-1 ring-white/10 ring-inset">
          <HorseBadge horse={leader} size="md" lead />
          <span className="flex min-w-0 flex-col">
            <span className="text-xs font-bold tracking-[0.14em] text-ink-dim uppercase">{GM_RACE.leader}</span>
            <span className="truncate text-lg font-extrabold [font-stretch:82%]">{leader.name}</span>
          </span>
        </div>
      )}

      <div className="min-h-20 rounded-xl bg-black/40 px-4 py-3">
        {comment ? (
          <p key={comment.text} className={cx('animate-pop-in leading-snug font-bold', comment.hype ? 'text-plate' : 'text-ink')}>
            {comment.text}
          </p>
        ) : (
          <p className="text-sm text-ink-dim">{error ? error.message : GM_RACE.loading}</p>
        )}
      </div>

      <p className="text-xs text-ink-dim">{GM_RACE.onDisplay}</p>

      <span className="flex-1" />

      {phase === 'running' && (
        <Button block variant="ghost" disabled={!timeline} onClick={() => timeline && void control.skip(race, runMs(timeline))}>
          {GM_RACE.skip}
        </Button>
      )}
      {publishFailed && !timeline?.inquiry && (
        <Button block loading={control.busy} onClick={() => void publish('none', null)}>
          {GM_RACE.publish}
        </Button>
      )}

      {phase === 'done' && timeline?.inquiry && (
        <InquiryRulings
          text={timeline.inquiry.text}
          busy={control.busy}
          onRule={(ruling) => void publish(ruling, timeline.inquiry?.text ?? null)}
        />
      )}
    </div>
  )
}
