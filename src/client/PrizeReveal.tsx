// A vinstkort paying out. One beat, unlike the kupong: the scan was the guest's tap, so the money
// lands straight away, with the plates falling for a guldkort.
import type { PrizeClaimRow } from '../lib/types'
import { VINSTKORT } from '../shared/content/client'
import { PRIZE_CARD_TIER_COPY } from '../shared/content/coupons'
import { fmtRm } from '../shared/game/format'
import { Button, Modal } from '../ui'
import { CoinBurst } from './CoinBurst'
import { CountUp } from './CountUp'

const BIG_FROM = 1000

export function PrizeReveal({ claimed, onClose }: { claimed: PrizeClaimRow; onClose: () => void }) {
  const tier = PRIZE_CARD_TIER_COPY[claimed.tier as 1 | 2 | 3]
  return (
    <>
      <CoinBurst big={claimed.amount >= BIG_FROM} />
      <Modal
        open
        onClose={onClose}
        tone="sleaze"
        title={VINSTKORT.wonTitle}
        actions={
          <Button size="lg" block onClick={onClose}>
            {VINSTKORT.cta}
          </Button>
        }
      >
        <div className="flex flex-col items-center gap-3 py-2 text-center">
          <p className="font-display text-3xl leading-none font-black text-plate uppercase">{tier?.name}</p>
          <div className="bulbs w-full rounded-xl bg-night-deep px-4 py-6">
            <CountUp
              to={claimed.amount}
              format={fmtRm}
              className="font-display text-6xl leading-none font-black text-cash tabular-nums"
            />
          </div>
          {claimed.label && <p className="text-lg text-ink-dim">{VINSTKORT.from(claimed.label)}</p>}
          <p className="text-ink-dim">{VINSTKORT.wonText}</p>
          <p className="text-xs text-ink-dim">{VINSTKORT.smallPrint}</p>
        </div>
      </Modal>
    </>
  )
}
