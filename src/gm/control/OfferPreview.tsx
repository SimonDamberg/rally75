// Preview of the guests' pop-up offers, on this phone only: nothing is sent anywhere. Simon taps an
// offer to see exactly what the guests get, countdown and all. The popup is drawn in Mr Green
// colours (theme-mrgreen) because that is how it looks on a guest's phone.
import { useState } from 'react'
import { GM_OFFERS } from '../../shared/content/gm'
import { OFFERS, type OfferCopy } from '../../shared/content/parody'
import { randomSeed } from '../../shared/game/rng'
import { Button, OfferPopup, type ShownOffer } from '../../ui'

export function OfferPreview() {
  const [shown, setShown] = useState<ShownOffer | null>(null)
  const show = (offer: OfferCopy) => setShown({ offer, openedAt: Date.now(), seed: randomSeed() })

  return (
    <section className="flex flex-col gap-3 border-t border-white/10 p-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h2 className="font-display text-2xl font-black text-plate uppercase">{GM_OFFERS.title}</h2>
        <span className="flex-1" />
        <Button variant="ghost" onClick={() => show(OFFERS[Math.floor(Math.random() * OFFERS.length)])}>
          {GM_OFFERS.random}
        </Button>
      </div>
      <p className="text-ink-dim">{GM_OFFERS.hint}</p>
      <ul className="flex flex-col gap-2">
        {OFFERS.map((offer) => (
          <li key={offer.id}>
            <button
              type="button"
              onClick={() => show(offer)}
              className="flex min-h-12 w-full flex-col items-start rounded-xl bg-tote/60 px-4 py-2.5 text-left ring-1 ring-white/10 ring-inset active:bg-tote"
            >
              <span className="text-xs font-black tracking-[0.14em] text-ink-dim uppercase">{offer.kicker}</span>
              <span className="font-extrabold">{offer.title}</span>
            </button>
          </li>
        ))}
      </ul>

      <div className="theme-mrgreen">
        <OfferPopup preview shown={shown} onClose={() => setShown(null)} onPlay={() => setShown(null)} />
      </div>
    </section>
  )
}
