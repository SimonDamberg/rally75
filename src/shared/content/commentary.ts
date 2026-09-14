// Race commentary and inquiry copy. Ported verbatim from the prototype's step(), finishRace(),
// runInquiry() and showResult(). Without audio the commentary strip is the only narrator.
import type { Rng } from '../game/rng'
import { INQUIRY_ACCUSATIONS } from './race'

export interface NamedRunner {
  name: string
  jockey: string
}

export const COMMENTARY = {
  start: (raceNo: number) => `Och de är iväg i lopp ${raceNo}!`,
  galopp: (h: NamedRunner) => `${h.name} gör en galopp! Katastrof för ${h.jockey}!`,

  /** Fixed milestones. `order` is sorted leader first. */
  milestones: {
    12: (o: readonly NamedRunner[]) => `${o[0].name} tar ledningen, ${o[1].name} sitter i ryggen.`,
    26: (o: readonly NamedRunner[]) => `Halvvägs. ${o[0].name} leder och ${o[o.length - 1].name} är redan bortkörd.`,
    40: (o: readonly NamedRunner[]) => `${o[1].name} kommer på utsidan! ${o[0].jockey} försvarar sig.`,
    52: (o: readonly NamedRunner[]) => `Upploppet! ${o[0].name} och ${o[1].name} sida vid sida!`,
    60: () => `Hundra meter kvar och detta blir jämnt!`,
  } as Record<number, (o: readonly NamedRunner[]) => string>,
  /** Milestones shown in the hype (gold) style. */
  hypeMilestones: [52, 60] as readonly number[],

  leadChange: [
    (l: NamedRunner) => `${l.name} går förbi och tar över ledningen!`,
    (l: NamedRunner) => `${l.jockey} tar kommandot med ${l.name}!`,
    (l: NamedRunner, prev: NamedRunner) => `Ledningsbyte! ${l.name} tränger sig förbi ${prev.name}.`,
    (l: NamedRunner, prev: NamedRunner) => `${prev.name} släpper till, ${l.name} tar över.`,
  ] as readonly ((l: NamedRunner, prev: NamedRunner) => string)[],

  photo: `MÅLFOTO! Det går inte att se med blotta ögat!`,
  win: (h: NamedRunner, raceNo: number) => `${h.name} vinner lopp ${raceNo}!`,
} as const

export const INQUIRY_TITLE = 'Bandomarna utreder'

export function inquiryText(winner: NamedRunner, r: Rng): string {
  return `Videogranskning pågår. ${winner.jockey} misstänks ha ${r.pick(INQUIRY_ACCUSATIONS)}.`
}

export const disqualifiedLine = (h: NamedRunner) =>
  `${h.name} diskvalificerad efter utredning. Huset behåller insatserna. Beklagar.`
