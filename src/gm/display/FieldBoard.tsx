// The whole field on the display iPad: the paddock line-up before betting opens, and the final
// odds once betting has closed. Compact rows, because four full cards do not fit at 820 px.
import type { BetRow, RaceRow } from '../../lib/types'
import { HorseRow } from '../../ui'
import { summarizeBook } from '../book'

export function FieldBoard({
  race,
  bets,
  title,
  subtitle,
}: {
  race: RaceRow
  bets: readonly BetRow[] | undefined
  title: string
  subtitle: string
}) {
  const book = summarizeBook(race.field, bets ?? [])
  const closed = race.status === 'closed'

  return (
    <div className="flex min-h-0 min-w-0 flex-col gap-[1.5vh] overflow-hidden">
      <div className="flex flex-col">
        <h2 className="font-display text-[min(2.5rem,3.6vw)] leading-none font-black tracking-wide text-plate uppercase">{title}</h2>
        <p className="text-[min(1.5rem,2.2vw)] font-semibold text-ink-dim">{subtitle}</p>
      </div>
      <ul className="flex min-h-0 flex-col gap-[1.2vh] overflow-hidden">
        {race.field.map((h, i) => (
          <li key={h.n}>
            <HorseRow
              horse={h}
              odds={book.horses[i].odds}
              pool={closed ? book.horses[i].pool : undefined}
              variant="pick"
              size="tv"
            />
          </li>
        ))}
      </ul>
    </div>
  )
}
