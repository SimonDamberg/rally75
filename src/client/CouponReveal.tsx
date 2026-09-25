// A printed kupong being cashed in. Two beats on purpose: first the ticket is acknowledged with a
// button, then the money lands. Crediting the balance silently would waste the one moment where the
// physical game and the site meet.
import type { CouponRow } from '../lib/types'
import { KUPONG } from '../shared/content/client'
import { COUPON_TIER_COPY } from '../shared/content/coupons'
import { feeLines, formatCode, isShortchanged, printedValue } from '../shared/game/coupon'
import { fmtRm } from '../shared/game/format'
import { Button, Modal } from '../ui'
import { CoinBurst } from './CoinBurst'
import { CountUp } from './CountUp'

/** Big enough to earn the falling plates: a guldkupong, or anything above it. */
const BIG_FROM = 1000

export function CouponReveal({
  pending,
  claimed,
  busy,
  onRedeem,
  onClose,
}: {
  pending: string | null
  claimed: CouponRow | null
  busy: boolean
  onRedeem: (code: string) => void
  onClose: () => void
}) {
  const open = !!pending || !!claimed
  const tier = claimed ? COUPON_TIER_COPY[claimed.tier as 1 | 2 | 3] : undefined
  // The bonuskupong prank: the printed value crossed out, a receipt of made-up fees, then the truth.
  const prank = !!claimed && isShortchanged(claimed)

  return (
    <>
      {claimed && <CoinBurst big={claimed.amount >= BIG_FROM} />}
      <Modal
        open={open}
        onClose={onClose}
        dismissible={!busy}
        tone="sleaze"
        title={claimed ? (prank ? KUPONG.prankTitle : KUPONG.wonTitle) : KUPONG.waitingTitle}
        actions={
          claimed ? (
            <Button size="lg" block onClick={onClose}>
              {KUPONG.redeemedCta}
            </Button>
          ) : (
            <>
              <Button variant="ghost" disabled={busy} onClick={onClose}>
                {KUPONG.later}
              </Button>
              <Button variant="sleaze" loading={busy} onClick={() => pending && onRedeem(pending)}>
                {KUPONG.redeem}
              </Button>
            </>
          )
        }
      >
        <div className="flex flex-col items-center gap-3 py-2 text-center">
          {claimed ? (
            <>
              <p className="font-display text-3xl leading-none font-black text-plate uppercase">
                {tier?.name}
              </p>
              <div className="bulbs w-full rounded-xl bg-night-deep px-4 py-6">
                {prank && (
                  <div className="mb-4 flex flex-col gap-1">
                    <p className="font-display text-4xl leading-none font-black text-ink-dim tabular-nums line-through decoration-drift decoration-4">
                      {fmtRm(printedValue(claimed))}
                    </p>
                    <ul className="mt-2 flex flex-col gap-0.5 text-left text-sm">
                      {feeLines(claimed, KUPONG.prankFees.length).map((fee, i) => (
                        <li key={KUPONG.prankFees[i]} className="flex justify-between gap-3">
                          <span className="text-ink-dim">{KUPONG.prankFees[i]}</span>
                          <span className="font-bold text-drift tabular-nums">-{fmtRm(fee)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <CountUp
                  to={claimed.amount}
                  format={fmtRm}
                  className="font-display text-6xl leading-none font-black text-cash tabular-nums"
                />
              </div>
              {claimed.label && <p className="text-lg text-ink-dim">{KUPONG.from(claimed.label)}</p>}
              <p className="text-ink-dim">{prank ? KUPONG.prankText : KUPONG.wonText}</p>
            </>
          ) : (
            <>
              <p className="font-display text-4xl leading-none font-black text-plate tabular-nums">
                {pending && formatCode(pending)}
              </p>
              <p className="text-lg">{KUPONG.waitingText}</p>
            </>
          )}
          <p className="text-xs text-ink-dim">{KUPONG.smallPrint}</p>
        </div>
      </Modal>
    </>
  )
}
