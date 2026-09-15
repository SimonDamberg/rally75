// Big-win celebration over the result reveal: yellow RM plates rain down, and the phone buzzes where
// the browser allows it (Android; iOS Safari has no vibration API).
import { useEffect, useState, type CSSProperties } from 'react'

interface Coin {
  left: number
  delay: number
  duration: number
  size: number
  spin: number
}

function makeCoins(count: number, spread: number): Coin[] {
  return Array.from({ length: count }, () => ({
    left: Math.random() * 100,
    delay: 0.3 + Math.random() * spread,
    duration: 1.8 + Math.random() * 1.6,
    size: 1.6 + Math.random() * 1.6,
    spin: (Math.random() < 0.5 ? -1 : 1) * (360 + Math.random() * 720),
  }))
}

export function CoinBurst({ big }: { big: boolean }) {
  const [coins] = useState(() => (big ? makeCoins(48, 3.5) : makeCoins(22, 2.2)))

  useEffect(() => {
    if ('vibrate' in navigator) navigator.vibrate(big ? [120, 60, 120, 60, 320] : [80, 40, 160])
  }, [big])

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-10 overflow-hidden">
      {coins.map((c, i) => (
        <span
          key={i}
          className="absolute -top-16 grid animate-coin-fall place-items-center rounded-md bg-plate font-display leading-none font-black text-night shadow-[0.15rem_0.15rem_0_var(--color-sleaze)]"
          style={
            {
              left: `${c.left}%`,
              width: `${c.size}rem`,
              height: `${c.size * 0.75}rem`,
              fontSize: `${c.size * 0.42}rem`,
              animationDelay: `${c.delay}s`,
              animationDuration: `${c.duration}s`,
              '--coin-spin': `${c.spin}deg`,
            } as CSSProperties
          }
        >
          RM
        </span>
      ))}
    </div>
  )
}
