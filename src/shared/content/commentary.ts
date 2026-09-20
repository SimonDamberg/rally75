// Race commentary and inquiry copy. The start, galopp, lead change, photo and inquiry lines are the
// prototype's; the storyline lines (per RaceScript) and the gag lines came with the scripted sim.
// Without audio the commentary strip is the only narrator.
import type { Rng } from '../game/rng'
import type { GagKind } from '../game/types'
import { INQUIRY_ACCUSATIONS } from './race'

export interface NamedRunner {
  name: string
  jockey: string
}

type Line = (h: NamedRunner) => string
type Pair = (a: NamedRunner, b: NamedRunner) => string

export const COMMENTARY = {
  start: (raceNo: number) => `Och de är iväg i lopp ${raceNo}!`,
  galopp: (h: NamedRunner) => `${h.name} gör en galopp! Katastrof för ${h.jockey}!`,

  /** Early, once the field has sorted itself out. `a` leads, `b` is second. */
  early: [
    (a, b) => `${a.name} tar ledningen, ${b.name} sitter i ryggen.`,
    (a, b) => `${a.jockey} kör ut ${a.name} i täten. ${b.name} hänger på.`,
    (a, b) => `${a.name} först ut ur första kurvan, ${b.name} tvåa.`,
  ] as readonly Pair[],
  /** Halfway. `a` leads, `b` is last. */
  halfway: [
    (a, b) => `Halvvägs. ${a.name} leder och ${b.name} är redan bortkörd.`,
    (a, b) => `Halva loppet kvar. ${a.name} i täten, ${b.name} sist och ser ut att fundera på livet.`,
  ] as readonly Pair[],
  /** Halfway, when the favourite is last. */
  favouriteLast: [
    (h) => `Favoriten ${h.name} ligger sist! Oroliga miner på läktaren.`,
    (h) => `Var är favoriten? ${h.name} ligger sist! Någon borde ringa ${h.jockey}.`,
  ] as readonly Line[],

  /** Mid-race line per storyline. `a` and `b` depend on the script (see sim.ts). */
  mid: {
    wire: [(a) => `${a.name} styr loppet som ett tåg.`, (a) => `${a.jockey} sitter still i sulkyn. ${a.name} sköter resten.`],
    comeback: [(a) => `Och ${a.name}? Långt bak i fältet. Det ser mörkt ut.`, (a) => `${a.jockey} ligger sist med ${a.name} och verkar njuta av utsikten.`],
    collapse: [(a) => `${a.name} drar ifrån! Är det redan över?`, (a) => `${a.name} leder med flera längder. ${a.jockey} vinkar nästan redan.`],
    duel: [(a, b) => `${a.name} och ${b.name} har börjat mäta varandra.`, (a, b) => `${a.jockey} och ${b.jockey} tittar på varandra. Det här är personligt.`],
    pack: [() => `Hela fältet i en klump! Ingen vill släppa!`, () => `Fyra hästar, en klunga. Domarna behöver glasögon.`],
  } as Record<string, readonly Pair[]>,
  /** The turn for home, per storyline. */
  turn: {
    wire: [(a, b) => `${b.name} försöker, men ${a.name} svarar!`, (a, b) => `${b.name} attackerar! ${a.jockey} har svar på allt.`],
    comeback: [(a) => `HÄR KOMMER ${a.name.toUpperCase()} FRÅN INGENSTANS!`, (a) => `${a.jockey} har hittat en extra växel! ${a.name} flyger!`],
    collapse: [(a) => `Men vad händer? ${a.name} börjar ta slut!`, (a) => `${a.name} har tagit slut! ${a.jockey} ser plötsligt väldigt ensam ut.`],
    duel: [(a, b) => `${a.name} och ${b.name} går ifrån resten!`, (a, b) => `Det är ${a.name} mot ${b.name} nu. Resten kan gå hem.`],
    pack: [() => `Sista kurvan och fortfarande alla på en rad!`, () => `Ingen släpper! Det här blir kaos på upploppet!`],
  } as Record<string, readonly Pair[]>,

  /** Stretch start. `a` leads, `b` second. */
  stretch: [
    (a, b) => `UPPLOPPET! ${a.name} och ${b.name} sida vid sida!`,
    (a, b) => `In på upploppet! ${a.name} leder, ${b.name} laddar!`,
  ] as readonly Pair[],
  /** The last hundred metres. `close` when the top two are within a nose. */
  final: (a: NamedRunner, b: NamedRunner, close: boolean) =>
    close ? `NOS MOT NOS! ${a.name.toUpperCase()} ELLER ${b.name.toUpperCase()}!` : `HUNDRA METER KVAR! ${a.name.toUpperCase()} ÄR NÄRA!`,

  /** Last 100 m, when the upplopp gag has taken the race off the horse that led into the stretch. */
  stalled: [
    (h, w) => `${h.name.toUpperCase()} STÅR STILL! ${w.name.toUpperCase()} GÅR FÖRBI!`,
    (h, w) => `DET ÄR SLUT FÖR ${h.name.toUpperCase()}! ${w.name.toUpperCase()} TAR ÖVER!`,
    (h, w) => `${h.jockey.toUpperCase()} TAPPAR ALLT PÅ UPPLOPPET! ${w.name.toUpperCase()} ÄR FÖRBI!`,
  ] as readonly Pair[],

  leadChange: [
    (l: NamedRunner) => `${l.name} går förbi och tar över ledningen!`,
    (l: NamedRunner) => `${l.jockey} tar kommandot med ${l.name}!`,
    (l: NamedRunner, prev: NamedRunner) => `Ledningsbyte! ${l.name} tränger sig förbi ${prev.name}.`,
    (l: NamedRunner, prev: NamedRunner) => `${prev.name} släpper till, ${l.name} tar över.`,
  ] as readonly ((l: NamedRunner, prev: NamedRunner) => string)[],

  photo: `MÅLFOTO! Det går inte att se med blotta ögat!`,
  win: (h: NamedRunner, raceNo: number) => `${h.name} vinner lopp ${raceNo}!`,
  skrall: (h: NamedRunner, raceNo: number) => `SKRÄLL! ${h.name} vinner lopp ${raceNo}! Ingen såg det komma.`,
} as const

