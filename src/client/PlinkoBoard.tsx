// The Plånko board: pegs, the thirteen multiplier slots and the balls in flight. Every ball already
// knows its path (the server drew it), so the fall is a scripted Web Animation through the peg tops
// from ballPoints(). Several balls can fall at once; each reports back when it lands.
import { useEffect, useEffectEvent, useRef } from 'react'
import type { PlinkoDropRow } from '../lib/types'
import { fmtMult, PLINKO_BIG_M10, PLINKO_FALL_MS, PLINKO_M10, PLINKO_ROWS } from '../shared/game/plinko'
import { cx } from '../ui'
import { ballPoints, DROP_Y, pegsInRow, PEG_DX, SLOT_Y, slotX } from './drop'

const HOP = 7
const PLATE_W = PEG_DX - 3
const PLATE_H = 20
const HALF_W = ((PLINKO_ROWS + 3) * PEG_DX) / 2

export interface PlinkoBoardProps {
  falling: readonly PlinkoDropRow[]
  onLand: (drop: PlinkoDropRow) => void
  /** Slot that just caught a ball, and a counter so the same slot can flash twice in a row. */
  flash: { slot: number; n: number } | null
}

export function PlinkoBoard({ falling, onLand, flash }: PlinkoBoardProps) {
  return (
    <svg
      viewBox={`${-HALF_W} ${DROP_Y - 12} ${HALF_W * 2} ${SLOT_Y - DROP_Y + 26}`}
      className="mx-auto block w-full max-w-[17rem] touch-manipulation select-none"
      role="img"
      aria-label="Plånko"
    >
      {Array.from({ length: PLINKO_ROWS }, (_, r) =>
        pegsInRow(r).map((p) => (
          <circle key={`${r}:${p.x}`} cx={p.x} cy={p.y} r={2.6} className="fill-sleaze/80" />
        )),
      )}

      {PLINKO_M10.map((m10, k) => (
        <g
          key={flash?.slot === k ? `hit${flash.n}` : k}
          className={cx(flash?.slot === k && 'animate-odds-flash')}
          style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
        >
          <rect
            x={slotX(k) - PLATE_W / 2}
            y={SLOT_Y - PLATE_H / 2}
            width={PLATE_W}
            height={PLATE_H}
            rx={3}
            className={cx(
              m10 >= PLINKO_BIG_M10 ? 'fill-plate' : m10 >= 10 ? 'fill-sleaze' : 'fill-tote',
            )}
          />
          <text
            x={slotX(k)}
            y={SLOT_Y + 3.5}
            textAnchor="middle"
            className={cx(
              'font-display text-[9.5px] font-black',
              m10 >= PLINKO_BIG_M10 ? 'fill-night' : m10 >= 10 ? 'fill-sleaze-ink' : 'fill-ink-dim',
            )}
          >
            {fmtMult(m10)}
          </text>
        </g>
      ))}

      {falling.map((d) => (
        <Ball key={d.id} drop={d} onLand={onLand} />
      ))}
    </svg>
  )
}

function Ball({ drop, onLand }: { drop: PlinkoDropRow; onLand: (drop: PlinkoDropRow) => void }) {
  const ref = useRef<SVGGElement>(null)
  const land = useEffectEvent(() => onLand(drop))

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const points = ballPoints(drop.path)
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const at = (p: { x: number; y: number }) => ({ transform: `translate(${p.x}px, ${p.y}px)` })
    let frames: Keyframe[]
    if (reduced) {
      frames = [at(points.at(-1)!), at(points.at(-1)!)]
    } else {
      // Peg to peg with a little hop in between. A keyframe's easing covers the segment after it:
      // slowing up into the hop (ease-out), then gravity down onto the next peg (ease-in).
      frames = [{ ...at(points[0]), easing: 'ease-in' }]
      for (let i = 1; i < points.length; i++) {
        const a = points[i - 1]
        const b = points[i]
        if (i > 1) frames.push({ ...at({ x: (a.x + b.x) / 2, y: a.y - HOP }), easing: 'ease-in' })
        frames.push({ ...at(b), easing: 'ease-out' })
      }
    }
    const anim = el.animate(frames, {
      duration: reduced ? 250 : PLINKO_FALL_MS,
      fill: 'forwards',
    })
    let live = true
    anim.finished.then(
      () => live && land(),
      () => {},
    )
    return () => {
      live = false
      anim.cancel()
    }
  }, [drop.path])

  return (
    <g ref={ref} style={{ transform: `translate(0px, ${DROP_Y}px)` }}>
      <circle r={6} className="fill-plate stroke-plate-shade" strokeWidth={1.2} />
      <circle r={2} cx={-1.8} cy={-1.8} className="fill-white/70" />
    </g>
  )
}
