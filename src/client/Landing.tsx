// First screen for a phone with no account: an overhyped casino homepage in front of the sign-up.
// Every call to action leads to the same place (onStart, the connect + KYC flow), which is the joke.
// Nothing here writes anything; the live bits are the real "Utbetalt idag" and invented wins.
import { useEffect, useState } from 'react'
import { LANDING, OFFER_UI, STODLINJE, type LandingProduct } from '../shared/content/parody'
import { WELCOME_BONUS } from '../shared/game/economy'
import { fmtRm } from '../shared/game/format'
import { createRng, randomSeed } from '../shared/game/rng'
import { BonusBar, Button, cx, Logo, MrGreenLogo, SmallPrint, StodlinjeNote } from '../ui'
import { CountUp } from './CountUp'
import { countdown, EXTENDED_MS, fmtClock } from './offers'
import { fakeWinText } from './proof'
import { SocialStrip } from './SocialStrip'

const rng = createRng(randomSeed())
const TICKER_SIZE = 4
const TICKER_MS = 3200

const SECTION_TITLE = 'font-display text-3xl leading-none font-black text-ink uppercase'

export function Landing({ hasKupong, onStart }: { hasKupong: boolean; onStart: () => void }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <BonusBar />
      <header className="sticky top-0 z-20 bg-night/95 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center justify-between gap-3 px-4 py-2.5">
          <MrGreenLogo variant="lockup" size="sm" />
          <button
            type="button"
            onClick={onStart}
            className="min-h-10 rounded-full px-4 text-sm font-bold text-ink ring-2 ring-tote-hi/70 ring-inset active:bg-tote"
          >
            {LANDING.login}
          </button>
        </div>
        <SocialStrip />
      </header>

      <main className="mx-auto flex w-full max-w-md flex-col gap-12 px-4 pt-5 pb-6">
        {hasKupong && <KupongBanner onStart={onStart} />}
        <Hero onStart={onStart} />
        <WinTicker />
        <Shelf onStart={onStart} />
        <Steps />
        <Reviews />
        <Seals />
        <Faq />
        <FinalCta onStart={onStart} />
      </main>

      <footer className="mx-auto w-full max-w-md">
        <SmallPrint />
        <p className="px-4 pb-10 text-justify text-[0.55rem] leading-tight text-ink-dim/50">{LANDING.finePrint}</p>
      </footer>
    </div>
  )
}

function KupongBanner({ onStart }: { onStart: () => void }) {
  return (
    <button
      type="button"
      onClick={onStart}
      className="flex animate-pop-in items-center gap-3 rounded-2xl bg-sleaze p-4 text-left text-sleaze-ink shadow-[0_0_2rem] shadow-sleaze/40"
    >
      <span aria-hidden className="text-3xl">
        🎟️
      </span>
      <span className="flex flex-col">
        <span className="font-display text-xl leading-tight font-black uppercase">{LANDING.kupong.title}</span>
        <span className="text-sm">{LANDING.kupong.text}</span>
      </span>
    </button>
  )
}

/** The jackpot sign: the bonus rolls up inside a frame of chasing bulbs, under a countdown that never ends. */
function Hero({ onStart }: { onStart: () => void }) {
  return (
    <section className="flex flex-col items-center gap-5 text-center">
      <MrGreenLogo variant="full" size="md" />
      <p className="text-xs font-bold tracking-[0.2em] text-sleaze uppercase">{LANDING.hero.kicker}</p>
      <div className="bulbs w-full rounded-3xl bg-night-deep px-4 pt-7 pb-6 ring-2 ring-plate/60 ring-inset">
        <CountUp
          to={WELCOME_BONUS}
          ms={1800}
          format={fmtRm}
          className="block font-display text-7xl leading-none font-black whitespace-nowrap text-plate tabular-nums drop-shadow-[0_0_1.2rem_rgb(255_214_10/0.35)]"
        />
        <p className="mt-2 font-display text-2xl leading-none font-extrabold tracking-wide text-ink uppercase">
          {LANDING.hero.headline}
        </p>
      </div>
      <p className="max-w-xs text-lg text-ink-dim">{LANDING.hero.sub}</p>
      <Button size="lg" block onClick={onStart}>
        {LANDING.hero.cta}
      </Button>
      <OfferClock />
      <p className="text-[0.65rem] text-ink-dim/60">{LANDING.hero.footnote}</p>
    </section>
  )
}

