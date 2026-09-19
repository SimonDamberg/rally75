// The slapstick on the race screen: props around a horse's badge while a gag runs, plus the sticker
// that names it. Everything is sized in em of the badge, so it follows the badge size.
import { GM_RACE } from '../../shared/content/gm'
import type { GagKind } from '../../shared/game/types'

const SPRITE = 'pointer-events-none absolute leading-none select-none'

/** Props drawn around the badge. The badge's own motion (flip, munch, rock) is set by the caller. */
export function GagProps({ kind }: { kind: GagKind }) {
  switch (kind) {
    case 'galopp':
      return <span className={`${SPRITE} top-[0.15em] -right-[0.4em] text-[0.45em]`}>💥</span>
    case 'backwards':
      return <span className={`${SPRITE} -top-[0.4em] left-1/2 -translate-x-1/2 text-[0.45em]`}>❓</span>
    case 'graze':
      return <span className={`${SPRITE} -right-[0.3em] -bottom-[0.12em] text-[0.5em]`}>🌱</span>
    case 'wave':
      return <span className={`${SPRITE} -top-[0.25em] -right-[0.3em] origin-bottom animate-wave text-[0.45em]`}>👋</span>
    case 'selfie':
      return (
        <>
          <span className={`${SPRITE} top-[0.1em] -right-[0.45em] text-[0.45em]`}>🤳</span>
          <span className={`${SPRITE} inset-[-0.2em] animate-blink rounded-full bg-white/80 blur-md`} />
        </>
      )
    case 'seagull':
      return (
        <span className={`${SPRITE} top-[0.05em] -left-[0.35em] text-[0.5em]`}>
          <span className="block animate-gull">🐦</span>
        </span>
      )
    case 'turbo':
      return (
        <>
          {['top-[0.25em]', 'top-[0.5em]', 'top-[0.72em]'].map((top, i) => (
            <span
              key={top}
              className={`${SPRITE} ${top} right-[85%] h-1.5 w-[1.8em] animate-rail rounded-full bg-[repeating-linear-gradient(90deg,rgb(255_255_255/0.8)_0_40px,transparent_40px_60px)] [mask-image:linear-gradient(90deg,transparent,black)]`}
              style={{ animationDuration: `${0.25 + i * 0.07}s` }}
            />
          ))}
          <span className={`${SPRITE} top-[0.25em] -left-[0.5em] -scale-x-100 text-[0.5em]`}>🔥</span>
        </>
      )
  }
}

/** The tilted sticker above the horse that says what is going on. */
export function GagSticker({ kind }: { kind: GagKind }) {
  return (
    <span
      className={`${SPRITE} bottom-[92%] left-1/2 z-20 -translate-x-1/2 animate-stamp rounded-lg bg-sleaze px-3 py-0.5 font-display text-tv-sm font-black whitespace-nowrap text-sleaze-ink uppercase shadow-[0.2rem_0.2rem_0_rgb(0_0_0/0.5)]`}
    >
      {GM_RACE.gag[kind]}
    </span>
  )
}
