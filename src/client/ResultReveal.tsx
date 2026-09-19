// Result pop-up after a race: what you won or lost, the winner and the ruling.
import type { RaceRow } from '../lib/types'
import { HOME, REVEAL } from '../shared/content/client'
import { STODLINJE } from '../shared/content/parody'
import { UI_LABELS } from '../shared/content/ui'
import { fmtRm } from '../shared/game/format'
import { Button, cx, Modal, HorseBadge, StodlinjeNote, type ModalTone } from '../ui'
import { CoinBurst } from './CoinBurst'
import { CountUp } from './CountUp'
import { isBigWin, type Reveal, type RevealKind } from './outcome'

const COPY: Record<RevealKind, { title: string; text: string; tone: ModalTone }> = {
  win: { title: REVEAL.winTitle, text: REVEAL.winText, tone: 'sleaze' },
  loss: { title: REVEAL.lossTitle, text: REVEAL.lossText, tone: 'danger' },
  refund: { title: REVEAL.refundTitle, text: REVEAL.refundText, tone: 'default' },
  kept: { title: REVEAL.keptTitle, text: REVEAL.keptText, tone: 'danger' },
  watch: { title: REVEAL.watchTitle, text: REVEAL.watchText, tone: 'default' },
  void: { title: REVEAL.voidTitle, text: REVEAL.voidText, tone: 'default' },
}

const plus = (n: number) => `+${fmtRm(n)}`
const minus = (n: number) => `-${fmtRm(n)}`

export function ResultReveal({ race, reveal, onClose }: { race: RaceRow; reveal: Reveal; onClose: () => void }) {
  const big = isBigWin(reveal)
  const copy = big ? { ...COPY.win, title: REVEAL.bigWinTitle } : COPY[reveal.kind]
  const winner = reveal.winner === null ? undefined : race.field.find((h) => h.n === reveal.winner)
  const ruling = race.result && race.result.ruling !== 'void' ? HOME.ruling[race.result.ruling] : ''

  let amount: { value: number; format: (n: number) => string; className: string } | null = null
  if (reveal.kind === 'win') amount = { value: reveal.paid, format: plus, className: 'text-cash' }
  if (reveal.kind === 'refund') amount = { value: reveal.paid, format: plus, className: 'text-ink' }
  if (reveal.kind === 'loss' || reveal.kind === 'kept') amount = { value: reveal.staked, format: minus, className: 'text-drift' }

  return (
    <Modal
      open
      onClose={onClose}
      tone={copy.tone}
      title={copy.title}
      className="theme-rally75"
      actions={
        <Button size="lg" block onClick={onClose}>
          {REVEAL.ok}
        </Button>
      }
    >
      {reveal.kind === 'win' && <CoinBurst big={big} />}
      <div className="flex flex-col gap-4">
        <p className="text-xs font-bold tracking-[0.16em] text-ink-dim uppercase">{REVEAL.raceNo(race.race_no)}</p>
        {amount && (
          <div className={cx('rounded-xl bg-night-deep px-4 py-5 text-center', reveal.kind === 'win' && 'bulbs')}>
            <CountUp
              to={amount.value}
              format={amount.format}
              ms={reveal.kind === 'win' ? 1800 : 700}
              className={cx('font-display text-6xl leading-none font-black tabular-nums', amount.className)}
            />
          </div>
        )}
        <p>{copy.text}</p>
        {(reveal.kind === 'loss' || reveal.kind === 'kept') && <StodlinjeNote lead={STODLINJE.lead.loss} />}
        {winner && (
          <div className="flex items-center gap-3 rounded-xl bg-tote/60 p-3 ring-2 ring-plate ring-inset">
            <HorseBadge horse={winner} size="md" lead />
            <span className="flex min-w-0 flex-col">
              <span className="text-[0.65rem] font-bold tracking-[0.16em] text-plate uppercase">{REVEAL.winner}</span>
              <span className="text-lg leading-tight font-extrabold [font-stretch:82%]">{winner.name}</span>
              <span className="truncate text-sm text-ink-dim">
                {UI_LABELS.kusk}: {winner.jockey}
              </span>
            </span>
          </div>
        )}
        {ruling && <p className="font-semibold text-plate">{ruling}</p>}
        {race.result?.inquiry_text && <p className="text-sm text-ink-dim italic">{race.result.inquiry_text}</p>}
      </div>
    </Modal>
  )
}
