// The Mystery Box opening, Counter-Strike style: a strip of prizes races past a marker, slows down
// for far too long and stops on the one open_box already drew. The prize is known before the first
// frame; the reel (buildReel) is dressing. No sound, the drama is the deceleration and the glow.
import { useEffectEvent, useLayoutEffect, useRef, useState } from 'react'
import type { BoxPrizeRow } from '../lib/types'
import { BUTIK } from '../shared/content/client'
import { BOX_SPIN_MS, type Reel } from '../shared/game/box'
import { Button, cx, Modal, RARITY_COLOR, RarityChip, ShopImage } from '../ui'

const CARD = 104
const GAP = 8
const STEP = CARD + GAP
/** Fast off the mark, then the long, cruel crawl onto the marker. */
const EASE = 'cubic-bezier(0.12, 0.72, 0.1, 1)'
const REDUCED_MS = 1200

export function CaseOpening({
  reel,
  winner,
  landed,
  onLanded,
  onClose,
  again,
}: {
  reel: Reel<BoxPrizeRow>
  winner: BoxPrizeRow
  landed: boolean
  onLanded: () => void
  onClose: () => void
  /** "En till": absent when the guest cannot afford another or the box is empty. */
  again?: { label: string; busy: boolean; onClick: () => void }
}) {
  return (
    <Modal
      open
      onClose={onClose}
      dismissible={landed}
      tone="sleaze"
      title={landed ? BUTIK.boxWonTitle : BUTIK.boxSpinning}
      className="w-[min(40rem,calc(100vw-1rem))]"
      actions={
        landed ? (
          <>
            {again && (
              <Button variant="ghost" loading={again.busy} onClick={again.onClick}>
                {again.label}
              </Button>
            )}
            <Button onClick={onClose}>{BUTIK.close}</Button>
          </>
        ) : undefined
      }
    >
      <Strip reel={reel} landed={landed} onLanded={onLanded} />
      {landed && <Reveal prize={winner} />}
    </Modal>
  )
}

function Strip({ reel, landed, onLanded }: { reel: Reel<BoxPrizeRow>; landed: boolean; onLanded: () => void }) {
  const viewport = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ x: number; ms: number } | null>(null)
  const done = useRef(false)
  const finish = () => {
    if (done.current) return
    done.current = true
    onLanded()
  }
  const finishLate = useEffectEvent(finish)

  // Park the strip with a few cards showing, then on the next frame send it to the winner. The
  // winner's centre plus the landing offset ends under the marker, which sits mid-viewport.
  useLayoutEffect(() => {
    const width = viewport.current?.clientWidth ?? 360
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const ms = reduced ? REDUCED_MS : BOX_SPIN_MS
    setPos({ x: width / 2 - 2.5 * STEP, ms: 0 })
    let raf = requestAnimationFrame(() => {
      raf = requestAnimationFrame(() => setPos({ x: width / 2 - (reel.stop * STEP + reel.offset * CARD), ms }))
    })
    // transitionend can go missing (a backgrounded tab); the reveal must not.
    const fallback = window.setTimeout(finishLate, ms + 400)
    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(fallback)
    }
  }, [reel])

  return (
    <div
      ref={viewport}
      className="relative -mx-5 h-44 overflow-hidden bg-night-deep ring-1 ring-white/10 ring-inset"
    >
      <div
        className="absolute top-4 left-0 flex will-change-transform"
        style={{
          gap: GAP,
          transform: `translateX(${pos?.x ?? 0}px)`,
          transition: pos?.ms ? `transform ${pos.ms}ms ${EASE}` : 'none',
        }}
        onTransitionEnd={(e) => {
          if (e.target === e.currentTarget && e.propertyName === 'transform') finish()
        }}
      >
        {reel.cards.map((prize, i) => (
          <Card key={i} prize={prize} win={landed && i === reel.stop} dim={landed && i !== reel.stop} />
        ))}
      </div>
      {/* Edge fades and the marker. */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-night-deep to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-night-deep to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 left-1/2 w-1 -translate-x-1/2 rounded-full bg-plate shadow-[0_0_0.8rem] shadow-plate" />
    </div>
  )
}

function Card({ prize, win, dim }: { prize: BoxPrizeRow; win: boolean; dim: boolean }) {
  const color = RARITY_COLOR[prize.rarity]
  return (
    <div
      className={cx(
        'flex h-36 shrink-0 flex-col overflow-hidden rounded-lg bg-night ring-1 ring-white/10 transition-[opacity,transform,box-shadow] duration-500',
        win && 'z-10 scale-110',
        dim && 'opacity-35',
      )}
      style={{
        width: CARD,
        background: `linear-gradient(to top, ${color}55, transparent 70%)`,
        boxShadow: win ? `0 0 1.6rem ${color}, inset 0 0 0 2px ${color}` : undefined,
      }}
    >
      <ShopImage image={prize.image} name={prize.name} rarity={prize.rarity} className="h-24 w-full" />
      <span className="line-clamp-2 flex-1 px-1.5 pt-1 text-[0.7rem] leading-tight font-bold">{prize.name}</span>
      <span className="h-1.5 shrink-0" style={{ backgroundColor: color }} />
    </div>
  )
}

function Reveal({ prize }: { prize: BoxPrizeRow }) {
  const color = RARITY_COLOR[prize.rarity]
  return (
    <div className="flex animate-pop-in flex-col items-center gap-3 pt-5 text-center">
      <div className="rounded-2xl p-1" style={{ boxShadow: `0 0 3rem ${color}`, backgroundColor: color }}>
        <ShopImage image={prize.image} name={prize.name} rarity={prize.rarity} className="size-40 rounded-xl" />
      </div>
      <RarityChip rarity={prize.rarity} className="text-xs" />
      <p className="font-display text-4xl leading-none font-black text-plate uppercase">{prize.name}</p>
      {prize.blurb && <p className="text-lg">{prize.blurb}</p>}
      <p className="text-ink-dim">{BUTIK.boxWonText}</p>
    </div>
  )
}
