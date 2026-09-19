// "Spela": the active race, shown by status. Betting opens the slip and the confirm pop-up.
import { useEffect, useState } from 'react'
import type { BetRow, RaceRow } from '../lib/types'
import { HOME } from '../shared/content/client'
import { UI_LABELS } from '../shared/content/ui'
import { cx, HorseRow, Logo, HorseBadge, SmallPrint, StatusBanner } from '../ui'
import { BetLine } from './BetLine'
import { BetSlip } from './BetSlip'
import { useGuest } from './guest'
import { marketOdds } from './slip'

export interface HomeProps {
  onConfirmChange: (open: boolean) => void
  /** The bet slip is open (the guest is mid-bet; no offers on top). */
  onSlipChange: (open: boolean) => void
}

export function Home({ onConfirmChange, onSlipChange }: HomeProps) {
  const { race, raceError } = useGuest()

  if (race === undefined) {
    return (
      <Empty
        title={raceError ? raceError.message : HOME.loading}
        spinner
        tone={raceError ? 'error' : 'dim'}
      />
    )
  }
  if (race === null) return <Empty title={HOME.noRace} text={HOME.noRaceText} />
  return <RaceView key={race.id} race={race} onConfirmChange={onConfirmChange} onSlipChange={onSlipChange} />
}

function Empty({ title, text, spinner, tone = 'plate' }: { title: string; text?: string; spinner?: boolean; tone?: 'plate' | 'dim' | 'error' }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      {spinner && (
        <span
          role="img"
          aria-label={UI_LABELS.loading}
          className="size-8 animate-spin rounded-full border-4 border-plate border-t-transparent"
        />
      )}
      <p
        className={cx(
          'font-display leading-none font-black uppercase',
          tone === 'plate' && 'text-4xl text-plate',
          tone === 'dim' && 'text-2xl text-ink-dim',
          tone === 'error' && 'text-2xl text-drift',
        )}
      >
        {title}
      </p>
      {text && <p className="max-w-xs text-ink-dim">{text}</p>}
      <SmallPrint className="mt-6" />
    </div>
  )
}

function RaceView({ race, onConfirmChange, onSlipChange }: { race: RaceRow } & HomeProps) {
  const { bets: playerBets, player, raceBets } = useGuest()
  const { odds, pools } = marketOdds(race.field, raceBets ?? [])
  const mine = (playerBets ?? []).filter((b) => b.race_id === race.id)
  const [selected, setSelected] = useState<number | null>(null)
  const betting = race.status === 'betting'
  const pick = betting && selected !== null ? race.field.find((h) => h.n === selected) : undefined
  const slipOpen = !!pick && !!player

  useEffect(() => {
    onSlipChange(slipOpen)
  }, [slipOpen, onSlipChange])
  useEffect(() => () => onSlipChange(false), [onSlipChange])

  return (
    <div className="flex flex-1 flex-col">
      {/* Rally75 is a product inside the Mr Green site, so the race gets its own tote-blue panel on
          the green page. theme-rally75 goes on this element, never on a new wrapper: the bet slip
          below is sticky inside this flex column and an extra box would break it. */}
      <div className="theme-rally75 m-3 flex flex-col gap-3 rounded-2xl bg-night p-3 shadow-[0_0.25rem_1.5rem_rgb(0_0_0/0.35)] ring-1 ring-tote-hi/25">
        <div className="flex items-baseline justify-between gap-2 border-b border-white/10 pb-2">
          <Logo size="sm" />
          <span className="font-display text-[0.6rem] font-bold tracking-[0.2em] text-ink-dim uppercase">
            {HOME.productTag}
          </span>
        </div>
        <StatusBanner status={race.status} raceNo={race.race_no} />

        {race.status === 'paddock' && (
          <>
            <p className="px-1 text-sm text-ink-dim">{HOME.paddockHint}</p>
            {race.field.map((h, i) => (
              <HorseRow key={h.n} horse={h} odds={odds[i]} />
            ))}
          </>
        )}

        {betting && (
          <>
            <p className="px-1 text-sm text-ink-dim">{HOME.pickHint}</p>
            {race.field.map((h, i) => (
              <HorseRow
                key={h.n}
                horse={h}
                odds={odds[i]}
                pool={pools[i]}
                variant="pick"
                selected={selected === h.n}
                onSelect={(n) => setSelected(selected === n ? null : n)}
              />
            ))}
          </>
        )}

        {(race.status === 'closed' || race.status === 'running') && (
          <>
            <LivePanel running={race.status === 'running'} />
            <FieldSummary race={race} odds={odds} />
          </>
        )}

        {(race.status === 'finished' || race.status === 'void') && <ResultCard race={race} />}

        {race.status !== 'paddock' && <RaceBets race={race} bets={mine} loading={playerBets === undefined} />}
      </div>
      <SmallPrint />

      {slipOpen && pick && player && (
        <BetSlip
          race={race}
          horse={pick}
          odds={odds[race.field.indexOf(pick)]}
          balance={player.balance}
          onClose={() => setSelected(null)}
          onConfirmChange={onConfirmChange}
        />
      )}
    </div>
  )
}

