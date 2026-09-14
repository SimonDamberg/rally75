// Placeholder for the game master app (Stage 4). Generates a test field to prove the
// shared game logic and the design system run in the browser.
import { useState } from 'react'
import { createRng, randomSeed } from '../shared/game/rng'
import { buildRaceCard } from '../shared/game/field'
import { computeOdds } from '../shared/game/odds'
import { NAMED_KUSKAR } from '../shared/content/kuskar'
import type { RaceCard } from '../shared/game/types'
import { Button, HorseRow, Logo } from '../ui'

export default function GmApp() {
  const [card, setCard] = useState<RaceCard | null>(null)
  const odds = card ? computeOdds(card.horses, []) : []

  return (
    <main className="min-h-dvh p-8">
      <div className="mb-6 flex flex-wrap items-center gap-6">
        <Logo size="lg" />
        <span className="font-display text-tv-sm font-black text-ink-dim uppercase">Spelledare</span>
        <span className="flex-1" />
        <Button size="lg" onClick={() => setCard(buildRaceCard(NAMED_KUSKAR, createRng(randomSeed())))}>
          Generera testfält
        </Button>
      </div>
      {card && (
        <div className="grid grid-cols-2 gap-4">
          {card.horses.map((h, i) => (
            <HorseRow key={h.n} horse={h} odds={odds[i]} size="tv" />
          ))}
        </div>
      )}
    </main>
  )
}
