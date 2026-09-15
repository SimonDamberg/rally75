// Full-screen race on the GM iPad. The timeline is replayed from the stored seed against a start
// time, so a reload mid-race resumes at the same tick. Guests only see the result reveal.
import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { useConnection, useRaceBets } from '../lib/hooks'
import { loadRaceStart, saveRaceStart } from '../lib/identity'
import type { PlayerRow, RaceRow } from '../lib/types'
import { GM_RACE, GM_TABS } from '../shared/content/gm'
import { UI_LABELS } from '../shared/content/ui'
import { fmtInt } from '../shared/game/format'
import { commentAt } from '../shared/game/sim'
import type { Ruling } from '../shared/game/types'
import { Button, ConnectionBadge, cx, Modal, SilkBadge } from '../ui'
import { InquiryOverlay } from './InquiryOverlay'
import { ResultPanel } from './ResultPanel'
import { raceView, skippedStart } from './raceClock'
import type { RaceControl } from './useRaceControl'
import { useRaceTimeline } from './useRaceTimeline'

const CLOCK_MS = 100
const START_LEFT = 6

export interface RaceScreenProps {
  race: RaceRow
  players: ReadonlyMap<string, PlayerRow>
  control: RaceControl
  canCreate: boolean
  onNext: () => void
  onAttract: () => void
  onClose: () => void
}

export function RaceScreen({ race, players, control, canCreate, onNext, onAttract, onClose }: RaceScreenProps) {
  const connection = useConnection()
  const { timeline, error } = useRaceTimeline(race)
  const { data: bets } = useRaceBets(race.id)
  const [start, setStart] = useState(
    () => loadRaceStart(race.id) ?? (race.started_at ? Date.parse(race.started_at) : Date.now()),
  )
  const [now, setNow] = useState(Date.now)
  const [confirmVoid, setConfirmVoid] = useState(false)
  const [publishFailed, setPublishFailed] = useState(false)
  const attempted = useRef(false)

  const settled = race.status !== 'running'
  useEffect(() => {
    if (settled) return
    const id = setInterval(() => setNow(Date.now()), CLOCK_MS)
    return () => clearInterval(id)
  }, [settled])

  const last = timeline ? timeline.frames.length - 1 : 0
  const view = timeline ? raceView(now - start, timeline) : null
  const phase = settled ? 'done' : view?.phase
  const frame = timeline && view ? timeline.frames[settled ? last : view.tick] : null
  const comment = timeline && view ? (phase === 'running' ? commentAt(timeline, view.tick) : timeline.finishComment) : null

  const publish = async (ruling: Ruling, inquiryText: string | null) => {
    if (!timeline) return
    const res = await control.publish(race, timeline.finishOrder, ruling, inquiryText)
    setPublishFailed(!res)
  }

  // No inquiry: the result goes out by itself once the finish pause is over.
  const autoPublish = useEffectEvent(() => void publish('none', null))
  const needsAutoPublish = phase === 'done' && !settled && timeline !== null && !timeline.inquiry
  useEffect(() => {
    if (!needsAutoPublish || attempted.current) return
    attempted.current = true
    autoPublish()
  }, [needsAutoPublish])

  const skip = () => {
    if (!timeline) return
    const at = skippedStart(Date.now(), timeline)
    saveRaceStart({ raceId: race.id, at })
    setStart(at)
    setNow(Date.now())
  }

  const cancelRace = async () => {
    if (await control.setStatus(race, 'void')) setConfirmVoid(false)
  }

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
        <span className="flex-1" />
        {!settled && publishFailed && !timeline?.inquiry && (
          <Button size="lg" loading={control.busy} onClick={() => void publish('none', null)}>
            {GM_RACE.publish}
          </Button>
        )}
        {!settled && phase === 'running' && (
          <Button size="lg" variant="ghost" onClick={skip}>
            {GM_RACE.skip}
          </Button>
        )}
        {!settled && (
          <Button variant="ghost" className="opacity-60" onClick={() => setConfirmVoid(true)}>
            {GM_RACE.void}
          </Button>
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

      {settled && (
        <div className="absolute inset-0 z-20 animate-pop-in overflow-y-auto bg-night-deep px-10 py-6">
          <ResultPanel
            race={race}
            bets={bets}
            players={players}
            actions={
              <>
                <Button size="lg" variant="ghost" onClick={onClose}>
                  {GM_TABS.open}
                </Button>
                <Button size="lg" variant="ghost" onClick={onAttract}>
                  {GM_TABS.toAttract}
                </Button>
                <Button size="lg" loading={control.busy} disabled={!canCreate} onClick={onNext}>
                  {GM_RACE.next}
                </Button>
              </>
            }
          />
        </div>
      )}

      {phase === 'done' && !settled && timeline?.inquiry && (
        <InquiryOverlay
          text={timeline.inquiry.text}
          busy={control.busy}
          onRule={(ruling) => void publish(ruling, timeline.inquiry?.text ?? null)}
        />
      )}

      <Modal
        open={confirmVoid}
        onClose={() => setConfirmVoid(false)}
        tone="danger"
        title={GM_RACE.voidConfirmTitle}
        actions={
          <>
            <Button variant="ghost" onClick={() => setConfirmVoid(false)}>
              {GM_RACE.cancel}
            </Button>
            <Button variant="danger" loading={control.busy} onClick={() => void cancelRace()}>
              {GM_RACE.voidConfirmOk}
            </Button>
          </>
        }
      >
        <p className="text-xl">{GM_RACE.voidConfirmText}</p>
      </Modal>
    </div>
  )
}
