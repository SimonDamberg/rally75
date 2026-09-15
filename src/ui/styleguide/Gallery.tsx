// Dev-only component gallery, rendered inside the /styleguide frames (or open /styleguide/frame).
import { useMemo, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router'
import { buildRaceCard } from '../../shared/game/field'
import { computeOdds } from '../../shared/game/odds'
import { createRng } from '../../shared/game/rng'
import { fakeWinToast } from '../../shared/content/parody'
import { NAMED_KUSKAR } from '../../shared/content/kuskar'
import { fmtRm } from '../../shared/game/format'
import type { RaceStatus } from '../../shared/game/types'
import type { ConnectionStatus } from '../../lib/connection'
import {
  BonusBar,
  Button,
  ConnectionBadge,
  HorseRow,
  Logo,
  Modal,
  NightPaidNumber,
  OddsValue,
  RollingNumber,
  SilkBadge,
  SmallPrint,
  StatusBanner,
  toast,
  Toaster,
} from '..'

const SEED = 75
const STATUSES: RaceStatus[] = ['paddock', 'betting', 'closed', 'running', 'finished', 'void']
const CONNECTIONS: ConnectionStatus[] = ['connecting', 'online', 'offline']
const CHIPS = [10, 25, 50, 100, 250]

const PALETTE = [
  ['night', 'bg-night'],
  ['tote', 'bg-tote'],
  ['tote-hi', 'bg-tote-hi'],
  ['plate', 'bg-plate'],
  ['sleaze', 'bg-sleaze'],
  ['cash', 'bg-cash'],
  ['drift', 'bg-drift'],
  ['void', 'bg-void'],
  ['ink', 'bg-ink'],
  ['ink-dim', 'bg-ink-dim'],
] as const

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 border-t border-white/10 pt-6">
      <h2 className="font-display text-sm font-black tracking-[0.2em] text-ink-dim uppercase">{title}</h2>
      {children}
    </section>
  )
}

