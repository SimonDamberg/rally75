// Pop-up offer scheduler: one offer at a time, a cooldown after each, and never while another
// pop-up or a bet in progress needs the screen.
import { useCallback, useEffect, useRef, useState } from 'react'
import { OFFERS, type OfferCopy } from '../shared/content/parody'
import { createRng, randomSeed } from '../shared/game/rng'
import { nextOfferDelay, OFFER_RESUME_MS, pickOffer } from './offers'

export interface ShownOffer {
  offer: OfferCopy
  openedAt: number
  /** Seeds the restarting countdown. */
  seed: number
}

export interface OffersState {
  current: ShownOffer | null
  /** Closes the offer and starts the cooldown. */
  close: () => void
}

const rng = createRng(randomSeed())

export function useOffers(blocked: boolean): OffersState {
  const [s, setS] = useState<{ current: ShownOffer | null; lastId: string | null }>({ current: null, lastId: null })
  // When the next offer is due. null: pin a fresh delay the next time the timer is armed.
  const dueRef = useRef<number | null>(null)
  const [rearm, setRearm] = useState(0)

  // Something more important took the screen: the offer steps aside and counts as shown.
  if (blocked && s.current) setS({ current: null, lastId: s.current.offer.id })

  const close = useCallback(() => {
    dueRef.current = Date.now() + nextOfferDelay(rng, false)
    setS((prev) => ({ current: null, lastId: prev.current?.offer.id ?? prev.lastId }))
  }, [])

  const shown = s.current !== null
  const { lastId } = s
  useEffect(() => {
    if (blocked || shown) return
    const now = Date.now()
    if (dueRef.current === null) dueRef.current = now + nextOfferDelay(rng, lastId === null)
    // Re-armed whenever a block clears, so an offer never follows another pop-up too closely.
    const delay = Math.max(dueRef.current - now, OFFER_RESUME_MS)
    const t = setTimeout(() => {
      if (document.hidden) {
        dueRef.current = Date.now() + OFFER_RESUME_MS
        setRearm((n) => n + 1)
        return
      }
      dueRef.current = null
      const offer = pickOffer(rng, OFFERS, lastId)
      setS({ current: { offer, openedAt: Date.now(), seed: randomSeed() }, lastId })
    }, delay)
    return () => clearTimeout(t)
  }, [blocked, shown, lastId, rearm])

  return { current: s.current, close }
}