function LivePanel({ running }: { running: boolean }) {
  return (
    <div
      className={cx(
        'flex flex-col items-center gap-2 rounded-2xl px-5 py-8 text-center ring-2 ring-inset',
        running ? 'bulbs bg-sleaze/15 ring-sleaze' : 'bg-drift/10 ring-drift/60',
      )}
    >
      {running && <span className="size-5 animate-pulse-live rounded-full bg-sleaze" />}
      <p className={cx('font-display text-4xl leading-none font-black text-balance uppercase', running ? 'text-sleaze' : 'text-drift')}>
        {running ? HOME.runningTitle : HOME.closedTitle}
      </p>
      <p className="max-w-xs text-ink-dim">{running ? HOME.runningText : HOME.closedText}</p>
    </div>
  )
}

function FieldSummary({ race, odds }: { race: RaceRow; odds: number[] }) {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="px-1 text-xs font-bold tracking-[0.14em] text-ink-dim uppercase">{HOME.finalOdds}</h2>
      {race.field.map((h, i) => (
        <HorseRow key={h.n} horse={h} odds={odds[i]} variant="pick" />
      ))}
    </div>
  )
}

function ResultCard({ race }: { race: RaceRow }) {
  const result = race.result
  const voided = race.status === 'void'
  const podium = !voided && result ? result.order.slice(0, 3) : []
  return (
    <section className="flex flex-col gap-3 rounded-2xl bg-tote/40 p-3 ring-1 ring-white/10 ring-inset">
      <h2 className="font-display text-3xl leading-none font-black text-plate uppercase">{HOME.resultTitle}</h2>
      {podium.length > 0 && (
        <ol className="flex flex-col gap-2">
          {podium.map((n, i) => {
            const h = race.field.find((x) => x.n === n)
            if (!h) return null
            return (
              <li
                key={n}
                className={cx(
                  'flex items-center gap-3 rounded-xl px-3 py-2',
                  i === 0 ? 'bg-tote ring-2 ring-plate ring-inset' : 'bg-night/60',
                )}
              >
                <span className="w-7 font-display text-2xl font-black text-ink-dim">{i + 1}</span>
                <HorseBadge horse={h} size={i === 0 ? 'md' : 'sm'} lead={i === 0} />
                <span className="flex min-w-0 flex-col leading-tight">
                  <span className={cx('truncate font-extrabold [font-stretch:82%]', i === 0 ? 'text-lg' : 'text-base')}>{h.name}</span>
                  <span className="truncate text-xs text-plate">
                    {UI_LABELS.kusk}: {h.jockey}
                  </span>
                </span>
              </li>
            )
          })}
        </ol>
      )}
      {voided && !result && <p className="font-semibold">{HOME.voided}</p>}
      {result && result.ruling !== 'none' && <RulingText race={race} />}
    </section>
  )
}

function RulingText({ race }: { race: RaceRow }) {
  const result = race.result!
  return (
    <div className="text-sm">
      <p className="font-semibold text-plate">{HOME.ruling[result.ruling]}</p>
      {result.inquiry_text && <p className="mt-1 text-ink-dim italic">{result.inquiry_text}</p>}
    </div>
  )
}

function RaceBets({ race, bets, loading }: { race: RaceRow; bets: BetRow[]; loading: boolean }) {
  return (
    <section className="flex flex-col gap-2 pt-2">
      <h2 className="px-1 text-xs font-bold tracking-[0.14em] text-ink-dim uppercase">{HOME.yourBets}</h2>
      {!loading && bets.length === 0 && <p className="px-1 text-sm text-ink-dim">{HOME.noBetsHere}</p>}
      <ul className="flex flex-col gap-1.5">
        {bets.map((b) => (
          <BetLine key={b.id} bet={b} horse={race.field.find((h) => h.n === b.horse_n)} />
        ))}
      </ul>
    </section>
  )
}
