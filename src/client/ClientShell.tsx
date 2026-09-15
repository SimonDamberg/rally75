// Signed-in guest: header, the three tabs, and the pop-ups that can appear from any tab (bonus
// reveal after sign-up, result reveal after a race, Snabblån when broke).
import { useMemo, useState } from 'react'
import { useActiveRace, useConnection, usePlayerBets } from '../lib/hooks'
import type { Identity, PlayerRow } from '../lib/types'
import { CLIENT_TABS } from '../shared/content/client'
import { MIN_STAKE } from '../shared/game/economy'
import { BonusBar, ConnectionBadge, cx } from '../ui'
import { BonusReveal } from './BonusReveal'
import { GuestContext, type Guest } from './guest'
import { Header } from './Header'
import { Home } from './Home'
import { Leaderboard } from './Leaderboard'
import { LoanOffer } from './LoanOffer'
import { MyBets } from './MyBets'
import { ResultReveal } from './ResultReveal'
import { useResultReveal } from './useResultReveal'

type Tab = 'home' | 'bets' | 'board'
const TABS: readonly Tab[] = ['home', 'bets', 'board']
const TAB_ICON: Record<Tab, string> = { home: '★', bets: '▤', board: '♛' }

export interface ClientShellProps {
  identity: Identity
  player: PlayerRow | undefined
  forget: () => void
  justJoined: boolean
  onBonusSeen: () => void
}

export function ClientShell({ identity, player, forget, justJoined, onBonusSeen }: ClientShellProps) {
  const connection = useConnection()
  const { data: race, error: raceError } = useActiveRace()
  const { data: bets } = usePlayerBets(identity.playerId)
  const [tab, setTab] = useState<Tab>('home')
  const [confirming, setConfirming] = useState(false)
  const [loanRequested, setLoanRequested] = useState(false)

  const guest = useMemo<Guest>(
    () => ({ identity, player, bets, race, raceError, forget }),
    [identity, player, bets, race, raceError, forget],
  )

  const reveal = useResultReveal(race, bets, player)
  // Broke with nothing still riding: winnings from open bets may be on the way.
  const broke = !!player && player.balance < MIN_STAKE && !!bets && !bets.some((b) => b.status === 'open')
  const blocked = justJoined || reveal.open || confirming

  return (
    <GuestContext value={guest}>
      <div className="flex h-dvh flex-col">
        <BonusBar />
        <Header player={player} connection={connection} broke={broke} onLoan={() => setLoanRequested(true)} />
        <ConnectionBadge status={connection} variant="banner" />
        <main className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain">
          {tab === 'home' && <Home onConfirmChange={setConfirming} />}
          {tab === 'bets' && <MyBets />}
          {tab === 'board' && <Leaderboard />}
        </main>
        <nav className="grid shrink-0 grid-cols-3 border-t border-white/10 bg-night-deep pb-[env(safe-area-inset-bottom)]">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={tab === t}
              onClick={() => setTab(t)}
              className={cx(
                'flex min-h-15 flex-col items-center justify-center gap-0.5 font-display text-base font-extrabold tracking-wide uppercase',
                tab === t ? 'text-plate' : 'text-ink-dim active:text-ink',
              )}
            >
              <span aria-hidden className="text-lg leading-none">
                {TAB_ICON[t]}
              </span>
              {CLIENT_TABS[t]}
            </button>
          ))}
        </nav>
      </div>

      <BonusReveal open={justJoined && !!player} player={player} onClose={onBonusSeen} />
      {reveal.open && race && reveal.data && <ResultReveal race={race} reveal={reveal.data} onClose={reveal.close} />}
      <LoanOffer
        broke={broke}
        blocked={blocked}
        requested={loanRequested}
        onRequestHandled={() => setLoanRequested(false)}
      />
    </GuestContext>
  )
}