/** The offers' restarting countdown, started when the page opened. */
function OfferClock() {
  const [seed] = useState(randomSeed)
  const [openedAt] = useState(() => Date.now())
  const [now, setNow] = useState(openedAt)

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(id)
  }, [])

  const c = countdown(now - openedAt, seed)
  const extended = c.cycle > 0 && c.msIntoCycle < EXTENDED_MS
  return (
    <p className="flex items-baseline gap-2 text-sm font-semibold">
      <span className={extended ? 'animate-pulse-live text-cash' : 'text-ink-dim'}>
        {extended ? OFFER_UI.extended : OFFER_UI.expires}
      </span>
      <span className="font-display text-2xl leading-none font-black text-drift tabular-nums">{fmtClock(c.seconds)}</span>
    </p>
  )
}

interface Win {
  id: number
  text: string
}

/** Invented wins, a new one on top every few seconds. */
function WinTicker() {
  const [wins, setWins] = useState<Win[]>(() =>
    // Newest first, so ids count down the list and the next one is the top id plus one.
    Array.from({ length: TICKER_SIZE }, (_, i) => ({ id: TICKER_SIZE - 1 - i, text: fakeWinText(rng) })),
  )

  useEffect(() => {
    const id = setInterval(() => {
      setWins((w) => [{ id: w[0].id + 1, text: fakeWinText(rng) }, ...w.slice(0, TICKER_SIZE - 1)])
    }, TICKER_MS)
    return () => clearInterval(id)
  }, [])

  return (
    <section className="flex flex-col gap-3">
      <h2 className="flex items-center gap-2 text-xs font-bold tracking-[0.16em] text-ink-dim uppercase">
        <span className="size-2 animate-pulse-live rounded-full bg-drift" />
        {LANDING.ticker}
      </h2>
      <ul className="flex flex-col divide-y divide-white/10 overflow-hidden rounded-2xl bg-night-deep/70 ring-1 ring-white/10">
        {wins.map((w, i) => (
          <li
            key={w.id}
            className={cx('flex items-center gap-3 px-4 py-2.5 text-sm', i === 0 && 'animate-pop-in bg-cash/10')}
          >
            <span aria-hidden className="text-cash">
              ▲
            </span>
            <span className={i === 0 ? 'font-semibold text-ink' : 'text-ink-dim'}>{w.text}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

/** Each product in its own brand scope: the blue Rally75 inset, the violet Plånko one, the green site. */
const PRODUCT_THEME: Record<LandingProduct['id'], string> = {
  rally: 'theme-rally75',
  plinko: 'theme-plinko',
  butik: '',
}

function Shelf({ onStart }: { onStart: () => void }) {
  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className={SECTION_TITLE}>{LANDING.shelf.title}</h2>
        <p className="mt-1 text-ink-dim">{LANDING.shelf.sub}</p>
      </div>
      {LANDING.products.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={onStart}
          className={cx(
            PRODUCT_THEME[p.id],
            'flex flex-col gap-3 rounded-2xl bg-night p-4 text-left text-ink ring-2 ring-tote-hi/50 ring-inset active:scale-[0.99]',
          )}
        >
          <span className="flex items-center justify-between gap-3">
            {p.id === 'rally' ? (
              <Logo size="sm" />
            ) : (
              <span className="font-display text-3xl leading-none font-black text-sleaze uppercase">{p.title}</span>
            )}
            <span className="rounded-full bg-tote px-2.5 py-1 text-[0.65rem] font-bold tracking-wider text-ink-dim uppercase">
              {p.kicker}
            </span>
          </span>
          <span className="text-sm text-ink-dim">{p.text}</span>
          <span className="flex items-end justify-between gap-3">
            <span className="flex gap-5">
              {p.stats.map(([label, value]) => (
                <span key={label} className="flex flex-col">
                  <span className="text-[0.6rem] font-bold tracking-[0.14em] text-ink-dim/80 uppercase">{label}</span>
                  <span className="font-semibold">{value}</span>
                </span>
              ))}
            </span>
            <span className="rounded-xl bg-plate px-4 py-2 font-display text-lg leading-none font-extrabold text-night uppercase">
              {LANDING.shelf.cta}
            </span>
          </span>
        </button>
      ))}
    </section>
  )
}

function Steps() {
  return (
    <section className="flex flex-col gap-4">
      <h2 className={SECTION_TITLE}>{LANDING.steps.title}</h2>
      <ol className="flex flex-col gap-3">
        {LANDING.steps.items.map(([title, text], i) => (
          <li key={title} className="flex items-start gap-4">
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-plate font-display text-2xl font-black text-night">
              {i + 1}
            </span>
            <span className="flex flex-col pt-1">
              <span className="text-lg font-bold">{title}</span>
              <span className="text-sm text-ink-dim">{text}</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  )
}

function Reviews() {
  return (
    <section className="flex flex-col gap-4">
      <h2 className={SECTION_TITLE}>{LANDING.reviews.title}</h2>
      <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none]">
        {LANDING.reviews.items.map((r) => (
          <figure key={r.who} className="flex w-[78%] shrink-0 snap-center flex-col gap-3 rounded-2xl bg-tote/40 p-4 ring-1 ring-white/10 ring-inset">
            <span aria-hidden className="tracking-[0.2em] text-plate">
              ★★★★★
            </span>
            <blockquote className="text-base leading-snug">{r.text}</blockquote>
            <figcaption className="mt-auto text-sm font-semibold text-ink-dim">{r.who}</figcaption>
          </figure>
        ))}
      </div>
    </section>
  )
}

/** Trust seals, drawn in CSS: a dashed ring stamp with a label and a verdict. */
function Seals() {
  return (
    <section className="flex flex-wrap justify-center gap-2">
      {LANDING.badges.map(([label, value]) => (
        <span
          key={label}
          className="grid size-16 -rotate-6 place-items-center rounded-full border-2 border-dashed border-sleaze/70 text-center even:rotate-6"
        >
          <span className="flex flex-col leading-tight">
            <span className="text-[0.45rem] font-bold tracking-[0.06em] text-ink-dim uppercase">{label}</span>
            <span className="font-display text-base font-black text-sleaze uppercase">{value}</span>
          </span>
        </span>
      ))}
    </section>
  )
}

function Faq() {
  return (
    <section className="flex flex-col gap-4">
      <h2 className={SECTION_TITLE}>{LANDING.faq.title}</h2>
      <div className="flex flex-col divide-y divide-white/10 rounded-2xl bg-night-deep/70 ring-1 ring-white/10">
        {LANDING.faq.items.map((f) => (
          <details key={f.q} className="group px-4">
            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 py-3 font-semibold [&::-webkit-details-marker]:hidden">
              {f.q}
              <span aria-hidden className="text-2xl leading-none text-sleaze transition-transform group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="pb-4 text-ink-dim">{f.a}</p>
          </details>
        ))}
      </div>
      <StodlinjeNote lead={STODLINJE.lead.landing} className="text-center text-xs" />
    </section>
  )
}

function FinalCta({ onStart }: { onStart: () => void }) {
  return (
    <section className="bulbs flex flex-col items-center gap-3 rounded-3xl bg-night-deep px-5 py-8 text-center ring-2 ring-plate/60 ring-inset">
      <h2 className="font-display text-4xl leading-none font-black text-plate uppercase">{LANDING.final.title}</h2>
      <p className="text-ink-dim">{LANDING.final.text}</p>
      <Button size="lg" block onClick={onStart} className="mt-2">
        {LANDING.final.cta}
      </Button>
    </section>
  )
}
