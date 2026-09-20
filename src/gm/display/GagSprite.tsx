// The slapstick on the race screen: props around a horse's badge while a gag runs, plus the sticker
// that names it. Everything is sized in em of the badge, so it follows the badge size.
import { GM_RACE } from '../../shared/content/gm'
import type { GagKind } from '../../shared/game/types'

const SPRITE = 'pointer-events-none absolute leading-none select-none'

/**
 * Props drawn around the badge. The badge's own motion (flip, spin, glitch) is set by the caller.
 * `toward` is where the partner lane is, for the two-horse kommitte gag.
 */
export function GagProps({ kind, toward }: { kind: GagKind; toward?: 'up' | 'down' }) {
  switch (kind) {
    case 'galopp':
      return <span className={`${SPRITE} top-[0.15em] -right-[0.4em] text-[0.45em]`}>💥</span>
    case 'backwards':
      return <span className={`${SPRITE} -top-[0.4em] left-1/2 -translate-x-1/2 text-[0.45em]`}>❓</span>
    case 'selfie':
      return (
        <>
          <span className={`${SPRITE} top-[0.1em] -right-[0.45em] text-[0.45em]`}>🤳</span>
          <span className={`${SPRITE} inset-[-0.2em] animate-blink rounded-full bg-white/80 blur-md`} />
        </>
      )
    case 'turbo':
      return (
        <>
          <Streaks />
          <span className={`${SPRITE} top-[0.25em] -left-[0.5em] -scale-x-100 text-[0.5em]`}>🔥</span>
        </>
      )
    case 'nap':
      return <Rising glyph="💤" />
    case 'banana':
      return <span className={`${SPRITE} -bottom-[0.1em] -left-[0.2em] rotate-[-30deg] text-[0.45em]`}>🍌</span>
    case 'snabblan':
      return <Rising glyph="💸" />
    case 'husvagn':
      return (
        <>
          <Streaks />
          <span className={`${SPRITE} top-[0.2em] -left-[1.15em] animate-rock text-[0.6em]`}>🚐</span>
        </>
      )
    case 'kommitte':
      return (
        <>
          <Rising glyph="❤️" />
          <span
            className={`${SPRITE} -right-[0.3em] text-[0.4em] ${toward === 'up' ? '-top-[0.2em]' : '-bottom-[0.2em]'}`}
          >
            💋
          </span>
        </>
      )
    case 'serverkrasch':
      return (
        <>
          <span className={`${SPRITE} top-[0.3em] -right-[0.45em] animate-blink text-[0.42em]`}>⚠️</span>
          <span
            className={`${SPRITE} bottom-[0.05em] -left-[0.5em] rounded-[0.1em] bg-black px-[0.12em] font-mono text-[0.26em] font-black text-drift`}
          >
            {GM_RACE.notFound}
          </span>
        </>
      )
    case 'fatbyte':
      return (
        <>
          <span className={`${SPRITE} top-[0.3em] -right-[0.5em] text-[0.48em]`}>🛢️</span>
          <Rising glyph="🍺" />
        </>
      )
    case 'eckero':
      return (
        <>
          <span className={`${SPRITE} top-[0.1em] -left-[1.1em] animate-rock text-[0.6em]`}>⛴️</span>
          <span className={`${SPRITE} -right-[0.25em] -bottom-[0.05em] text-[0.4em]`}>🧳</span>
        </>
      )
    case 'rallyhafte':
      return (
        <>
          <span className={`${SPRITE} top-[0.3em] -right-[0.45em] animate-rock text-[0.45em]`}>📖</span>
          <span className={`${SPRITE} -top-[0.4em] left-1/2 -translate-x-1/2 text-[0.45em]`}>❓</span>
        </>
      )
    case 'hjalprebus':
      return (
        <>
          <span className={`${SPRITE} top-[0.3em] -right-[0.45em] animate-rock text-[0.45em]`}>✉️</span>
          <span className={`${SPRITE} -top-[0.35em] left-1/2 -translate-x-1/2 animate-blink text-[0.42em]`}>💡</span>
          <span
            className={`${SPRITE} bottom-[0.1em] -left-[0.6em] rounded-[0.1em] bg-drift px-[0.12em] font-display text-[0.24em] font-black text-white`}
          >
            {GM_RACE.penalty}
          </span>
        </>
      )
    case 'frossa':
      return (
        <>
          <span className={`${SPRITE} top-[0.3em] -right-[0.45em] text-[0.45em]`}>🥶</span>
          <Rising glyph="❄️" />
        </>
      )
    case 'vaniljsas':
      return (
        <>
          <span className={`${SPRITE} top-[0.3em] -right-[0.5em] animate-rock text-[0.48em]`}>🥛</span>
          <span className={`${SPRITE} -top-[0.4em] left-1/2 -translate-x-1/2 text-[0.45em]`}>🤢</span>
        </>
      )
    case 'sankaskepp':
      return (
        <>
          <span className={`${SPRITE} top-[0.25em] -right-[0.45em] animate-rock text-[0.45em]`}>🚢</span>
          <span
            className={`${SPRITE} bottom-[0.05em] -left-[0.5em] rounded-[0.1em] bg-black px-[0.12em] font-mono text-[0.26em] font-black text-ink-dim`}
          >
            {GM_RACE.miss}
          </span>
        </>
      )
    case 'olvisvep':
      return (
        <>
          <Streaks />
          <span className={`${SPRITE} top-[0.25em] -left-[0.55em] text-[0.5em]`}>🍺</span>
        </>
      )
    case 'goblin':
      return (
        <>
          <Streaks />
          <span className={`${SPRITE} top-[0.2em] -right-[0.45em] text-[0.48em]`}>👺</span>
        </>
      )
  }
}

/** Speed lines trailing a horse that has suddenly found another gear. */
function Streaks() {
  return (
    <>
      {['top-[0.25em]', 'top-[0.5em]', 'top-[0.72em]'].map((top, i) => (
        <span
          key={top}
          className={`${SPRITE} ${top} right-[85%] h-1.5 w-[1.8em] animate-rail rounded-full bg-[repeating-linear-gradient(90deg,rgb(255_255_255/0.8)_0_40px,transparent_40px_60px)] [mask-image:linear-gradient(90deg,transparent,black)]`}
          style={{ animationDuration: `${0.25 + i * 0.07}s` }}
        />
      ))}
    </>
  )
}

/** Three copies of a glyph drifting up off the badge, one after the other. */
function Rising({ glyph }: { glyph: string }) {
  return (
    <>
      {[0, 0.37, 0.74].map((delay, i) => (
        <span
          key={delay}
          className={`${SPRITE} top-0 animate-float-up text-[0.35em]`}
          style={{ left: `${0.6 + i * 0.35}em`, animationDelay: `${delay}s` }}
        >
          {glyph}
        </span>
      ))}
    </>
  )
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
