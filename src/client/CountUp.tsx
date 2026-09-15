import { useEffect, useRef } from 'react'

/** Rolls a number up from `from` to `to` (ease out). Writes the DOM directly, no re-renders. */
export function CountUp({
  to,
  from = 0,
  ms = 1400,
  format,
  className,
}: {
  to: number
  from?: number
  ms?: number
  format: (n: number) => string
  className?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.textContent = format(to)
      return
    }
    const start = performance.now()
    let raf = 0
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / ms)
      const eased = 1 - (1 - t) ** 3
      el.textContent = format(Math.round(from + (to - from) * eased))
      if (t < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [to, from, ms, format])

  return (
    <span ref={ref} className={className}>
      {format(from)}
    </span>
  )
}
