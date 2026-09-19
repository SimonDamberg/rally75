// Signed-in guest: header, the tabs, and the pop-ups that can appear from any tab (bonus
// reveal after sign-up, result reveal after a race, Snabblån when broke, pop-up offers), plus the
// fake social proof.
import { useMemo, useState } from 'react'
import { useActiveRace, useConnection, useLeaderboard, usePlayerBets, useRaceBets, useShopItems } from '../lib/hooks'
import type { Identity, PlayerRow } from '../lib/types'
import { CLIENT_TABS } from '../shared/content/client'
import { LOAN_THRESHOLD } from '../shared/game/economy'
import { BonusBar, ConnectionBadge, cx } from '../ui'
import { Bank } from './Bank'
import { BonusReveal } from './BonusReveal'
import { Butik } from './Butik'
import { CouponReveal } from './CouponReveal'
import { GuestContext, type Guest } from './guest'
import { Header } from './Header'
import { Home } from './Home'
import { Leaderboard } from './Leaderboard'
import { LoanOffer } from './LoanOffer'
import { MyBets } from './MyBets'
import { OfferPopup } from './OfferPopup'
import { Plinko } from './Plinko'
import { ResultReveal } from './ResultReveal'
import { SocialStrip } from './SocialStrip'
import { useCoupon } from './useCoupon'
import { useOffers } from './useOffers'
import { useResultReveal } from './useResultReveal'
import { useSocialProof } from './useSocialProof'

type Tab = 'home' | 'plinko' | 'bets' | 'bank' | 'butik' | 'board'
const TABS: readonly Tab[] = ['home', 'plinko', 'bets', 'bank', 'butik', 'board']
const TAB_ICON: Record<Tab, string> = { home: '★', plinko: '●', bets: '▤', bank: '¤', butik: '◆', board: '♛' }

export interface ClientShellProps {
  identity: Identity
  player: PlayerRow | undefined
  forget: () => void
  justJoined: boolean
  cookiesAccepted: boolean
  onBonusSeen: () => void
}

export function ClientShell({ identity, player, forget, justJoined, cookiesAccepted, onBonusSeen }: ClientShellProps) {
  const connection = useConnection()
  const { data: race, error: raceError } = useActiveRace()
  const { data: bets } = usePlayerBets(identity.playerId)
  const { data: raceBets } = useRaceBets(race?.id ?? null)
  const { data: board } = useLeaderboard()
  const { data: shopItems } = useShopItems()
  const [tab, setTab] = useState<Tab>('home')
  const [confirming, setConfirming] = useState(false)
  const [slipOpen, setSlipOpen] = useState(false)
  const [loanRequested, setLoanRequested] = useState(false)
  const [buying, setBuying] = useState(false)
  // Plånko balls in the air: the header shows this instead of the live balance until they land.
  const [plinkoHold, setPlinkoHold] = useState<number | undefined>()
  const dropping = plinkoHold !== undefined

  const guest = useMemo<Guest>(
    () => ({ identity, player, bets, race, raceBets, raceError, shopItems, forget }),
    [identity, player, bets, race, raceBets, raceError, shopItems, forget],
  )
  const players = useMemo(() => new Map((board?.players ?? []).map((p) => [p.id, p])), [board?.players])

  const reveal = useResultReveal(race, bets, player)
  const coupon = useCoupon(guest)
  // Broke with nothing still riding: winnings from open bets may be on the way.
  const broke = !!player && player.balance < LOAN_THRESHOLD && !!bets && !bets.some((b) => b.status === 'open')
  // A scanned kupong waits its turn behind the welcome bonus, a result and the bet confirm, then
  // blocks everything else itself: a pop-up offer over the reveal would bury the payout.
  const couponOpen = (!!coupon.pending || !!coupon.claimed) && !justJoined && !reveal.open && !confirming
  const blocked = justJoined || reveal.open || confirming || couponOpen
  // Offers also wait for the cookie banner, a bet, a purchase or a Plånko ball in progress and
  // Snabblån (broke).
  const offers = useOffers(blocked || slipOpen || buying || dropping || broke || !cookiesAccepted)
  useSocialProof({ race, raceBets, playerId: identity.playerId, players, paused: blocked || !cookiesAccepted })

  return (
    <GuestContext value={guest}>
      <div className="flex h-dvh flex-col">
        <BonusBar />
        <Header player={player} heldBalance={plinkoHold} broke={broke} onLoan={() => setLoanRequested(true)} />
        <SocialStrip />
        <ConnectionBadge status={connection} variant="banner" />
        <main className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain">
          {tab === 'home' && <Home onConfirmChange={setConfirming} onSlipChange={setSlipOpen} />}
          {tab === 'plinko' && <Plinko onHold={setPlinkoHold} />}
          {tab === 'bets' && <MyBets />}
          {tab === 'bank' && (
            <Bank
              broke={broke}
              onLoan={() => setLoanRequested(true)}
              onRedeemCoupon={(code) => void coupon.redeem(code)}
              couponBusy={coupon.busy}
            />
          )}
          {tab === 'butik' && <Butik onConfirmChange={setBuying} />}
          {tab === 'board' && <Leaderboard />}
        </main>
        {/* auto-cols-fr, not grid-cols-N: adding a tab to TABS must not need a class edit. */}
        <nav className="grid shrink-0 grid-flow-col auto-cols-fr border-t border-white/10 bg-night-deep pb-[env(safe-area-inset-bottom)]">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={tab === t}
              onClick={() => setTab(t)}
              className={cx(
                'flex min-h-15 flex-col items-center justify-center gap-0.5 px-0.5 text-center font-display text-xs leading-tight font-extrabold tracking-wide uppercase',
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
      {couponOpen && (
        <CouponReveal
          pending={coupon.pending}
          claimed={coupon.claimed}
          busy={coupon.busy}
          onRedeem={(code) => void coupon.redeem(code)}
          onClose={coupon.close}
        />
      )}
      {reveal.open && race && reveal.data && <ResultReveal race={race} reveal={reveal.data} onClose={reveal.close} />}
      <LoanOffer
        broke={broke}
        blocked={blocked || dropping || !!offers.current}
        requested={loanRequested}
        onRequestHandled={() => setLoanRequested(false)}
      />
      <OfferPopup shown={offers.current} onClose={offers.close} onPlay={() => setTab('home')} />
    </GuestContext>
  )
}
