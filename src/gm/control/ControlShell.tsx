// The control phone. Phone-first: a slim header and a bottom tab bar, the same shape as the guest
// app, because this is now a device Simon holds rather than an iPad on a stand. It never takes over
// the screen for a race; the room watches /gm/display for that.
import { useMemo, useState } from 'react'
import { useActiveRace, useConnection, useKusks, useLeaderboard, usePurchases, useShopItems } from '../../lib/hooks'
import type { PlayerRow } from '../../lib/types'
import { GM_TABS } from '../../shared/content/gm'
import { Button, ConnectionBadge, cx, Logo } from '../../ui'
import { useGmAuth } from '../gmAuth'
import { useRaceControl } from '../useRaceControl'
import { BetsTab } from './BetsTab'
import { KuskarTab } from './KuskarTab'
import { PlayersTab } from './PlayersTab'
import { RaceTab } from './RaceTab'
import { ShopTab } from './ShopTab'

type Tab = 'race' | 'bets' | 'players' | 'shop' | 'kuskar'
const TABS: readonly Tab[] = ['race', 'bets', 'players', 'shop', 'kuskar']
const TAB_ICON: Record<Tab, string> = { race: '🏇', bets: '▤', players: '☻', shop: '◆', kuskar: '✎' }

export function ControlShell() {
  const { logout } = useGmAuth()
  const connection = useConnection()
  const { data: race, reload: reloadRace } = useActiveRace()
  const { data: kusks, reload: reloadKusks } = useKusks()
  const { data: board, reload: reloadPlayers } = useLeaderboard()
  const { data: shopItems } = useShopItems()
  const { data: purchases } = usePurchases()
  const control = useRaceControl(kusks, reloadRace)
  const [tab, setTab] = useState<Tab>('race')

  const players = useMemo(
    () => new Map<string, PlayerRow>((board?.players ?? []).map((p) => [p.id, p])),
    [board?.players],
  )
  const canCreate = kusks !== undefined

  const createRace = async () => {
    if (await control.create()) setTab('race')
  }

  return (
    <div className="flex h-dvh flex-col">
      <ConnectionBadge status={connection} variant="banner" />
      <header className="flex shrink-0 items-center gap-3 border-b border-white/10 bg-night-deep/80 px-4 py-2 pt-[calc(env(safe-area-inset-top)+0.5rem)]">
        <Logo size="sm" />
        <span className="flex-1" />
        <ConnectionBadge status={connection} size="md" />
        <Button variant="ghost" className="opacity-60" onClick={logout}>
          {GM_TABS.logout}
        </Button>
      </header>

      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain">
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
        {tab === 'shop' && <ShopTab items={shopItems} purchases={purchases} players={board?.players} />}
        {tab === 'kuskar' && <KuskarTab kusks={kusks} onChange={reloadKusks} />}
      </main>

      <nav className="grid shrink-0 grid-cols-5 border-t border-white/10 bg-night-deep pb-[env(safe-area-inset-bottom)]">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            aria-pressed={tab === t}
            onClick={() => setTab(t)}
            className={cx(
              'flex min-h-15 flex-col items-center justify-center gap-0.5 px-0.5 text-center font-display text-xs leading-tight font-extrabold tracking-wide uppercase',
              tab === t ? 'text-plate' : 'text-ink-dim active:text-ink',
            )}
          >
            <span aria-hidden className="text-lg leading-none">
              {TAB_ICON[t]}
            </span>
            {GM_TABS[t]}
          </button>
        ))}
      </nav>
    </div>
  )
}
