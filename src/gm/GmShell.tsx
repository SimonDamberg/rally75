// Picks what the iPad shows: the race screen while a race runs (and its result until dismissed),
// the attract screen between races, otherwise the control panel with tabs.
import { useMemo, useState } from 'react'
import { useActiveRace, useConnection, useKusks, useLeaderboard } from '../lib/hooks'
import type { PlayerRow } from '../lib/types'
import type { RaceStatus } from '../shared/game/types'
import { GM_TABS } from '../shared/content/gm'
import { Button, ConnectionBadge, cx, Logo } from '../ui'
import { Attract } from './Attract'
import { BetsTab } from './BetsTab'
import { useGmAuth } from './gmAuth'
import { KuskarTab } from './KuskarTab'
import { PlayersTab } from './PlayersTab'
import { RaceScreen } from './RaceScreen'
import { RaceTab } from './RaceTab'
import { useRaceControl } from './useRaceControl'

type Tab = 'race' | 'bets' | 'players' | 'kuskar'
const TABS: readonly Tab[] = ['race', 'bets', 'players', 'kuskar']
const PANEL_STATUSES: readonly RaceStatus[] = ['paddock', 'betting', 'closed']

export function GmShell() {
  const { logout } = useGmAuth()
  const connection = useConnection()
  const { data: race, reload: reloadRace } = useActiveRace()
  const { data: kusks, reload: reloadKusks } = useKusks()
  const { data: board, reload: reloadPlayers } = useLeaderboard()
  const control = useRaceControl(kusks, reloadRace)

  const [tab, setTab] = useState<Tab>('race')
  const [showAttract, setShowAttract] = useState(true)
  const [screenFor, setScreenFor] = useState<string | null>(null)
  const [seen, setSeen] = useState<string | null>(null)

  // React to race changes while rendering: a live race opens the panel, a running one the race screen.
  const key = race === undefined ? null : race ? `${race.id}:${race.status}` : 'none'
  if (key !== null && key !== seen) {
    setSeen(key)
    if (race && PANEL_STATUSES.includes(race.status)) setShowAttract(false)
    if (race?.status === 'running') setScreenFor(race.id)
  }

  const players = useMemo(
    () => new Map<string, PlayerRow>((board?.players ?? []).map((p) => [p.id, p])),
    [board?.players],
  )
  const canCreate = kusks !== undefined

  const createRace = async () => {
    if (await control.create()) {
      setScreenFor(null)
      setTab('race')
    }
  }

  if (race && screenFor === race.id) {
    return (
      <RaceScreen
        key={race.id}
        race={race}
        players={players}
        control={control}
        canCreate={canCreate}
        onNext={() => void createRace()}
        onAttract={() => {
          setScreenFor(null)
          setShowAttract(true)
        }}
        onClose={() => {
          setScreenFor(null)
          setTab('race')
        }}
      />
    )
  }

  if (showAttract) {
    return (
      <Attract
        corner={
          <Button variant="ghost" className="opacity-50" onClick={() => setShowAttract(false)}>
            {GM_TABS.open}
          </Button>
        }
      />
    )
  }

  return (
    <div className="flex h-dvh flex-col">
      <ConnectionBadge status={connection} variant="banner" size="tv" />
      <header className="flex shrink-0 items-center gap-3 border-b border-white/10 bg-night-deep/80 px-5 py-3">
        <Logo size="md" className="mr-3" />
        <nav className="flex gap-2">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={tab === t}
              onClick={() => setTab(t)}
              className={cx(
                'min-h-14 rounded-xl px-5 font-display text-3xl font-extrabold uppercase',
                tab === t ? 'bg-plate text-night' : 'text-ink-dim active:bg-tote',
              )}
            >
              {GM_TABS[t]}
            </button>
          ))}
        </nav>
        <span className="flex-1" />
        <ConnectionBadge status={connection} size="md" />
        <Button variant="ghost" onClick={() => setShowAttract(true)}>
          {GM_TABS.toAttract}
        </Button>
        <Button variant="ghost" className="opacity-60" onClick={logout}>
          {GM_TABS.logout}
        </Button>
      </header>
      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {tab === 'race' && (
          <RaceTab race={race} players={players} control={control} canCreate={canCreate} onCreate={() => void createRace()} />
        )}
        {tab === 'bets' && <BetsTab race={race} players={players} />}
        {tab === 'players' && (
          <PlayersTab
            players={board?.players}
            onReset={() => {
              reloadPlayers()
              reloadRace()
            }}
          />
        )}
        {tab === 'kuskar' && <KuskarTab kusks={kusks} onChange={reloadKusks} />}
      </main>
    </div>
  )
}