/** What the commentator shouts when a gag starts. Galopp keeps its original line first. */
export const GAG_LINES: Record<Exclude<GagKind, 'kommitte'>, readonly Line[]> = {
  galopp: [COMMENTARY.galopp, (h) => `Galopp för ${h.name}! ${h.jockey} håller i sig för livet!`],
  backwards: [
    (h) => `${h.name} har vänt och springer åt fel håll! ${h.jockey} skriker!`,
    (h) => `FEL HÅLL! ${h.name} verkar vilja hem till stallet!`,
  ],
  selfie: [
    (h) => `Tar ${h.jockey} en selfie? ${h.jockey} tar en selfie.`,
    (h) => `${h.jockey} fotar sig själv i full fart. Det här hamnar på Instagram.`,
  ],
  turbo: [
    (h) => `TURBO! Någon har fyllt ${h.name} med energidryck!`,
    (h) => `${h.name} har hittat en turboknapp! Är det ens lagligt?`,
  ],
  nap: [
    (h) => `${h.name} har somnat mitt i loppet! ${h.jockey} försöker väcka den med en visselpipa.`,
    (h) => `Zzz. ${h.name} tar en tupplur. Det här var inte planen.`,
  ],
  banana: [
    (h) => `${h.name} halkar på ett bananskal! Vem slänger bananer på en travbana?`,
    (h) => `Bananskal! ${h.name} snurrar runt som en piruett!`,
  ],
  snabblan: [
    (h) => `${h.jockey} tar ett Snabblån mitt i loppet för att satsa på sig själv!`,
    (h) => `${h.jockey} swishar huset i full fart. Räntan är 400 procent.`,
  ],
  husvagn: [
    (h) => `En husvagn har rullat in på banan! ${h.name} får panik och drar!`,
    (h) => `HUSVAGNSPANIK! ${h.name} springer för livet med en Kabe i hälarna!`,
  ],
  serverkrasch: [
    (h) => `${h.name} har tappat uppkopplingen och laggar!`,
    (h) => `Serverkrasch! ${h.name} står still och väntar på en omstart.`,
  ],
  fatbyte: [
    (h) => `${h.jockey} har stannat för ett fatbyte. Baren först, loppet sen.`,
    (h) => `Fatbyte! ${h.jockey} byter fat i full sele. Kön till baren tackar.`,
  ],
  eckero: [
    (h) => `${h.jockey} har gjort en akutresa till Eckerölinjen! Tax free väntar.`,
    (h) => `${h.jockey} hoppar av för Eckerölinjen. Båten går om fem minuter.`,
  ],
  rallyhafte: [
    (h) => `${h.jockey} glömde läsa rallyhäftet och vet inte vart loppet går!`,
    (h) => `${h.jockey} bläddrar i rallyhäftet mitt i loppet. Lite sent.`,
  ],
  hjalprebus: [
    (h) => `${h.jockey} öppnar hjälprebusen! Det kostar strafftid, men nu vet vi vart banan går.`,
    (h) => `${h.jockey} ger upp och river upp kuvertet med hjälprebusen. Pinsamt.`,
  ],
}

