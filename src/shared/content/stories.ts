// Backstory and kusk-note templates. Strings ported verbatim from the prototype;
// randomness now comes from the passed Rng instead of Math.random.
import type { Rng } from '../game/rng'
import { fmtInt } from '../game/format'
import { ORTER } from './names'

export const YRKEN = ["tandläkare","kommunekonom","rörmokare","gymnasielärare","bilhandlare","hovslagare","frisör","polis","hemslöjdskonsulent","begravningsentreprenör","IT-konsult","fastighetsmäklare","veterinär","bagare","lantmätare","brandman"] as const

export const HANDELSER = ["förlorade ett vad","aldrig fick förklara varför","hade druckit sedan lunch","just blivit lämnad","missförstod annonsen","ville imponera på sin svärmor","trodde det var en ponny","precis vunnit på trisslott","var på fel auktion","inte kunde säga nej"] as const

export const BEDRIFTER = ["vunnit tre lopp och tappat två skor","aldrig kommit i mål på rätt varv","blivit utvisad från två banor","fått en gata uppkallad efter sig i hemorten","vägrat springa i regn","slagit banrekordet baklänges","varit med i lokaltidningen fyra gånger","levt på rykten","sponsrats av en pizzeria som gått i konkurs","utvecklat en stark motvilja mot publik"] as const

export const OMSTANDIGHETER = ["ett strömavbrott","en midsommarfest som spårade ur","kraftig snöyra","en pågående grannfejd","oväntat besök av Skatteverket","ett solförmörkelse-firande","en bandyfinal","total tystnad"] as const

export const KRAV = ["det spelas musik","någon tittar på","banan är blöt","det är före klockan tolv","publiken klappar för tidigt","en annan häst nyser","det luktar korv"] as const

export const TIDIGARE = ["dressyrhäst","polishäst","statist i en reklamfilm","maskot åt ett byggföretag","turistattraktion","fotomodell för ett foderföretag","dragdjur på en julmarknad"] as const

export const CITAT = ["en katastrof som råkar vara snabb","tekniskt sett en häst","min enda vän","oberäknelig men ärlig","bättre än sitt rykte, tyvärr inte mycket","en investering jag helst inte diskuterar","full av potential och lite annat"] as const

/** Purchase price, e.g. "143 000". */
function pris(r: Rng): string {
  return fmtInt(Math.round(r.float(1, 320)) * 1000)
}

export type StoryTemplate = (h: string, k: string, r: Rng) => string

export const STORY_MALLAR: readonly StoryTemplate[] = [
  (h,_k,r)=>`${h} köptes för ${pris(r)} kronor av en ${r.pick(YRKEN)} från ${r.pick(ORTER)} som ${r.pick(HANDELSER)}. Har sedan dess ${r.pick(BEDRIFTER)}.`,
  (_h,_k,r)=>`Föddes i ${r.pick(ORTER)} under ${r.pick(OMSTANDIGHETER)}. Vägrar springa om ${r.pick(KRAV)}.`,
  (_h,k,r)=>`Var ${r.pick(TIDIGARE)} innan olyckan i ${r.pick(ORTER)}. ${k} beskriver hästen som "${r.pick(CITAT)}".`,
  (_h,_k,r)=>`Såldes tre gånger på ett halvår. Nuvarande ägare, en ${r.pick(YRKEN)}, ${r.pick(HANDELSER)} och ångrar sig fortfarande.`,
  (h,_k,r)=>`Tränas numera i en hage utanför ${r.pick(ORTER)} eftersom ${h} ${r.pick(BEDRIFTER)}. Springer bara om ${r.pick(KRAV)}.`,
  (_h,_k,r)=>`Har ett förflutet som ${r.pick(TIDIGARE)}. Kom till travet efter ${r.pick(OMSTANDIGHETER)} och har aldrig riktigt förklarat sig.`,
  (_h,k,r)=>`${k} tog över efter att förra kusken ${r.pick(HANDELSER)}. Hästen kostade ${pris(r)} kronor och har ${r.pick(BEDRIFTER)}.`,
  (_h,_k,r)=>`Beskrivs i stallet som "${r.pick(CITAT)}". Föddes i ${r.pick(ORTER)}, uppfostrades av en ${r.pick(YRKEN)}, litar på ingen.`,
  (_h,_k,r)=>`Kom sist i sitt första lopp och har byggt hela sin karriär på det. Vägrar springa om ${r.pick(KRAV)}.`,
  (h,k,r)=>`Lämnade ${r.pick(ORTER)} efter ${r.pick(OMSTANDIGHETER)}. ${k} hävdar att ${h} är "${r.pick(CITAT)}" och vägrar utveckla.`,
]

export type KuskNoteTemplate = (k: string, r: Rng) => string

/** Generic notes for random (non-named) kuskar. */
export const KUSK_NOTER: readonly KuskNoteTemplate[] = [
  (k,r)=>`${k} har inte vunnit sedan ${2015+r.int(9)} men talar gärna om det.`,
  k=>`${k} kör i lånad sulky och vill inte prata om varför.`,
  k=>`${k} lovade publiken seger redan i våras.`,
  k=>`${k} vägrar värma upp, vilket syns.`,
  k=>`${k} har bytt stall fyra gånger i år.`,
  k=>`${k} är enligt egen utsago "i sitt livs form".`,
  k=>`${k} kom till banan i taxi och verkar stressad.`,
  k=>`${k} har med sig hela familjen på läktaren. Det brukar sluta illa.`,
]
