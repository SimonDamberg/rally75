// A pop-up offer: sleazy headline, a countdown that restarts when it runs out, one tap to dismiss.
// Lives in src/ui because two apps draw it: the guest shell (useOffers schedules it) and the GM
// control phone's preview, which has to show exactly what the guests see.
import { useEffect, useState } from 'react'
import { OFFER_UI, STODLINJE, type OfferCopy } from '../shared/content/parody'
import { countdown, EXTENDED_MS, fmtClock } from '../shared/game/countdown'
import { Button } from './Button'
import { cx } from './cx'
import { Modal } from './Modal'
import { toast } from './toast'

export interface ShownOffer {
  offer: OfferCopy
  openedAt: number
  /** Seeds the restarting countdown. */
  seed: number
}

export interface OfferPopupProps {
  shown: ShownOffer | null
  onClose: () => void
  /** For offers whose CTA sends the guest to Spela. */
  onPlay: () => void
  /** The GM's preview: the CTA only closes, so trying the Stödlinje offer does not ring Axel. */
  preview?: boolean
}

export function OfferPopup({ shown, onClose, onPlay, preview = false }: OfferPopupProps) {
  const offer = shown?.offer
  const accept = () => {
    if (!offer) return
    onClose()
    if (preview) return
    if (offer.call) window.location.href = `tel:${STODLINJE.number}`
    else if (offer.link) window.open(offer.link, '_blank', 'noopener')
    else if (offer.accepted === null) onPlay()
    else toast({ text: offer.accepted, tone: 'win' })
  }

  return (
    <Modal
      open={!!shown}
      onClose={onClose}
      tone={offer?.call ? 'danger' : 'sleaze'}
      title={offer?.title}
      actions={
        <div className="flex w-full flex-col gap-2">
          <Button variant={offer?.call ? 'danger' : 'sleaze'} size="lg" block onClick={accept}>
            {offer?.cta}
          </Button>
          {offer?.call && <p className="text-center text-sm font-bold text-ink-dim tabular-nums">{STODLINJE.display}</p>}
          <button type="button" onClick={onClose} className="min-h-11 text-sm font-semibold text-ink-dim underline">
            {offer?.decline ?? OFFER_UI.decline}
          </button>
        </div>
      }
    >
      {shown && offer && (
        <div className="flex flex-col gap-4">
          <p className="-mt-1 text-xs font-black tracking-[0.18em] text-plate uppercase">{offer.kicker}</p>
          {offer.image && (
            <img
              src={offer.image}
              alt=""
              className={cx(
                'aspect-[4/3] max-h-[34dvh] w-full rounded-xl object-cover object-[50%_35%] ring-2',
                offer.call ? 'ring-drift' : 'ring-sleaze',
              )}
            />
          )}
          <p className="text-lg font-semibold">{offer.text}</p>
          <Countdown key={shown.openedAt} openedAt={shown.openedAt} seed={shown.seed} label={offer.expires} />
          <p className="text-[0.7rem] leading-snug text-ink-dim">
            {offer.smallPrint} {OFFER_UI.terms}.
          </p>
        </div>
      )}
    </Modal>
  )
}

function Countdown({ openedAt, seed, label }: { openedAt: number; seed: number; label?: string }) {
  const [now, setNow] = useState(openedAt)
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(id)
  }, [])
  const c = countdown(now - openedAt, seed)
  const extended = c.cycle > 0 && c.msIntoCycle < EXTENDED_MS

  return (
    <div className="bulbs flex items-center justify-between gap-3 rounded-xl bg-night-deep px-4 py-4">
      <span
        className={cx(
          'text-xs font-bold tracking-[0.14em] uppercase',
          extended ? 'animate-pulse-live text-cash' : 'text-ink-dim',
        )}
      >
        {extended ? OFFER_UI.extended : (label ?? OFFER_UI.expires)}
      </span>
      <span
        key={c.cycle}
        className={cx(
          'font-display text-5xl leading-none font-black tabular-nums',
          c.seconds <= 5 ? 'text-drift' : 'text-plate',
          c.cycle > 0 && 'animate-odds-flash',
        )}
      >
        {fmtClock(c.seconds)}
      </span>
    </div>
  )
}
