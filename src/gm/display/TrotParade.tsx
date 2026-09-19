// Idle track at the bottom of the attract screen: the camera follows the field, so the rail
// scrolls while the plates swap places. Positions are written straight to the DOM each frame.
import { useEffect, useRef, useState } from 'react'
import { KUSK_PHOTOS } from '../../shared/content/kuskar'
import { SILKS } from '../../shared/content/race'
import { FIELD_SIZE } from '../../shared/game/field'
import { HorseBadge } from '../../ui'

// A different handful of the stable's faces on every page load.
const FACES = Object.keys(KUSK_PHOTOS).sort(() => Math.random() - 0.5)

const HORSES = Array.from({ length: FIELD_SIZE }, (_, i) => ({
  n: i + 1,
  silk: SILKS[i % SILKS.length],
  jockey: FACES[i % FACES.length],
  // Two slow waves per horse with different periods: lead changes without anyone running away.
  w1: 0.17 + i * 0.041,
  p1: i * 1.9,
  w2: 0.47 - i * 0.063,
  p2: i * 2.7,
}))

const LANE = 'h-[min(4.25rem,8dvh)]'
const BREAK_DRAG = -14
const BREAK_MS = 1700

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

export function TrotParade() {
  const refs = useRef<(HTMLDivElement | null)[]>([])
  const [leader, setLeader] = useState(1)
  const [broke, setBroke] = useState<number | null>(null)
  const brokeRef = useRef<number | null>(null)

  useEffect(() => {
    if (reducedMotion()) return
    const drag = HORSES.map(() => 0)
    let frame = 0
    let lastLeader = 0
    const start = performance.now()
    const tick = (now: number) => {
      const t = (now - start) / 1000
      let best = -Infinity
      let lead = 1
      HORSES.forEach((h, i) => {
        drag[i] += ((brokeRef.current === h.n ? BREAK_DRAG : 0) - drag[i]) * 0.04
        const x = 48 + 20 * Math.sin(h.w1 * t + h.p1) + 8 * Math.sin(h.w2 * t + h.p2) + drag[i]
        const el = refs.current[i]
        if (el) el.style.transform = `translateX(${x}%)`
        if (x > best) {
          best = x
          lead = h.n
        }
      })
      if (lead !== lastLeader) setLeader((lastLeader = lead))
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)

    // Now and then someone breaks into a galopp and drops back.
    let breakTimer: ReturnType<typeof setTimeout>
    const scheduleBreak = () => {
      breakTimer = setTimeout(() => {
        const n = 1 + Math.floor(Math.random() * HORSES.length)
        brokeRef.current = n
        setBroke(n)
        breakTimer = setTimeout(() => {
          brokeRef.current = null
          setBroke(null)
          scheduleBreak()
        }, BREAK_MS)
      }, 5000 + Math.random() * 6000)
    }
    scheduleBreak()

    return () => {
      cancelAnimationFrame(frame)
      clearTimeout(breakTimer)
    }
  }, [])

  return (
    <div aria-hidden className="relative shrink-0 border-t-4 border-ink/80 bg-night-deep/80">
      <div className="h-4 animate-rail bg-[repeating-linear-gradient(90deg,var(--color-ink)_0_7px,transparent_7px_120px)] opacity-70" />
      {HORSES.map((h, i) => (
        <div key={h.n} className={`relative ${LANE} overflow-visible`}>
          <div className="absolute inset-x-0 bottom-0 h-0.5 animate-rail bg-[repeating-linear-gradient(90deg,rgb(255_255_255/0.14)_0_40px,transparent_40px_120px)]" />
          <div
            ref={(el) => {
              refs.current[i] = el
            }}
            className="absolute inset-y-0 left-0 w-full will-change-transform"
            style={{ transform: `translateX(${18 + i * 18}%)` }}
          >
            <span className="absolute top-1/2 left-0 flex -translate-x-full -translate-y-1/2 items-center pr-2">
              {/* Speed streak in the horse's colour */}
              <span
                className="mr-1 h-1.5 w-28 rounded-full opacity-60"
                style={{ background: `linear-gradient(90deg, transparent, ${h.silk.edge})` }}
              />
              <span className="block animate-trot" style={{ animationDelay: `${i * -0.13}s` }}>
                <HorseBadge horse={h} size="lg" lead={leader === h.n} broke={broke === h.n} />
              </span>
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}
