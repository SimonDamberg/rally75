// Placeholder for the game master app (Stage 4). Shows the attract screen; the corner button
// generates a test field to prove the shared game logic and the design system run in the browser.
import { useState } from 'react'
import { createRng, randomSeed } from '../shared/game/rng'
import { buildRaceCard } from '../shared/game/field'
import { computeOdds } from '../shared/game/odds'
import { NAMED_KUSKAR } from '../shared/content/kuskar'
import { ATTRACT } from '../shared/content/ui'
import type { RaceCard } from '../shared/game/types'
import { Button, HorseRow, Logo } from '../ui'
import { Attract } from './Attract'

const newCard = () => buildRaceCard(NAMED_KUSKAR, createRng(randomSeed()))

export default function GmApp() {
  const [card, setCard] = useState<RaceCard | null>(null)

  if (!card) {
    return (
      <Attract
        corner={
          <Button variant="ghost" className="opacity-40" onClick={() => setCard(newCard())}>
            {ATTRACT.testField}
          </Button>
        }
      />
    )
  }

  const odds = computeOdds(card.horses, [])
  return (
    <main className="min-h-dvh p-8">
      <div className="mb-6 flex flex-wrap items-center gap-6">
        <Logo size="lg" />
        <span className="font-display text-tv-sm font-black text-ink-dim uppercase">Spelledare</span>
        <span className="flex-1" />
        <Button variant="ghost" size="lg" onClick={() => setCard(null)}>
          {ATTRACT.back}
        </Button>
        <Button size="lg" onClick={() => setCard(newCard())}>
          Generera testfält
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {card.horses.map((h, i) => (
          <HorseRow key={h.n} horse={h} odds={odds[i]} size="tv" />
        ))}
      </div>
    </main>
  )
}