export default function Gallery() {
  const [params] = useSearchParams()
  const tv = params.get('device') === 'ipad'
  const size = tv ? 'tv' : 'md'

  const card = useMemo(() => buildRaceCard(NAMED_KUSKAR, createRng(SEED)), [])
  const [pools, setPools] = useState<number[]>(() => card.horses.map(() => 0))
  const odds = computeOdds(card.horses, pools)
  const [selected, setSelected] = useState<number | null>(2)
  const [status, setStatus] = useState(0)
  const [conn, setConn] = useState(2)
  const [modals, setModals] = useState(0)
  const [leader, setLeader] = useState(1)

  const fakeBet = (n?: number) => {
    const i = n !== undefined ? n - 1 : Math.floor(Math.random() * card.horses.length)
    const stake = CHIPS[Math.floor(Math.random() * CHIPS.length)]
    setPools((p) => p.map((v, j) => (j === i ? v + stake : v)))
  }

  return (
    <div className="min-h-dvh">
      <BonusBar />
      <header className="flex items-center gap-3 bg-night-deep/60 px-4 py-3">
        <Logo size={tv ? 'lg' : 'sm'} />
        <span className="flex-1" />
        <ConnectionBadge status={CONNECTIONS[conn]} size={size} />
      </header>
      <ConnectionBadge status={CONNECTIONS[conn]} variant="banner" size={size} />

      <main className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-6">
        <Section title="Logo">
          <div className="flex flex-wrap items-end gap-6">
            <Logo size="sm" />
            <Logo size="md" />
            <Logo size="lg" />
            {tv && <Logo size="tv" />}
          </div>
        </Section>

        <Section title="Palett och typografi">
          <div className="flex flex-wrap gap-2">
            {PALETTE.map(([name, bg]) => (
              <div key={name} className="flex flex-col items-center gap-1 text-xs text-ink-dim">
                <span className={`size-12 rounded-lg ring-1 ring-white/20 ${bg}`} />
                {name}
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-2">
            <p className="font-display text-tv-lg font-black uppercase">Spelstopp 3,77</p>
            <p className="text-xl font-extrabold [font-stretch:82%]">Åskans Hemförsäkring (Archivo smal)</p>
            <p className="max-w-prose text-base text-ink-dim">
              Brödtext i Archivo. Vinster betalas ut i handling, sällskap eller inget alls. Odds kan ändras utan
              förvarning.
            </p>
          </div>
        </Section>

        <Section title="Knappar">
          <div className="flex flex-wrap items-center gap-4">
            <Button size={tv ? 'tv' : 'md'}>Lägg spel</Button>
            <Button variant="sleaze" size={tv ? 'tv' : 'md'}>
              Hämta bonus
            </Button>
            <Button variant="ghost" size={tv ? 'tv' : 'md'}>
              Avbryt
            </Button>
            <Button variant="danger" size={tv ? 'tv' : 'md'}>
              Stryk loppet
            </Button>
            <Button loading size={tv ? 'tv' : 'md'}>
              Skickar
            </Button>
            <Button disabled size={tv ? 'tv' : 'md'}>
              Stängt
            </Button>
          </div>
          <Button size="lg" block>
            All in
          </Button>
        </Section>

        <Section title="Statusbanner">
          <StatusBanner status={STATUSES[status]} raceNo={3} size={size} />
          <div className="flex flex-wrap gap-3">
            <Button variant="ghost" onClick={() => setStatus((s) => (s + 1) % STATUSES.length)}>
              Nästa status
            </Button>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {STATUSES.map((s, i) => (
              <StatusBanner key={s} status={s} raceNo={i + 1} />
            ))}
          </div>
        </Section>

        <Section title="Odds och spel">
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => fakeBet()}>Lägg fejkspel</Button>
            <Button variant="ghost" disabled={selected === null} onClick={() => selected !== null && fakeBet(selected)}>
              Spela på vald häst
            </Button>
            <Button variant="ghost" onClick={() => setPools(card.horses.map(() => 0))}>
              Nollställ
            </Button>
          </div>
          <div className="flex flex-wrap items-end gap-6">
            <OddsValue value={odds[0]} size="sm" />
            <OddsValue value={odds[0]} size="md" label />
            <OddsValue value={odds[0]} size="lg" />
            {tv && <OddsValue value={odds[0]} size="tv" />}
          </div>
        </Section>

        <Section title={`Spellista (pick), ${fmtRm(pools.reduce((a, b) => a + b, 0))} insatt`}>
          <div className={tv ? 'grid grid-cols-2 gap-3' : 'flex flex-col gap-2'}>
            {card.horses.map((h, i) => (
              <HorseRow
                key={h.n}
                horse={h}
                odds={odds[i]}
                variant="pick"
                size={size}
                selected={selected === h.n}
                onSelect={(n) => setSelected((s) => (s === n ? null : n))}
              />
            ))}
          </div>
        </Section>

        <Section title="Loppkort (card)">
          <div className={tv ? 'grid grid-cols-2 gap-4' : 'flex flex-col gap-3'}>
            {card.horses.map((h, i) => (
              <HorseRow key={h.n} horse={h} odds={odds[i]} pool={pools[i]} size={size} />
            ))}
          </div>
        </Section>

        <Section title="Startnummer">
          <div className="flex flex-wrap items-center gap-4">
            {card.horses.map((h) => (
              <SilkBadge key={h.n} n={h.n} silk={h.silk} size={tv ? 'tv' : 'lg'} lead={h.n === leader} broke={h.n === 4} />
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <SilkBadge n={1} silk={card.horses[0].silk} size="sm" />
            <SilkBadge n={1} silk={card.horses[0].silk} size="md" />
            <Button variant="ghost" onClick={() => setLeader((l) => (l % card.horses.length) + 1)}>
              Byt ledare
            </Button>
          </div>
        </Section>

        <Section title="Toasts och pop-ups">
          <div className="flex flex-wrap gap-3">
            <Button variant="ghost" onClick={() => toast({ text: fakeWinToast('Bosse', 'Östhammar', fmtRm(31573)), tone: 'win' })}>
              Vinsttoast
            </Button>
            <Button variant="ghost" onClick={() => toast({ text: 'Kenneth #42 satsade 250 RM på Bålsta Blixten' })}>
              Infotoast
            </Button>
            <Button variant="ghost" onClick={() => toast({ text: 'Spelet är stängt för det här loppet.', tone: 'error' })}>
              Feltoast
            </Button>
            <Button variant="sleaze" onClick={() => setModals(1)}>
              Öppna pop-up
            </Button>
          </div>
        </Section>

        <Section title="Räkneverk och finstilt">
          <p className={tv ? 'font-display text-tv-md font-black text-plate' : 'font-display text-4xl font-black text-plate'}>
            <RollingNumber value={pools.reduce((a, b) => a + b, 0) * 137 + 4_750_000} />
          </p>
          <p className="font-display text-2xl font-black text-cash">
            <NightPaidNumber realPaid={0} /> RM
          </p>
          <SmallPrint />
        </Section>

        <Section title="Anslutning">
          <div className="flex flex-wrap items-center gap-3">
            {CONNECTIONS.map((c) => (
              <ConnectionBadge key={c} status={c} size={size} />
            ))}
            <Button variant="ghost" onClick={() => setConn((c) => (c + 1) % CONNECTIONS.length)}>
              Byt anslutning
            </Button>
          </div>
        </Section>
      </main>

      <Modal
        open={modals >= 1}
        onClose={() => setModals(0)}
        tone="sleaze"
        title="Bara idag: 500 gratissnurr"
        actions={
          <>
            <Button variant="ghost" onClick={() => setModals(0)}>
              Nej tack
            </Button>
            <Button variant="sleaze" onClick={() => setModals(2)}>
              Hämta nu
            </Button>
          </>
        }
      >
        Gäller spel som inte finns. Erbjudandet går ut om 00:59 och börjar sedan om.
      </Modal>
      <Modal
        open={modals >= 2}
        onClose={() => setModals(1)}
        title="Verifiera din identitet"
        dismissible={false}
        actions={<Button onClick={() => setModals(1)}>Jag intygar att detta stämmer</Button>}
      >
        Pop-up nummer två, staplad ovanpå. Den här går inte att klicka bort.
      </Modal>
      <Toaster />
    </div>
  )
}