/** Kommitté-incest: two kuskar in adjacent lanes, so it takes a pair. */
export const KOMMITTE_LINES: readonly Pair[] = [
  (a, b) => `${a.jockey} och ${b.jockey} har börjat hångla mellan sulkyerna. Kommitté-incest!`,
  (a, b) => `Kommitté-incest på banan! ${a.jockey} och ${b.jockey} glömmer bort loppet.`,
]

/**
 * Finish line when the winner had a gag on the way. Only a light gag, a galopp or a boost can
 * reach the winner now, so the hard gags have no line here.
 */
export const GAG_WIN: Partial<Record<GagKind, (h: NamedRunner) => string>> = {
  galopp: (h) => `${h.name} galopperade och vann ändå!`,
  selfie: (h) => `${h.jockey} tog en selfie och vann ändå! Bilden säljs i Butiken.`,
  turbo: (h) => `${h.name} vinner på ren turbo! Dopingprov bokat.`,
  husvagn: (h) => `${h.name} sprang ifrån husvagnen och vann loppet!`,
  banana: (h) => `${h.name} halkade på en banan och vann ändå!`,
  snabblan: (h) => `${h.jockey} vinner och kan betala tillbaka Snabblånet. Nästan.`,
  rallyhafte: (h) => `${h.jockey} läste aldrig rallyhäftet och vann ändå!`,
  hjalprebus: (h) => `${h.jockey} behövde en hjälprebus och vann ändå!`,
}

/** Finish line when the upplopp gag stopped the horse in front and handed the race over. */
export const STRETCH_ROBBED: readonly Pair[] = [
  (w, h) => `${w.name} vinner sedan ${h.name} stannat på upploppet!`,
  (w, h) => `${w.name} tar hem det! ${h.jockey} får förklara upploppet för kommittén.`,
]

export const INQUIRY_TITLE = 'Bandomarna utreder'

export function inquiryText(winner: NamedRunner, r: Rng): string {
  return `Videogranskning pågår. ${winner.jockey} misstänks ha ${r.pick(INQUIRY_ACCUSATIONS)}.`
}

export const disqualifiedLine = (h: NamedRunner) =>
  `${h.name} diskvalificerad efter utredning. Huset behåller insatserna. Beklagar.`
