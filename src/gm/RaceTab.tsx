// Race control panel: the field in big type (doubles as the guest-facing display) and the next
// step of the lifecycle along the bottom.
import { useState, type ReactNode } from 'react'
import { useRaceBets } from '../lib/hooks'
import type { PlayerRow, RaceRow } from '../lib/types'
import { GM_RACE } from '../shared/content/gm'
import { fmtRm } from '../shared/game/format'
import { Button, HorseRow, Modal, StatusBanner } from '../ui'
import { summarizeBook } from './book'
import { ResultPanel } from './ResultPanel'
import type { RaceControl } from './useRaceControl'

export interface RaceTabProps {
  race: RaceRow | null | undefined
  players: ReadonlyMap<string, PlayerRow>
  control: RaceControl
  canCreate: boolean
  onCreate: () => void
}

export function RaceTab({ race, players, control, canCreate, onCreate }: RaceTabProps) {
  if (race === undefined) {
    return <p className="p-8 text-tv-sm text-ink-dim">{GM_RACE.loading}</p>
  }
  if (race === null) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
        <p className="font-display text-tv-lg font-black text-plate uppercase">{GM_RACE.noActive}</p>
        <p className="text-tv-sm text-ink-dim">{GM_RACE.noActiveHint}</p>
        <Button size="tv" loading={control.busy} disabled={!canCreate} onClick={onCreate}>
          {GM_RACE.create}
        </Button>
      </div>
    )
  }
  return <ActiveRace race={race} players={players} control={control} canCreate={canCreate} onCreate={onCreate} />
}

function ActiveRace({ race, players, control, canCreate, onCreate }: RaceTabProps & { race: RaceRow }) {
  const { data: bets } = useRaceBets(race.id)
  const [confirmVoid, setConfirmVoid] = useState(false)
  // Paddock: the horse Simon is presenting opens as a full card, the rest stay compact.
  const [focus, setFocus] = useState<number | null>(null)
  const book = summarizeBook(race.field, bets ?? [])
  const settled = race.status === 'finished' || race.status === 'void'
  const { busy } = control

  const cancelRace = async () => {
    if (await control.setStatus(race, 'void')) setConfirmVoid(false)
  }

  let actions: ReactNode
  const voidButton = (
    <Button size="lg" variant="ghost" disabled={busy} onClick={() => setConfirmVoid(true)}>
      {GM_RACE.void}
    </Button>
  )
  const pot = (
    <p className="flex items-baseline gap-4 text-2xl text-ink-dim">
      <span>{GM_RACE.bets(book.count)}</span>
      <span>{GM_RACE.pot}</span>
      <b className="font-display text-tv-md font-black text-plate tabular-nums">{fmtRm(book.totalStake)}</b>
    </p>
  )
  switch (race.status) {
    case 'paddock':
      actions = (
        <>
          {voidButton}
          <span className="flex-1" />
          <Button size="lg" variant="ghost" loading={busy} disabled={!canCreate} onClick={() => void control.reroll(race)}>
            {GM_RACE.reroll}
          </Button>
          <Button size="lg" loading={busy} onClick={() => void control.setStatus(race, 'betting')}>
            {GM_RACE.openBetting}
          </Button>
        </>
      )
      break
    case 'betting':
      actions = (
        <>
          {voidButton}
          <span className="flex-1" />
          {pot}
          <Button size="lg" variant="sleaze" loading={busy} onClick={() => void control.setStatus(race, 'closed')}>
            {GM_RACE.closeBetting}
          </Button>
        </>
      )
      break
    case 'closed':
      actions = (
        <>
          {voidButton}
          <span className="flex-1" />
          {pot}
          <Button size="lg" variant="ghost" loading={busy} onClick={() => void control.setStatus(race, 'betting')}>
            {GM_RACE.reopenBetting}
          </Button>
          <Button size="lg" loading={busy} onClick={() => void control.start(race)}>
            {GM_RACE.start}
          </Button>
        </>
      )
      break
    case 'running':
      actions = voidButton
      break
    default:
      actions = (
        <>
          <span className="flex-1" />
          <Button size="lg" loading={busy} disabled={!canCreate} onClick={onCreate}>
            {GM_RACE.next}
          </Button>
        </>
      )
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-1 flex-col gap-4 p-6">
        {settled ? (
          <ResultPanel race={race} bets={bets} players={players} />
        ) : (
          <>
            <StatusBanner status={race.status} raceNo={race.race_no} />
            <div className="flex flex-col gap-3">
              {race.field.map((h, i) => {
                const open = race.status === 'paddock' && focus === h.n
                return (
                  <HorseRow
                    key={h.n}
                    horse={h}
                    odds={book.horses[i].odds}
                    pool={race.status === 'paddock' ? undefined : book.horses[i].pool}
                    variant={open ? 'card' : 'pick'}
                    size="tv"
                    selected={open}
                    onSelect={race.status === 'paddock' ? (n) => setFocus(focus === n ? null : n) : undefined}
                  />
                )
              })}
            </div>
          </>
        )}
      </div>

      <div className="sticky bottom-0 flex flex-wrap items-center gap-4 border-t border-white/10 bg-night-deep/95 px-6 py-4">
        {actions}
      </div>

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
            <Button variant="danger" loading={busy} onClick={() => void cancelRace()}>
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
