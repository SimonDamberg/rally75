// Placeholder for the game master app (Stage 4). Generates a test field to prove the
// shared game logic runs in the browser.
import { useState } from 'react'
import { createRng, randomSeed } from '../shared/game/rng'
import { buildRaceCard } from '../shared/game/field'
import { computeOdds } from '../shared/game/odds'
import { fmtOdds } from '../shared/game/format'
import { NAMED_KUSKAR } from '../shared/content/kuskar'
import type { RaceCard } from '../shared/game/types'

export default function GmApp() {
  const [card, setCard] = useState<RaceCard | null>(null)
  const odds = card ? computeOdds(card.horses, []) : []

  return (
    <main className="min-h-dvh bg-slate-950 p-8 text-white">
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <h1 className="text-4xl font-black">
          Rally<span className="text-yellow-300">75</span> Spelledare
        </h1>
        <button
          type="button"
          className="rounded-xl bg-yellow-300 px-6 py-3 text-xl font-bold text-slate-950"
          onClick={() => setCard(buildRaceCard(NAMED_KUSKAR, createRng(randomSeed())))}
        >
          Generera testfält
        </button>
      </div>
      {card && (
        <>
          <p className="mb-4 text-slate-400">
            {card.dist} • {card.cond}
          </p>
          <ul className="space-y-3">
            {card.horses.map((h, i) => (
              <li key={h.n} className="flex items-start gap-4 rounded-xl border-l-8 bg-slate-900 p-4" style={{ borderColor: h.silk.edge }}>
                <span className="grid size-12 shrink-0 place-items-center rounded-lg text-2xl font-black text-slate-950" style={{ background: h.silk.bg }}>
                  {h.n}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-2xl font-bold">{h.name}</div>
                  <div className="text-yellow-300">
                    Kusk: {h.jockey} ({h.title})
                  </div>
                  <div className="text-slate-400">{h.story}</div>
                  <div className="text-slate-500">{h.jnote}</div>
                  <div className="text-sm text-slate-500">
                    Form: {h.form} • {h.note} • {h.tip}
                  </div>
                </div>
                <span className="text-3xl font-black text-emerald-400 tabular-nums">{fmtOdds(odds[i])}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  )
}
